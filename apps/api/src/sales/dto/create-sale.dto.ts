import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaleDetailDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsUUID('all', { message: 'Seleccione un producto válido' })
  productId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;
}

export class CreateSaleDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsUUID('all', { message: 'Seleccione un cliente válido' })
  customerId: string;

  @ApiProperty({ type: [SaleDetailDto], minItems: 1 })
  @IsArray({ message: 'Debe ingresar al menos un producto' })
  @ArrayMinSize(1, { message: 'Debe ingresar al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => SaleDetailDto)
  details: SaleDetailDto[];
}