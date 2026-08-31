import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { managuaDaysToUtcRange } from '../common/utils/managua-date';

export interface SalesReportQuery {
  startDate: string;
  endDate: string;
  userId?: string;
  categoryId?: string;
}

export interface PurchasesReportQuery {
  startDate: string;
  endDate: string;
  supplierId?: string;
}

export interface AuditReportQuery {
  page?: number;
  limit?: number;
  userId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
}

const SALE_REPORT_INCLUDE = {
  customer: { select: { id: true, name: true, documentId: true } },
  user: { select: { id: true, name: true } },
  details: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          taxRate: true,
          category: { select: { id: true, name: true } },
        },
      },
    },
  },
} as const;

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // Reporte parametrizado de ventas: rango de fechas (días de Managua),
  // vendedor y categoría. Sirve de dataset al maestro-detalle y al Excel.
  async salesReport(query: SalesReportQuery) {
    if (!query.startDate || !query.endDate) {
      throw new BadRequestException('startDate y endDate son requeridos');
    }

    const where: Prisma.SaleWhereInput = {
      saleDate: managuaDaysToUtcRange(query.startDate, query.endDate),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.categoryId
        ? { details: { some: { product: { categoryId: query.categoryId } } } }
        : {}),
    };

    const sales = await this.prisma.sale.findMany({
      where,
      include: SALE_REPORT_INCLUDE,
      orderBy: { saleDate: 'desc' },
    });

    // Totales solo sobre ventas emitidas (las anuladas no suman)
    const issued = sales.filter((s) => s.status === SaleStatus.ISSUED);
    const summary = {
      count: issued.length,
      voidedCount: sales.length - issued.length,
      subtotal: issued
        .reduce((acc, s) => acc.add(s.subtotal), new Prisma.Decimal(0))
        .toDecimalPlaces(2),
      taxTotal: issued
        .reduce((acc, s) => acc.add(s.taxTotal), new Prisma.Decimal(0))
        .toDecimalPlaces(2),
      total: issued
        .reduce((acc, s) => acc.add(s.total), new Prisma.Decimal(0))
        .toDecimalPlaces(2),
    };

    return { sales, summary };
  }

  // Reporte parametrizado de compras por proveedor y rango de fechas
  async purchasesReport(query: PurchasesReportQuery) {
    if (!query.startDate || !query.endDate) {
      throw new BadRequestException('startDate y endDate son requeridos');
    }

    const purchases = await this.prisma.purchase.findMany({
      where: {
        purchaseDate: managuaDaysToUtcRange(query.startDate, query.endDate),
        ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      },
      include: {
        supplier: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        details: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
      orderBy: { purchaseDate: 'desc' },
    });

    const active = purchases.filter((p) => p.status !== 'CANCELLED');
    const summary = {
      count: active.length,
      cancelledCount: purchases.length - active.length,
      total: active
        .reduce((acc, p) => acc.add(p.total), new Prisma.Decimal(0))
        .toDecimalPlaces(2),
    };

    return { purchases, summary };
  }

  // Inventario actual: stock, costo promedio, valor y alertas de mínimo
  async inventoryReport() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
    });

    const rows = products.map((p) => ({
      ...p,
      stockValue: p.currentCost.mul(p.currentStock).toDecimalPlaces(2),
      lowStock: p.currentStock <= p.minStock,
    }));

    const summary = {
      productCount: rows.length,
      lowStockCount: rows.filter((r) => r.lowStock).length,
      totalValue: rows
        .reduce((acc, r) => acc.add(r.stockValue), new Prisma.Decimal(0))
        .toDecimalPlaces(2),
    };

    return { products: rows, summary };
  }

  // Kardex completo de un producto (sin paginar) para exportación
  async kardexReport(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const movements = await this.prisma.inventoryMovement.findMany({
      where: { productId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return { product, movements };
  }

  // Auditoría: acciones críticas por usuario y fecha (solo Administrador)
  async auditReport(query: AuditReportQuery) {
    const { page = 1, limit = 20, userId, action, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {
      ...(userId ? { userId } : {}),
      ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
      ...(startDate && endDate
        ? { createdAt: managuaDaysToUtcRange(startDate, endDate) }
        : {}),
    };

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data: logs, meta: { page, limit, total } };
  }
}
