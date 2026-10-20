import {
  IsEmail,
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'María López' })
  @IsString({ message: 'El nombre es obligatorio' })
  @MaxLength(100, { message: 'El nombre no puede superar los 100 caracteres' })
  name: string;

  @ApiProperty({ example: 'maria@licoreria.local' })
  @IsEmail({}, { message: 'Ingrese un email válido' })
  email: string;

  @ApiProperty({ example: 'Segura123*', minLength: 8 })
  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @ApiProperty({ description: 'ID del rol a asignar' })
  @IsUUID('all', { message: 'Seleccione un rol válido' })
  roleId: string;
}