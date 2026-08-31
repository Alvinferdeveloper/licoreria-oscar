import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementType, ReferenceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // Kardex: historial de movimientos de un producto, más reciente primero
  async kardex(productId: string, page = 1, limit = 20) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const skip = (page - 1) * limit;
    const [movements, total] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.findMany({
        where: { productId },
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.inventoryMovement.count({ where: { productId } }),
    ]);

    return { data: { product, movements }, meta: { page, limit, total } };
  }

  // Alertas de stock bajo: productos activos en o bajo su mínimo
  async lowStock() {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        currentStock: { lte: this.prisma.product.fields.minStock },
      },
      include: { category: { select: { id: true, name: true } } },
      orderBy: { currentStock: 'asc' },
    });
    return { data: products };
  }

  // Ajuste manual de inventario (solo Administrador). Todo cambio de
  // stock pasa por un movimiento; nunca se edita el stock directamente.
  async adjust(userId: string, dto: CreateAdjustmentDto) {
    if (dto.quantity === 0) {
      throw new BadRequestException('La cantidad no puede ser cero');
    }

    const movement = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: dto.productId },
      });
      if (!product) throw new NotFoundException('Producto no encontrado');

      const newStock = product.currentStock + dto.quantity;
      if (newStock < 0) {
        throw new ConflictException(
          `Stock insuficiente: actual ${product.currentStock}, ajuste ${dto.quantity}`,
        );
      }

      const created = await tx.inventoryMovement.create({
        data: {
          productId: dto.productId,
          type:
            dto.quantity > 0
              ? MovementType.ADJUSTMENT_IN
              : MovementType.ADJUSTMENT_OUT,
          quantity: Math.abs(dto.quantity),
          referenceType: ReferenceType.ADJUSTMENT,
          referenceId: product.id,
          balanceAfter: newStock,
          userId,
        },
      });

      await tx.product.update({
        where: { id: dto.productId },
        data: { currentStock: newStock },
      });

      return created;
    });

    await this.audit.log(userId, 'inventory.adjust', 'product', dto.productId, {
      quantity: dto.quantity,
      reason: dto.reason,
    });
    return movement;
  }
}
