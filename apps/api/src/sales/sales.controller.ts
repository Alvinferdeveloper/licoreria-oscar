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
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { SaleStatus } from '@prisma/client';
import { APP_TIMEZONE, UserRole } from '@licoreria/shared-types';
import { SalesService, SaleQuery } from './sales.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('sales')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(
    private sales: SalesService,
    private invoicePdf: InvoicePdfService,
  ) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CONSULTA)
  @ApiOperation({
    summary:
      'Listar ventas (paginado; Vendedor solo ve las propias). Filtros: cliente, vendedor, estado, fechas',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: SaleStatus })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'YYYY-MM-DD (día de Managua)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'YYYY-MM-DD (día de Managua)' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('customerId') customerId?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: SaleStatus,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const query: SaleQuery = {
      page,
      limit,
      customerId,
      userId,
      status,
      startDate,
      endDate,
    };
    return this.sales.findAll(query, { id: user.sub, role: user.role });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CONSULTA)
  @ApiOperation({ summary: 'Obtener una venta con su detalle' })
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sales
      .findOne(id, { id: user.sub, role: user.role })
      .then((data) => ({ data }));
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  @ApiOperation({
    summary:
      'Registrar venta: valida stock (409 si insuficiente), calcula IVA en servidor y genera número de factura atómico',
  })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateSaleDto) {
    return this.sales.create(user.sub, dto).then((data) => ({ data }));
  }

  @Post(':id/void')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR)
  @ApiOperation({
    summary:
      'Anular venta: repone el stock con movimientos VOID_REVERSAL (Vendedor solo las propias)',
  })
  void(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.sales
      .void(user.sub, user.role, id)
      .then((data) => ({ data }));
  }

  @Get(':id/pdf')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CONSULTA)
  @ApiOperation({ summary: 'Descargar factura en PDF' })
  async pdf(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const sale = await this.sales.findOne(id, {
      id: user.sub,
      role: user.role,
    });
    // La fecha se presenta en hora de Managua, nunca en UTC crudo
    const saleDateLocal = new Intl.DateTimeFormat('es-NI', {
      timeZone: APP_TIMEZONE,
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(sale.saleDate);

    const doc = this.invoicePdf.createStream(sale, saleDateLocal);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="factura-${sale.invoiceNumber}.pdf"`,
    );
    doc.pipe(res);
    doc.end();
  }
}
