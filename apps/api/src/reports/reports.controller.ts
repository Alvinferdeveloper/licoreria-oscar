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
import { MovementType, PurchaseStatus, SaleStatus } from '@prisma/client';
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

// Etiquetas legibles para las acciones de auditoría (evita jerga técnica en Excel)
const AUDIT_LABELS: Record<string, string> = {
  'sale.void': 'Venta anulada',
  'purchase.cancel': 'Compra cancelada',
  'inventory.adjust': 'Ajuste de inventario',
  BACKUP_CREATE: 'Respaldo creado',
  BACKUP_RESTORE: 'Respaldo restaurado',
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

  @Get('purchases/export')
  @Roles(...REPORT_ROLES)
  @ApiOperation({
    summary: 'Exportar reporte de compras a Excel (dataset aplanado por línea)',
  })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'supplierId', required: false, type: String })
  async purchasesExport(
    @Res() res: Response,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('supplierId') supplierId?: string,
  ) {
    const { purchases } = await this.reports.purchasesReport({
      startDate,
      endDate,
      supplierId,
    });

    const rows = purchases.flatMap((p) =>
      p.details.map((d) => ({
        fecha: formatManagua(p.purchaseDate),
        proveedor: p.supplier.name,
        registradoPor: p.user.name,
        producto: d.product.name,
        sku: d.product.sku,
        cantidad: d.quantity,
        costoUnitario: Number(d.unitCost),
        subtotalLinea: Number(d.subtotal),
        totalCompra: Number(p.total),
        estado: p.status === PurchaseStatus.CANCELLED ? 'Cancelada' : 'Registrada',
      })),
    );

    await this.excel.send(
      res,
      `compras-${startDate}-a-${endDate}`,
      'Compras',
      [
        { header: 'Fecha', key: 'fecha', width: 18 },
        { header: 'Proveedor', key: 'proveedor', width: 26 },
        { header: 'Registrado por', key: 'registradoPor', width: 22 },
        { header: 'Producto', key: 'producto', width: 30 },
        { header: 'SKU', key: 'sku', width: 14 },
        { header: 'Cantidad', key: 'cantidad', width: 10 },
        { header: 'Costo unit.', key: 'costoUnitario', width: 14 },
        { header: 'Subtotal línea', key: 'subtotalLinea', width: 16 },
        { header: 'Total compra', key: 'totalCompra', width: 14 },
        { header: 'Estado', key: 'estado', width: 12 },
      ],
      rows,
    );
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

  @Get('audit/export')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Exportar auditoría a Excel (solo Administrador)' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'action', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async auditExport(
    @Res() res: Response,
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Sin paginar: se traen todos los registros que cumplen el filtro
    const { data } = await this.reports.auditReport({
      page: 1,
      limit: 10000,
      userId,
      action,
      startDate,
      endDate,
    });

    const rows = data.map((log) => ({
      fecha: formatManagua(log.createdAt),
      usuario: log.user.name,
      email: log.user.email,
      accion: AUDIT_LABELS[log.action] ?? log.action,
      entidad: log.entity,
      detalle: log.metadata ? JSON.stringify(log.metadata) : '',
    }));

    await this.excel.send(
      res,
      'auditoria',
      'Auditoría',
      [
        { header: 'Fecha', key: 'fecha', width: 18 },
        { header: 'Usuario', key: 'usuario', width: 22 },
        { header: 'Email', key: 'email', width: 26 },
        { header: 'Acción', key: 'accion', width: 24 },
        { header: 'Entidad', key: 'entidad', width: 14 },
        { header: 'Detalle', key: 'detalle', width: 44 },
      ],
      rows,
    );
  }
}
