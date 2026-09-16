import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetRolePermissionsDto {
  @ApiProperty({
    description: 'Set completo de IDs de permisos del rol (reemplaza el anterior)',
    type: [String],
  })
  @IsArray({ message: 'Debe proporcionar una lista de permisos' })
  @ArrayNotEmpty({ message: 'Debe asignar al menos un permiso' })
  @IsUUID('4')
  permissionIds: string[];
}