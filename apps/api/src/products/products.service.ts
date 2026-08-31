import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IVA_DEFAULT, MARGIN_DEFAULT } from '@licoreria/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

export interface ProductQuery {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  includeInactive?: boolean;
  lowStockOnly?: boolean;
}

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async findAll(query: ProductQuery) {
    const { page = 1, limit = 20, search, categoryId, includeInactive, lowStockOnly } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { sku: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      // Alerta de stock bajo: productos en o bajo su mínimo
      ...(lowStockOnly
        ? { currentStock: { lte: this.prisma.product.fields.minStock } }
        : {}),
    };

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    const data = await Promise.all(products.map((p) => this.withImageUrl(p)));
    return { data, meta: { page, limit, total } };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return this.withImageUrl(product);
  }

  async create(dto: CreateProductDto) {
    await this.assertSkuAvailable(dto.sku);
    await this.assertCategoryExists(dto.categoryId);

    const product = await this.prisma.product.create({
      data: {
        ...dto,
        taxRate: dto.taxRate ?? IVA_DEFAULT,
        marginPercentage: dto.marginPercentage ?? MARGIN_DEFAULT,
        minStock: dto.minStock ?? 0,
      },
      include: { category: { select: { id: true, name: true } } },
    });
    return this.withImageUrl(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const current = await this.findOne(id);
    if (dto.sku) await this.assertSkuAvailable(dto.sku, id);
    if (dto.categoryId) await this.assertCategoryExists(dto.categoryId);

    // Al reemplazar la imagen, el objeto anterior se borra del bucket
    if (
      dto.imageKey !== undefined &&
      current.imageKey &&
      dto.imageKey !== current.imageKey
    ) {
      await this.storage.removeObject(current.imageKey);
    }

    const product = await this.prisma.product.update({
      where: { id },
      data: dto,
      include: { category: { select: { id: true, name: true } } },
    });
    return this.withImageUrl(product);
  }

  // Borrado lógico: ventas/compras históricas siguen referenciando el producto
  async deactivate(id: string) {
    await this.findOne(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return product;
  }

  // Genera la clave determinística y la signed upload URL;
  // el binario sube directo del frontend al bucket, sin pasar por el API
  async createImageUploadUrl(productId: string, contentType: string) {
    await this.findOne(productId);
    const ext = contentType.split('/')[1];
    const imageKey = `products/${productId}/${randomUUID()}.${ext}`;
    const signed = await this.storage.createSignedUploadUrl(imageKey);
    return { imageKey, signedUrl: signed.signedUrl, token: signed.token };
  }

  // Nunca se expone imageKey crudo: se resuelve a una signed URL de lectura
  private async withImageUrl<T extends { imageKey: string | null }>(
    product: T,
  ): Promise<T & { imageUrl: string | null }> {
    const imageUrl = product.imageKey
      ? await this.storage.createSignedReadUrl(product.imageKey)
      : null;
    return { ...product, imageUrl };
  }

  private async assertSkuAvailable(sku: string, excludeId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { sku } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Ya existe un producto con ese SKU');
    }
  }

  private async assertCategoryExists(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new BadRequestException('La categoría no existe');
  }
}
