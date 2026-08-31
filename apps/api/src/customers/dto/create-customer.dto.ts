import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ example: '001-123456-0001A', description: 'RUC o cédula' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  documentId?: string;

  @ApiPropertyOptional({ example: '8777-4321' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'juan@correo.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Managua, Nicaragua' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
