import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
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
import { PurchasesService } from './purchases.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('purchases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private purchases: PurchasesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CONSULTA)
  @ApiOperation({ summary: 'Listar compras (paginado, filtros por proveedor y fechas)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'supplierId', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'YYYY-MM-DD (día de Managua)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'YYYY-MM-DD (día de Managua)' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('supplierId') supplierId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.purchases.findAll({ page, limit, supplierId, startDate, endDate });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CONSULTA)
  @ApiOperation({ summary: 'Obtener una compra con su detalle' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.purchases.findOne(id).then((data) => ({ data }));
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Registrar compra: actualiza stock (Kardex), recalcula costo promedio y sugiere precios',
  })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePurchaseDto) {
    return this.purchases.create(user.sub, dto).then((data) => ({ data }));
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Cancelar compra: revierte el stock con movimientos de ajuste',
  })
  cancel(@CurrentUser() user: JwtPayload, @Param('id', ParseUUIDPipe) id: string) {
    return this.purchases.cancel(user.sub, id).then((data) => ({ data }));
  }
}
