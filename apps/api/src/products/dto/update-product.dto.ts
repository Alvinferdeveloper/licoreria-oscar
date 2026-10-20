import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description: 'Clave del objeto en el bucket, confirmada tras la subida',
  })
  @IsOptional()
  @IsString({ message: 'La clave de la imagen debe ser texto' })
  imageKey?: string | null;

  @ApiPropertyOptional({ description: 'Borrado lógico: desactiva sin eliminar el registro' })
  @IsOptional()
  @IsBoolean({ message: 'El estado debe ser verdadero o falso' })
  isActive?: boolean;
}
