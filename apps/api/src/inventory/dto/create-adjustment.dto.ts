import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAdjustmentDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsUUID()
  productId: string;

  @ApiProperty({
    example: -2,
    description: 'Positivo = entrada por ajuste, negativo = salida por ajuste',
  })
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @IsNotEmpty({ message: 'La cantidad es obligatoria' })
  quantity: number;

  @ApiProperty({ example: 'Producto dañado en bodega' })
  @IsString({ message: 'El motivo es obligatorio' })
  @MaxLength(255, { message: 'El motivo no puede superar los 255 caracteres' })
  reason: string;
}