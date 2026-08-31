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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('customers')
export class CustomersController {
  constructor(private customers: CustomersService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CONSULTA)
  @ApiOperation({ summary: 'Listar clientes (paginado, búsqueda por nombre/documento)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive?: boolean,
  ) {
    return this.customers.findAll(page, limit, search, includeInactive);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CONSULTA)
  @ApiOperation({ summary: 'Obtener un cliente' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.findOne(id).then((data) => ({ data }));
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  @ApiOperation({ summary: 'Crear cliente' })
  create(@Body() dto: CreateCustomerDto) {
    return this.customers.create(dto).then((data) => ({ data }));
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(id, dto).then((data) => ({ data }));
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  @ApiOperation({ summary: 'Desactivar cliente (borrado lógico)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.customers.deactivate(id).then((data) => ({ data }));
  }
}
