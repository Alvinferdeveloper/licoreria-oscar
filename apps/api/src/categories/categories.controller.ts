import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private categories: CategoriesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CONSULTA)
  @ApiOperation({ summary: 'Listar categorías (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.categories.findAll(page, limit);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CONSULTA)
  @ApiOperation({ summary: 'Obtener una categoría' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.findOne(id).then((data) => ({ data }));
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear categoría (solo Administrador)' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto).then((data) => ({ data }));
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar categoría (solo Administrador)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(id, dto).then((data) => ({ data }));
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Eliminar categoría (solo si no tiene productos asociados)',
  })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.remove(id).then((data) => ({ data }));
  }
}
