import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetRolePermissionsDto {
  @ApiProperty({
    description: 'Set completo de IDs de permisos del rol (reemplaza el anterior)',
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  permissionIds: string[];
}
