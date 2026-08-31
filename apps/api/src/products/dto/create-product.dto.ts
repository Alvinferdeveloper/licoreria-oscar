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
  @IsString()
  @MaxLength(40)
  sku: string;

  @ApiProperty({ example: 'Whisky Etiqueta Negra 750ml' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({ description: 'ID de la categoría' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 350.0, description: 'Precio de venta vigente' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({
    example: 15,
    description: 'Tasa de impuesto en % (default: IVA global)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxRate?: number;

  @ApiPropertyOptional({
    example: 33,
    description: 'Margen de ganancia en % (default: margen global)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  marginPercentage?: number;

  @ApiPropertyOptional({ example: 5, description: 'Stock mínimo para alertas' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minStock?: number;
}
