import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [categories, total] = await this.prisma.$transaction([
      this.prisma.category.findMany({
        include: { _count: { select: { products: true } } },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.category.count(),
    ]);
    return { data: categories, meta: { page, limit, total } };
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    await this.assertNameAvailable(dto.name);
    return this.prisma.category.create({ data: dto });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    if (dto.name) await this.assertNameAvailable(dto.name, id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  // Solo se permite eliminar si no tiene productos asociados;
  // si los tiene, la integridad histórica manda
  async remove(id: string) {
    const category = await this.findOne(id);
    if (category._count.products > 0) {
      throw new ConflictException(
        'No se puede eliminar una categoría con productos asociados',
      );
    }
    return this.prisma.category.delete({ where: { id } });
  }

  private async assertNameAvailable(name: string, excludeId?: string) {
    const existing = await this.prisma.category.findUnique({ where: { name } });
    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Ya existe una categoría con ese nombre');
    }
  }
}
