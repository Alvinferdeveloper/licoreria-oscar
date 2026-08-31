import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_SALT_ROUNDS = 10;

// Nunca exponer password_hash en las respuestas de la API
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, name: true } },
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: USER_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count(),
    ]);
    return { data: users, meta: { page, limit, total } };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async create(dto: CreateUserDto) {
    await this.assertEmailAvailable(dto.email);
    await this.assertRoleExists(dto.roleId);

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        passwordHash,
        roleId: dto.roleId,
      },
      select: USER_SELECT,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    if (dto.email) await this.assertEmailAvailable(dto.email, id);
    if (dto.roleId) await this.assertRoleExists(dto.roleId);

    const { password, ...rest } = dto;
    const passwordHash = password
      ? await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
      : undefined;

    return this.prisma.user.update({
      where: { id },
      data: { ...rest, ...(passwordHash && { passwordHash }) },
      select: USER_SELECT,
    });
  }

  // Borrado lógico: preserva la integridad histórica de ventas/compras
  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: USER_SELECT,
    });
  }

  private async assertEmailAvailable(email: string, excludeId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }
  }

  private async assertRoleExists(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Rol no encontrado');
  }
}
