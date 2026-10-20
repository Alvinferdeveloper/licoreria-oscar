import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'WHI-750-001' })
  @IsString({ message: 'El SKU es obligatorio' })
  @MaxLength(40, { message: 'El SKU no puede superar los 40 caracteres' })
  sku: string;

  @ApiProperty({ example: 'Whisky Etiqueta Negra 750ml' })
  @IsString({ message: 'El nombre es obligatorio' })
  @MaxLength(120, { message: 'El nombre no puede superar los 120 caracteres' })
  name: string;

  @ApiProperty({ description: 'ID de la categoría' })
  @IsUUID('all', { message: 'Seleccione una categoría válida' })
  categoryId: string;

  @ApiProperty({ example: 350.0, description: 'Precio de venta vigente' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El precio debe ser un número válido' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  unitPrice: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Tasa de impuesto en % (default: IVA global)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El impuesto debe ser un número válido' })
  @Min(0, { message: 'El impuesto no puede ser negativo' })
  @Max(100, { message: 'El impuesto no puede superar el 100%' })
  taxRate?: number;

  @ApiPropertyOptional({
    example: 33,
    description: 'Margen de ganancia en % (default: margen global)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El margen debe ser un número válido' })
  @Min(0, { message: 'El margen no puede ser negativo' })
  marginPercentage?: number;

  @ApiPropertyOptional({ example: 5, description: 'Stock mínimo para alertas' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El stock mínimo debe ser un número entero' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo' })
  minStock?: number;
}