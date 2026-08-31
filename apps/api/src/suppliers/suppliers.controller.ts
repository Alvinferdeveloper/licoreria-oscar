import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@licoreria/shared-types';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliers: SuppliersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CONSULTA)
  @ApiOperation({ summary: 'Listar proveedores (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
  ) {
    return this.suppliers.findAll(page, limit, includeInactive);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CONSULTA)
  @ApiOperation({ summary: 'Obtener un proveedor' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.findOne(id).then((data) => ({ data }));
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear proveedor (solo Administrador)' })
  create(@Body() dto: CreateSupplierDto) {
    return this.suppliers.create(dto).then((data) => ({ data }));
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar proveedor (solo Administrador)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliers.update(id, dto).then((data) => ({ data }));
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar proveedor (borrado lógico)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.suppliers.deactivate(id).then((data) => ({ data }));
  }
}
