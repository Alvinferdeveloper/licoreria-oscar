import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString({ message: 'El nombre es obligatorio' })
  @MaxLength(120, { message: 'El nombre no puede superar los 120 caracteres' })
  name: string;

  @ApiPropertyOptional({ example: '001-123456-0001A', description: 'RUC o cédula' })
  @IsOptional()
  @IsString({ message: 'El documento debe ser texto' })
  @MaxLength(30, { message: 'El documento no puede superar los 30 caracteres' })
  documentId?: string;

  @ApiPropertyOptional({ example: '8777-4321' })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  @MaxLength(30, { message: 'El teléfono no puede superar los 30 caracteres' })
  phone?: string;

  @ApiPropertyOptional({ example: 'juan@correo.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Managua, Nicaragua' })
  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto' })
  @MaxLength(255, { message: 'La dirección no puede superar los 255 caracteres' })
  address?: string;
}