import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Distribuidora Nacional S.A.' })
  @IsString({ message: 'El nombre es obligatorio' })
  @MaxLength(120, { message: 'El nombre no puede superar los 120 caracteres' })
  name: string;

  @ApiPropertyOptional({ example: 'Carlos Pérez' })
  @IsOptional()
  @IsString({ message: 'El nombre de contacto debe ser texto' })
  @MaxLength(120, { message: 'El nombre de contacto no puede superar los 120 caracteres' })
  contactName?: string;

  @ApiPropertyOptional({ example: '8888-1234' })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @MaxLength(30, { message: 'El teléfono no puede superar los 30 caracteres' })
  phone?: string;

  @ApiPropertyOptional({ example: 'ventas@distribuidora.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Managua, Nicaragua' })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto' })
  @MaxLength(255, { message: 'La dirección no puede superar los 255 caracteres' })
  address?: string;
}