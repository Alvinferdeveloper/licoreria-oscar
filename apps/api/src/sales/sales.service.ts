import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MovementType, ReferenceType, SaleStatus } from '@prisma/client';
import { UserRole } from '@licoreria/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { managuaDaysToUtcRange } from '../common/utils/managua-date';

export interface SaleQuery {
  page?: number;
  limit?: number;
  customerId?: string;
  userId?: string;
  status?: SaleStatus;
  startDate?: string;
  endDate?: string;
}

const SALE_INCLUDE = {
  customer: { select: { id: true, name: true, documentId: true } },
  user: { select: { id: true, name: true } },
  details: {
    include: {
      product: { select: { id: true, name: true, sku: true, taxRate: true } },
    },
  },
} as const;

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // Vendedor solo ve sus propias ventas; Admin y Consulta ven todas.
  async findAll(query: SaleQuery, actor: { id: string; role: UserRole }) {
    const {
      page = 1,
      limit = 20,
      customerId,
      userId,
      status,
      startDate,
      endDate,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {
      ...(actor.role === UserRole.VENDEDOR
        ? { userId: actor.id }
        : userId
          ? { userId }
          : {}),
      ...(customerId ? { customerId } : {}),
      ...(status ? { status } : {}),
      ...(startDate && endDate
        ? { saleDate: managuaDaysToUtcRange(startDate, endDate) }
        : {}),
    };

    const [sales, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        include: SALE_INCLUDE,
        orderBy: { saleDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sale.count({ where }),
    ]);
    return { data: sales, meta: { page, limit, total } };
  }

  async findOne(id: string, actor: { id: string; role: UserRole }) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: SALE_INCLUDE,
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    if (actor.role === UserRole.VENDEDOR && sale.userId !== actor.id) {
      throw new ForbiddenException('Solo puede consultar sus propias ventas');
    }
    return sale;
  }

  // Registra la venta en una sola transacción: numeración atómica de
  // factura (secuencia de Postgres), detalles, descuento de stock con
  // guarda atómica, movimientos SALE_OUT y totales calculados en servidor.
  // El IVA se calcula sobre el subtotal de cada línea según su taxRate.
  async create(userId: string, dto: CreateSaleDto) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: dto.customerId },
      });
      if (!customer || !customer.isActive) {
        throw new BadRequestException('Cliente inválido o inactivo');
      }

      // Numeración secuencial y atómica (sin huecos intencionales);
      // el constraint unique de invoice_number es la red de seguridad final.
      await tx.$executeRaw`CREATE SEQUENCE IF NOT EXISTS invoice_number_seq`;
      const [{ nextval }] = await tx.$queryRaw<[{ nextval: bigint }]>`
        SELECT nextval('invoice_number_seq')
      `;
      const invoiceNumber = `F-${nextval.toString().padStart(8, '0')}`;

      let subtotal = new Prisma.Decimal(0);
      let taxTotal = new Prisma.Decimal(0);
      const lines: {
        productId: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        subtotal: Prisma.Decimal;
      }[] = [];

      for (const line of dto.details) {
        const product = await tx.product.findUnique({
          where: { id: line.productId },
        });
        if (!product || !product.isActive) {
          throw new BadRequestException(
            `Producto inválido o inactivo: ${line.productId}`,
          );
        }

        // Descuento atómico de stock: la guarda en el UPDATE evita
        // stock negativo por condición de carrera.
        const updated = await tx.$executeRaw`
          UPDATE products
          SET current_stock = current_stock - ${line.quantity}
          WHERE id = ${line.productId}::uuid
            AND current_stock >= ${line.quantity}
        `;
        if (updated === 0) {
          throw new ConflictException(
            `Stock insuficiente para "${product.name}" (disponible: ${product.currentStock})`,
          );
        }

        const unitPrice = product.unitPrice;
        const lineSubtotal = unitPrice.mul(line.quantity).toDecimalPlaces(2);
        const lineTax = lineSubtotal
          .mul(product.taxRate.div(100))
          .toDecimalPlaces(2);
        subtotal = subtotal.add(lineSubtotal);
        taxTotal = taxTotal.add(lineTax);

        lines.push({
          productId: product.id,
          quantity: line.quantity,
          unitPrice,
          subtotal: lineSubtotal,
        });
      }

      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: dto.customerId,
          userId,
          subtotal,
          taxTotal,
          total: subtotal.add(taxTotal),
          details: { create: lines },
        },
      });

      for (const line of lines) {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: line.productId },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: line.productId,
            type: MovementType.SALE_OUT,
            quantity: line.quantity,
            referenceType: ReferenceType.SALE,
            referenceId: sale.id,
            balanceAfter: product.currentStock,
            userId,
          },
        });
      }

      return tx.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: SALE_INCLUDE,
      });
    });
  }

  // Anulación: no se borra nada, se repone el stock con movimientos
  // VOID_REVERSAL y la factura queda en estado VOIDED.
  // Admin anula cualquier venta; Vendedor solo las propias.
  async void(userId: string, role: UserRole, saleId: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: saleId },
        include: { details: true },
      });
      if (!sale) throw new NotFoundException('Venta no encontrada');
      if (sale.status === SaleStatus.VOIDED) {
        throw new ConflictException('La venta ya está anulada');
      }
      if (role === UserRole.VENDEDOR && sale.userId !== userId) {
        throw new ForbiddenException(
          'Solo puede anular sus propias ventas',
        );
      }

      for (const detail of sale.details) {
        const updated = await tx.product.update({
          where: { id: detail.productId },
          data: { currentStock: { increment: detail.quantity } },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: detail.productId,
            type: MovementType.VOID_REVERSAL,
            quantity: detail.quantity,
            referenceType: ReferenceType.SALE,
            referenceId: sale.id,
            balanceAfter: updated.currentStock,
            userId,
          },
        });
      }

      return tx.sale.update({
        where: { id: saleId },
        data: { status: SaleStatus.VOIDED },
        include: SALE_INCLUDE,
      });
    });

    await this.audit.log(userId, 'sale.void', 'sale', saleId);
    return result;
  }
}
