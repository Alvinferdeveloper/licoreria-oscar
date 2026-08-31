import { Injectable } from '@nestjs/common';
import { Prisma, SaleStatus } from '@prisma/client';
import { formatInTimeZone } from 'date-fns-tz';
import { APP_TIMEZONE } from '@licoreria/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { managuaDaysToUtcRange } from '../common/utils/managua-date';

// "Hoy" y "este mes" se interpretan como días de Managua y se
// convierten a UTC antes de consultar (Nicaragua es UTC-6 fijo).
function managuaDay(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return formatInTimeZone(d, APP_TIMEZONE, 'yyyy-MM-dd');
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async summary(days: number) {
    const today = managuaDay();
    const monthStart = today.slice(0, 8) + '01';
    const rangeStart = managuaDay(-(days - 1));

    const [todayAgg, monthAgg, lowStockCount, rangeSales, inventoryRows] =
      await this.prisma.$transaction([
        // KPI: ventas del día (solo emitidas)
        this.prisma.sale.aggregate({
          where: {
            status: SaleStatus.ISSUED,
            saleDate: managuaDaysToUtcRange(today, today),
          },
          _sum: { total: true },
          _count: true,
        }),
        // KPI: facturado del mes en curso
        this.prisma.sale.aggregate({
          where: {
            status: SaleStatus.ISSUED,
            saleDate: managuaDaysToUtcRange(monthStart, today),
          },
          _sum: { total: true },
        }),
        // KPI: productos en o bajo su stock mínimo
        this.prisma.product.count({
          where: {
            isActive: true,
            currentStock: { lte: this.prisma.product.fields.minStock },
          },
        }),
        // Ventas del período con su detalle (para serie diaria y top productos)
        this.prisma.sale.findMany({
          where: {
            status: SaleStatus.ISSUED,
            saleDate: managuaDaysToUtcRange(rangeStart, today),
          },
          select: {
            saleDate: true,
            total: true,
            details: {
              select: {
                quantity: true,
                product: { select: { name: true } },
              },
            },
          },
        }),
        // Valor de inventario por categoría
        this.prisma.product.findMany({
          where: { isActive: true },
          select: {
            currentStock: true,
            currentCost: true,
            category: { select: { name: true } },
          },
        }),
      ]);

    // Serie diaria: un punto por día del período, aunque no haya ventas
    const byDay = new Map<string, { total: Prisma.Decimal; count: number }>();
    for (let i = 0; i < days; i++) {
      byDay.set(managuaDay(-(days - 1 - i)), {
        total: new Prisma.Decimal(0),
        count: 0,
      });
    }
    const topMap = new Map<string, number>();
    for (const sale of rangeSales) {
      const day = formatInTimeZone(sale.saleDate, APP_TIMEZONE, 'yyyy-MM-dd');
      const bucket = byDay.get(day);
      if (bucket) {
        bucket.total = bucket.total.add(sale.total);
        bucket.count += 1;
      }
      for (const d of sale.details) {
        topMap.set(
          d.product.name,
          (topMap.get(d.product.name) ?? 0) + d.quantity,
        );
      }
    }

    const categoryMap = new Map<string, Prisma.Decimal>();
    for (const p of inventoryRows) {
      const name = p.category?.name ?? 'Sin categoría';
      const value = p.currentCost.mul(p.currentStock);
      categoryMap.set(name, (categoryMap.get(name) ?? new Prisma.Decimal(0)).add(value));
    }

    return {
      kpis: {
        salesToday: (todayAgg._sum.total ?? new Prisma.Decimal(0)).toDecimalPlaces(2),
        salesTodayCount: todayAgg._count,
        monthTotal: (monthAgg._sum.total ?? new Prisma.Decimal(0)).toDecimalPlaces(2),
        lowStockCount,
      },
      salesByDay: [...byDay.entries()].map(([date, v]) => ({
        date,
        total: v.total.toDecimalPlaces(2),
        count: v.count,
      })),
      topProducts: [...topMap.entries()]
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5),
      inventoryByCategory: [...categoryMap.entries()].map(([name, v]) => ({
        name,
        value: v.toDecimalPlaces(2),
      })),
    };
  }
}
