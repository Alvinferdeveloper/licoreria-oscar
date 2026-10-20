import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PurchaseDetailDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsUUID('all', { message: 'Seleccione un producto válido' })
  productId: string;

  @ApiProperty({ example: 12, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;

  @ApiProperty({ example: 210.5, description: 'Costo unitario de compra' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'El costo debe ser un número válido' })
  @Min(0, { message: 'El costo no puede ser negativo' })
  unitCost: number;
}

export class CreatePurchaseDto {
  @ApiProperty({ description: 'ID del proveedor' })
  @IsUUID('all', { message: 'Seleccione un proveedor válido' })
  supplierId: string;

  @ApiProperty({ type: [PurchaseDetailDto], minItems: 1 })
  @IsArray({ message: 'Debe ingresar al menos un producto' })
  @ArrayMinSize(1, { message: 'Debe ingresar al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseDetailDto)
  details: PurchaseDetailDto[];
}