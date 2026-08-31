import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Rol no encontrado');
    return role;
  }

  findAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: { code: 'asc' } });
  }

  // Reemplaza el set completo de permisos del rol (asignar y revocar)
  async setPermissions(roleId: string, permissionIds: string[]) {
    await this.findOne(roleId);

    const valid = await this.prisma.permission.findMany({
      where: { id: { in: permissionIds } },
      select: { id: true },
    });
    if (valid.length !== permissionIds.length) {
      throw new NotFoundException('Uno o más permisos no existen');
    }

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
      }),
    ]);

    return this.findOne(roleId);
  }
}
