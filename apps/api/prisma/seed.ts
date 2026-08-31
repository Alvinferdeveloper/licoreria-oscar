// Seed inicial: crea roles, permisos, asignaciones rol-permiso y el
// usuario administrador. Idempotente: usa upsert en todos los casos.

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserRole, PermissionCode } from '@licoreria/shared-types';

const prisma = new PrismaClient();

const BCRYPT_SALT_ROUNDS = 10;

// Asignación de permisos por rol según las reglas de negocio
const ROLE_PERMISSIONS: Record<UserRole, PermissionCode[]> = {
  [UserRole.ADMIN]: Object.values(PermissionCode),
  [UserRole.VENDEDOR]: [
    PermissionCode.DASHBOARD_VIEW,
    PermissionCode.PRODUCTS_VIEW,
    PermissionCode.CATEGORIES_VIEW,
    PermissionCode.SUPPLIERS_VIEW,
    PermissionCode.CUSTOMERS_VIEW,
    PermissionCode.CUSTOMERS_MANAGE,
    PermissionCode.SALES_VIEW,
    PermissionCode.SALES_CREATE,
    PermissionCode.INVENTORY_VIEW,
    PermissionCode.REPORTS_VIEW,
  ],
  [UserRole.CONSULTA]: [
    PermissionCode.DASHBOARD_VIEW,
    PermissionCode.PRODUCTS_VIEW,
    PermissionCode.CATEGORIES_VIEW,
    PermissionCode.SUPPLIERS_VIEW,
    PermissionCode.CUSTOMERS_VIEW,
    PermissionCode.PURCHASES_VIEW,
    PermissionCode.SALES_VIEW,
    PermissionCode.INVENTORY_VIEW,
    PermissionCode.REPORTS_VIEW,
  ],
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Acceso total: usuarios, roles, permisos, backups y todas las operaciones del negocio',
  [UserRole.VENDEDOR]: 'Opera el día a día: registra ventas, consulta productos, clientes y stock',
  [UserRole.CONSULTA]: 'Solo lectura: dashboard, reportes y catálogos',
};

async function main() {
  // 1. Permisos
  const permissionIds = new Map<PermissionCode, string>();
  for (const code of Object.values(PermissionCode)) {
    const permission = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code },
    });
    permissionIds.set(code, permission.id);
  }
  console.log(`✔ ${permissionIds.size} permisos`);

  // 2. Roles + asignaciones
  for (const roleName of Object.values(UserRole)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: { description: ROLE_DESCRIPTIONS[roleName] },
      create: { name: roleName, description: ROLE_DESCRIPTIONS[roleName] },
    });

    for (const code of ROLE_PERMISSIONS[roleName]) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permissionIds.get(code)!,
          },
        },
        update: {},
        create: { roleId: role.id, permissionId: permissionIds.get(code)! },
      });
    }
    console.log(`✔ Rol ${roleName} con ${ROLE_PERMISSIONS[roleName].length} permisos`);
  }

  // 3. Usuario administrador inicial
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@licoreria.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*';
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: UserRole.ADMIN },
  });

  const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_SALT_ROUNDS);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: 'Administrador',
      email: adminEmail,
      passwordHash,
      roleId: adminRole.id,
    },
  });
  console.log(`✔ Usuario admin: ${adminEmail}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
