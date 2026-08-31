import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@licoreria/shared-types';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('users')
@ApiBearerAuth()
// CRUD de usuarios: solo Administrador
@Roles(UserRole.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.users.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(id).then((data) => ({ data }));
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario' })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto).then((data) => ({ data }));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto).then((data) => ({ data }));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar usuario (borrado lógico)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.deactivate(id).then((data) => ({ data }));
  }
}
