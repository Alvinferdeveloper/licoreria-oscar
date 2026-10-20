import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@licoreria.local' })
  @IsEmail({}, { message: 'Ingrese un email válido' })
  email: string;

  @ApiProperty({ example: 'Admin123*' })
  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;
}
