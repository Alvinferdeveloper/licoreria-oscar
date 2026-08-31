import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@licoreria/shared-types';
import { RolesService } from './roles.service';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('roles')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class RolesController {
  constructor(private roles: RolesService) {}

  @Get('roles')
  @ApiOperation({ summary: 'Listar roles con sus permisos' })
  findAll() {
    return this.roles.findAll().then((data) => ({ data }));
  }

  @Get('roles/:id')
  @ApiOperation({ summary: 'Obtener un rol con sus permisos' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.roles.findOne(id).then((data) => ({ data }));
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Listar todos los permisos disponibles' })
  findAllPermissions() {
    return this.roles.findAllPermissions().then((data) => ({ data }));
  }

  @Put('roles/:id/permissions')
  @ApiOperation({ summary: 'Reemplazar los permisos de un rol' })
  setPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    return this.roles
      .setPermissions(id, dto.permissionIds)
      .then((data) => ({ data }));
  }
}
