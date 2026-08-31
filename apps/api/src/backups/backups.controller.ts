import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { createReadStream } from 'fs';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@licoreria/shared-types';
import { BackupsService, UploadedDumpFile } from './backups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('backups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('backups')
export class BackupsController {
  constructor(private backups: BackupsService) {}

  @Post()
  @ApiOperation({
    summary: 'Generar un respaldo de la base de datos (pg_dump) y registrarlo',
  })
  create(@CurrentUser() user: JwtPayload) {
    return this.backups.create(user.sub).then((data) => ({ data }));
  }

  @Get()
  @ApiOperation({ summary: 'Listar respaldos registrados (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.backups.list(page, limit);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Descargar el archivo de un respaldo' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { path, filename } = await this.backups.filePath(id);
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    createReadStream(path).pipe(res);
  }

  @Post('restore')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 512 * 1024 * 1024 } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @ApiOperation({
    summary:
      'Restaurar la base de datos desde un archivo de respaldo (pg_restore). Operación destructiva',
  })
  restore(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file?: UploadedDumpFile,
  ) {
    return this.backups.restore(user.sub, file).then((data) => ({ data }));
  }
}
