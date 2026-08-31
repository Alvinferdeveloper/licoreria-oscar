import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MovementType, ReferenceType, PurchaseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { managuaDaysToUtcRange } from '../common/utils/managua-date';

export interface PurchaseQuery {
  page?: number;
  limit?: number;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
}

export interface SuggestedPrice {
  productId: string;
  productName: string;
  newCost: string;
  marginPercentage: string;
  suggestedPrice: string;
  currentUnitPrice: string;
}

const PURCHASE_INCLUDE = {
  supplier: { select: { id: true, name: true } },
  user: { select: { id: true, name: true } },
  details: {
    include: { product: { select: { id: true, name: true, sku: true } } },
  },
} as const;

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(query: PurchaseQuery) {
    const { page = 1, limit = 20, supplierId, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PurchaseWhereInput = {
      ...(supplierId ? { supplierId } : {}),
      ...(startDate && endDate
        ? { purchaseDate: managuaDaysToUtcRange(startDate, endDate) }
        : {}),
    };

    const [purchases, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        include: PURCHASE_INCLUDE,
        orderBy: { purchaseDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.purchase.count({ where }),
    ]);
    return { data: purchases, meta: { page, limit, total } };
  }

  async findOne(id: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id },
      include: PURCHASE_INCLUDE,
    });
    if (!purchase) throw new NotFoundException('Compra no encontrada');
    return purchase;
  }

  // Registra la compra y, en la misma transacción: detalles, movimientos
  // de Kardex, incremento de stock y recálculo del costo promedio ponderado.
  // Devuelve además el precio sugerido por producto (nunca se aplica solo).
  async create(userId: string, dto: CreatePurchaseDto) {
    return this.prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({
        where: { id: dto.supplierId },
      });
      if (!supplier || !supplier.isActive) {
        throw new BadRequestException('Proveedor inválido o inactivo');
      }

      const purchase = await tx.purchase.create({
        data: {
          supplierId: dto.supplierId,
          userId,
          total: 0,
        },
      });

      let total = new Prisma.Decimal(0);
      const suggestedPrices: SuggestedPrice[] = [];

      for (const line of dto.details) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
        });
        if (!product || !product.isActive) {
          throw new BadRequestException(
            `Producto inválido o inactivo: ${line.productId}`,
          );
        }

        const unitCost = new Prisma.Decimal(line.unitCost);
        const subtotal = unitCost.mul(line.quantity);
        total = total.add(subtotal);

        await tx.purchaseDetail.create({
          data: {
            purchaseId: purchase.id,
            productId: line.productId,
            quantity: line.quantity,
            unitCost,
            subtotal,
          },
        });

        // Costo Promedio Ponderado:
        // nuevo = (stock×costo + cantidad×costo_compra) / (stock + cantidad)
        const newStock = product.currentStock + line.quantity;
        const currentValue = product.currentCost.mul(product.currentStock);
        const newCost = currentValue
          .add(unitCost.mul(line.quantity))
          .div(newStock)
          .toDecimalPlaces(2);

        await tx.inventoryMovement.create({
          data: {
            productId: line.productId,
            type: MovementType.PURCHASE_IN,
            quantity: line.quantity,
            referenceType: ReferenceType.PURCHASE,
            referenceId: purchase.id,
            balanceAfter: newStock,
            userId,
          },
        });

        await tx.product.update({
          where: { id: line.productId },
          data: { currentStock: newStock, currentCost: newCost },
        });

        suggestedPrices.push({
          productId: product.id,
          productName: product.name,
          newCost: newCost.toString(),
          marginPercentage: product.marginPercentage.toString(),
          suggestedPrice: newCost
            .mul(product.marginPercentage.div(100).add(1))
            .toDecimalPlaces(2)
            .toString(),
          currentUnitPrice: product.unitPrice.toString(),
        });
      }

      const updated = await tx.purchase.update({
        where: { id: purchase.id },
        data: { total },
        include: PURCHASE_INCLUDE,
      });

      return { purchase: updated, suggestedPrices };
    });
  }

  // Cancelación: no se borra nada, se revierte el stock con movimientos
  // de ajuste de salida. Falla si el stock ya fue consumido por ventas.
  // El costo promedio no se recalcula hacia atrás (decisión documentada).
  async cancel(userId: string, purchaseId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: { details: true },
      });
      if (!purchase) throw new NotFoundException('Compra no encontrada');
      if (purchase.status === PurchaseStatus.CANCELLED) {
        throw new ConflictException('La compra ya está cancelada');
      }

      for (const detail of purchase.details) {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: detail.productId },
        });
        if (product.currentStock < detail.quantity) {
          throw new ConflictException(
            `No se puede cancelar: el stock de "${product.name}" ya fue consumido`,
          );
        }

        const newStock = product.currentStock - detail.quantity;
        await tx.inventoryMovement.create({
          data: {
            productId: detail.productId,
            type: MovementType.ADJUSTMENT_OUT,
            quantity: detail.quantity,
            referenceType: ReferenceType.PURCHASE,
            referenceId: purchase.id,
            balanceAfter: newStock,
            userId,
          },
        });
        await tx.product.update({
          where: { id: detail.productId },
          data: { currentStock: newStock },
        });
      }

      return tx.purchase.update({
        where: { id: purchaseId },
        data: { status: PurchaseStatus.CANCELLED },
        include: PURCHASE_INCLUDE,
      });
    });

    await this.audit.log(userId, 'purchase.cancel', 'purchase', purchaseId);
    return result;
  }
}
