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
  @IsInt()
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ example: 'Producto dañado en bodega' })
  @IsString()
  @MaxLength(255)
  reason: string;
}
