import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@licoreria/shared-types';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RequestUploadUrlDto } from './dto/request-upload-url.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

const READ_ROLES = [UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CONSULTA];

@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Get()
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Listar productos (paginado, filtros)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @ApiQuery({ name: 'lowStockOnly', required: false, type: Boolean })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive?: boolean,
    @Query('lowStockOnly', new DefaultValuePipe(false), ParseBoolPipe)
    lowStockOnly?: boolean,
  ) {
    return this.products.findAll({
      page,
      limit,
      search,
      categoryId,
      includeInactive,
      lowStockOnly,
    });
  }

  @Get(':id')
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Obtener un producto' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findOne(id).then((data) => ({ data }));
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear producto (solo Administrador)' })
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto).then((data) => ({ data }));
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar producto (solo Administrador)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(id, dto).then((data) => ({ data }));
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Desactivar producto (borrado lógico)' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.deactivate(id).then((data) => ({ data }));
  }

  @Post(':id/image/upload-url')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener signed URL para subir la imagen del producto',
  })
  requestUploadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestUploadUrlDto,
  ) {
    return this.products
      .createImageUploadUrl(id, dto.contentType)
      .then((data) => ({ data }));
  }
}
