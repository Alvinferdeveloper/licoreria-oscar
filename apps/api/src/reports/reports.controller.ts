import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
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
import { UserRole } from '@licoreria/shared-types';
import { MovementType, SaleStatus } from '@prisma/client';
import {
  ReportsService,
  SalesReportQuery,
  PurchasesReportQuery,
  AuditReportQuery,
} from './reports.service';
import { ExcelService, formatManagua } from './excel.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const REPORT_ROLES = [UserRole.ADMIN, UserRole.CONSULTA];

const MOVEMENT_LABELS: Record<MovementType, string> = {
  [MovementType.PURCHASE_IN]: 'Compra',
  [MovementType.SALE_OUT]: 'Venta',
  [MovementType.ADJUSTMENT_IN]: 'Ajuste entrada',
  [MovementType.ADJUSTMENT_OUT]: 'Ajuste salida',
  [MovementType.VOID_REVERSAL]: 'Reversión anulación',
};

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private reports: ReportsService,
    private excel: ExcelService,
  ) {}

  @Get('sales')
  @Roles(...REPORT_ROLES)
  @ApiOperation({
    summary:
      'Reporte de ventas por rango de fechas (días de Managua), con filtro por vendedor y categoría. Base del maestro-detalle',
  })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  salesReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const query: SalesReportQuery = { startDate, endDate, userId, categoryId };
    return this.reports.salesReport(query).then((data) => ({ data }));
  }

  @Get('sales/export')
  @Roles(...REPORT_ROLES)
  @ApiOperation({
    summary: 'Exportar reporte de ventas a Excel (dataset aplanado por línea)',
  })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  async salesExport(
    @Res() res: Response,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const { sales } = await this.reports.salesReport({
      startDate,
      endDate,
      userId,
      categoryId,
    });

    const rows = sales.flatMap((s) =>
      s.details.map((d) => ({
        factura: s.invoiceNumber,
        fecha: formatManagua(s.saleDate),
        cliente: s.customer.name,
        vendedor: s.user.name,
        producto: d.product.name,
        sku: d.product.sku,
        categoria: d.product.category?.name ?? '—',
        cantidad: d.quantity,
        precioUnitario: Number(d.unitPrice),
        subtotalLinea: Number(d.subtotal),
        ivaVenta: Number(s.taxTotal),
        totalVenta: Number(s.total),
        estado: s.status === SaleStatus.ISSUED ? 'Emitida' : 'Anulada',
      })),
    );

    await this.excel.send(
      res,
      `ventas-${startDate}-a-${endDate}`,
      'Ventas',
      [
        { header: 'Factura', key: 'factura', width: 14 },
        { header: 'Fecha', key: 'fecha', width: 18 },
        { header: 'Cliente', key: 'cliente', width: 26 },
        { header: 'Vendedor', key: 'vendedor', width: 22 },
        { header: 'Producto', key: 'producto', width: 30 },
        { header: 'SKU', key: 'sku', width: 14 },
        { header: 'Categoría', key: 'categoria', width: 18 },
        { header: 'Cantidad', key: 'cantidad', width: 10 },
        { header: 'Precio unit.', key: 'precioUnitario', width: 14 },
        { header: 'Subtotal línea', key: 'subtotalLinea', width: 16 },
        { header: 'IVA venta', key: 'ivaVenta', width: 14 },
        { header: 'Total venta', key: 'totalVenta', width: 14 },
        { header: 'Estado', key: 'estado', width: 10 },
      ],
      rows,
    );
  }

  @Get('purchases')
  @Roles(...REPORT_ROLES)
  @ApiOperation({
    summary: 'Reporte de compras por proveedor y rango de fechas (días de Managua)',
  })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'supplierId', required: false, type: String })
  purchasesReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('supplierId') supplierId?: string,
  ) {
    const query: PurchasesReportQuery = { startDate, endDate, supplierId };
    return this.reports.purchasesReport(query).then((data) => ({ data }));
  }

  @Get('inventory')
  @Roles(...REPORT_ROLES)
  @ApiOperation({
    summary: 'Reporte de inventario actual: stock, valor total y productos bajo mínimo',
  })
  inventoryReport() {
    return this.reports.inventoryReport().then((data) => ({ data }));
  }

  @Get('inventory/export')
  @Roles(...REPORT_ROLES)
  @ApiOperation({ summary: 'Exportar inventario actual a Excel' })
  async inventoryExport(@Res() res: Response) {
    const { products } = await this.reports.inventoryReport();

    const rows = products.map((p) => ({
      sku: p.sku,
      producto: p.name,
      categoria: p.category?.name ?? '—',
      stock: p.currentStock,
      minStock: p.minStock,
      costoPromedio: Number(p.currentCost),
      precioVenta: Number(p.unitPrice),
      valorInventario: Number(p.stockValue),
      alerta: p.lowStock ? 'STOCK BAJO' : '',
    }));

    await this.excel.send(
      res,
      'inventario-actual',
      'Inventario',
      [
        { header: 'SKU', key: 'sku', width: 14 },
        { header: 'Producto', key: 'producto', width: 30 },
        { header: 'Categoría', key: 'categoria', width: 18 },
        { header: 'Stock', key: 'stock', width: 10 },
        { header: 'Stock mín.', key: 'minStock', width: 10 },
        { header: 'Costo promedio', key: 'costoPromedio', width: 16 },
        { header: 'Precio venta', key: 'precioVenta', width: 14 },
        { header: 'Valor inventario', key: 'valorInventario', width: 18 },
        { header: 'Alerta', key: 'alerta', width: 14 },
      ],
      rows,
    );
  }

  @Get('kardex/:productId/export')
  @Roles(...REPORT_ROLES)
  @ApiOperation({ summary: 'Exportar Kardex completo de un producto a Excel' })
  async kardexExport(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Res() res: Response,
  ) {
    const { product, movements } = await this.reports.kardexReport(productId);

    const rows = movements.map((m) => ({
      fecha: formatManagua(m.createdAt),
      tipo: MOVEMENT_LABELS[m.type],
      cantidad: m.quantity,
      saldo: m.balanceAfter,
      usuario: m.user.name,
    }));

    await this.excel.send(
      res,
      `kardex-${product.sku}`,
      'Kardex',
      [
        { header: 'Fecha', key: 'fecha', width: 18 },
        { header: 'Tipo', key: 'tipo', width: 20 },
        { header: 'Cantidad', key: 'cantidad', width: 10 },
        { header: 'Saldo', key: 'saldo', width: 10 },
        { header: 'Usuario', key: 'usuario', width: 22 },
      ],
      rows,
    );
  }

  @Get('audit')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Reporte de auditoría: acciones críticas por usuario y fecha (solo Administrador)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  auditReport(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const query: AuditReportQuery = {
      page,
      limit,
      userId,
      action,
      startDate,
      endDate,
    };
    return this.reports.auditReport(query);
  }
}
