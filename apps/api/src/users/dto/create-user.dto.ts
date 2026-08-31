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
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'maria@licoreria.local' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Segura123*', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'ID del rol a asignar' })
  @IsUUID()
  roleId: string;
}
