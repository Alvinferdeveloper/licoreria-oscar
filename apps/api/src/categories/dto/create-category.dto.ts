import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Whisky' })
  @IsString({ message: 'El nombre es obligatorio' })
  @MaxLength(80, { message: 'El nombre no puede superar los 80 caracteres' })
  name: string;

  @ApiPropertyOptional({ example: 'Whiskies escoceses, irlandeses y americanos' })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(255, { message: 'La descripción no puede superar los 255 caracteres' })
  description?: string;
}
