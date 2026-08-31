import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, stat, unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { randomUUID } from 'crypto';
import { APP_TIMEZONE } from '@licoreria/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// Archivo subido por multipart (memory storage: el binario llega en buffer)
export interface UploadedDumpFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface PgConnection {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

// pg_dump/pg_restore -Fc escriben esta firma al inicio del archivo
const DUMP_MAGIC = 'PGDMP';

@Injectable()
export class BackupsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  private backupDir(): string {
    return resolve(this.config.get<string>('BACKUP_DIR') ?? 'backups');
  }

  // Credenciales desde DATABASE_URL; el password viaja por PGPASSWORD,
  // nunca como argumento de línea de comandos
  private connection(): PgConnection {
    const raw = this.config.get<string>('DATABASE_URL');
    let url: URL;
    try {
      url = new URL(raw ?? '');
    } catch {
      throw new ServiceUnavailableException(
        'DATABASE_URL no está configurada o es inválida',
      );
    }
    return {
      host: url.hostname,
      port: url.port || '5432',
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
    };
  }

  private run(bin: string, args: string[], conn: PgConnection): Promise<void> {
    return new Promise((resolvePromise, reject) => {
      execFile(
        bin,
        args,
        { env: { ...process.env, PGPASSWORD: conn.password } },
        (error, _stdout, stderr) => {
          if (error) {
            reject(new Error(stderr?.trim() || error.message));
          } else {
            resolvePromise();
          }
        },
      );
    });
  }

  private pgArgs(conn: PgConnection): string[] {
    return ['-h', conn.host, '-p', conn.port, '-U', conn.user, '-d', conn.database];
  }

  // Nombre de archivo con fecha/hora local de la app para que sea legible
  private dumpFilename(): string {
    const stamp = new Intl.DateTimeFormat('sv-SE', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .format(new Date())
      .replace(/[-:]/g, '')
      .replace(' ', '-');
    return `backup-${stamp}.dump`;
  }

  async create(userId: string) {
    const conn = this.connection();
    const dir = this.backupDir();
    await mkdir(dir, { recursive: true });

    const filename = this.dumpFilename();
    const filePath = join(dir, filename);

    try {
      await this.run('pg_dump', ['-Fc', ...this.pgArgs(conn), '-f', filePath], conn);
    } catch (error) {
      await unlink(filePath).catch(() => undefined);
      throw new InternalServerErrorException(
        `No se pudo generar el respaldo: ${(error as Error).message}`,
      );
    }

    const { size } = await stat(filePath);
    const backup = await this.prisma.backup.create({
      data: { filename, sizeBytes: BigInt(size), createdBy: userId },
      include: { creator: { select: { name: true } } },
    });

    await this.audit.log(userId, 'BACKUP_CREATE', 'backup', backup.id, {
      filename,
      sizeBytes: size,
    });

    return {
      id: backup.id,
      filename: backup.filename,
      sizeBytes: Number(backup.sizeBytes),
      createdAt: backup.createdAt,
      createdBy: backup.creator.name,
    };
  }

  async list(page: number, limit: number) {
    const [total, backups] = await this.prisma.$transaction([
      this.prisma.backup.count(),
      this.prisma.backup.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { creator: { select: { name: true } } },
      }),
    ]);

    return {
      data: backups.map((b) => ({
        id: b.id,
        filename: b.filename,
        sizeBytes: Number(b.sizeBytes),
        createdAt: b.createdAt,
        createdBy: b.creator.name,
        type: b.type,
      })),
      meta: { page, limit, total },
    };
  }

  async filePath(id: string): Promise<{ path: string; filename: string }> {
    const backup = await this.prisma.backup.findUnique({ where: { id } });
    if (!backup) throw new NotFoundException('Respaldo no encontrado');

    const path = join(this.backupDir(), backup.filename);
    if (!existsSync(path)) {
      throw new NotFoundException(
        'El archivo del respaldo ya no existe en el servidor',
      );
    }
    return { path, filename: backup.filename };
  }

  async restore(userId: string, file: UploadedDumpFile | undefined) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Debe adjuntar un archivo de respaldo');
    }
    if (file.buffer.subarray(0, 5).toString('latin1') !== DUMP_MAGIC) {
      throw new BadRequestException(
        'El archivo no es un respaldo válido de PostgreSQL',
      );
    }

    const conn = this.connection();
    const tempPath = join(tmpdir(), `restore-${randomUUID()}.dump`);

    try {
      await writeFile(tempPath, file.buffer);
      await this.run(
        'pg_restore',
        [
          '--clean',
          '--if-exists',
          '--no-owner',
          '--no-privileges',
          ...this.pgArgs(conn),
          tempPath,
        ],
        conn,
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `No se pudo restaurar el respaldo: ${(error as Error).message}`,
      );
    } finally {
      await unlink(tempPath).catch(() => undefined);
    }

    await this.audit.log(userId, 'BACKUP_RESTORE', 'backup', undefined, {
      originalName: file.originalname,
      sizeBytes: file.size,
    });

    return { restored: true };
  }
}
