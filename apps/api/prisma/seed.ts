// Seed ampliado: crea roles, permisos, usuarios demo (Administrador/Vendedor/Consulta),
// categorías, productos, proveedores, clientes, compras, ventas y los movimientos de
// Kardex correspondientes, para que el dashboard y los reportes tengan datos reales al
// iniciar la app. Idempotente: usa upsert y evita duplicar transacciones.

import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserRole, PermissionCode } from '@licoreria/shared-types';

const prisma = new PrismaClient();

const BCRYPT_SALT_ROUNDS = 10;

// Usuarios demo para poder probar los 3 roles diferenciados.
// La contraseña es configurable por entorno; por defecto, una credencial de demo.
const DEMO_USERS = [
  {
    name: 'Vendedor Demo',
    email: 'vendedor@licoreria.local',
    password: process.env.SEED_VENDEDOR_PASSWORD ?? 'Vendedor123*',
    role: UserRole.VENDEDOR,
  },
  {
    name: 'Consulta Demo',
    email: 'consulta@licoreria.local',
    password: process.env.SEED_CONSULTA_PASSWORD ?? 'Consulta123*',
    role: UserRole.CONSULTA,
  },
];

// Fecha "hace N días" a una hora UTC fija, para que ventas y compras del seed
// caigan en días recientes y los KPIs del dashboard y los rangos por defecto de
// los reportes tengan datos que mostrar.
function daysAgo(days: number, hourUtc = 15): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hourUtc, 0, 0, 0);
  return d;
}

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

const CATEGORIES = [
  { name: 'Whisky', description: 'Whiskies escoceses, irlandeses y americanos' },
  { name: 'Rón', description: 'Rones premium y ultra premium' },
  { name: 'Vodka', description: 'Vodkas tradicionales y flavored' },
  { name: 'Cerveza', description: 'Cervezas nacionales e importadas' },
  { name: 'Vino', description: 'Vinos tintos, blancos y espumantes' },
  { name: 'Licores', description: 'Licores cremosos, frutas y digestivos' },
];

const PRODUCTS = [
  // Whisky
  { sku: 'WHI-001', name: 'Johnnie Walker Black Label', category: 'Whisky', cost: 35000, price: 55000, tax: 15, margin: 33, stock: 25, minStock: 5 },
  { sku: 'WHI-002', name: 'Jameson Irish Whiskey', category: 'Whisky', cost: 28000, price: 42000, tax: 15, margin: 33, stock: 30, minStock: 5 },
  { sku: 'WHI-003', name: 'Aberfeldy 12 Años', category: 'Whisky', cost: 65000, price: 98000, tax: 15, margin: 33, stock: 12, minStock: 3 },
  { sku: 'WHI-004', name: 'Macallan 12 Años Sherry', category: 'Whisky', cost: 120000, price: 180000, tax: 15, margin: 33, stock: 8, minStock: 2 },
  { sku: 'WHI-005', name: 'Glenfiddich 12 Años', category: 'Whisky', cost: 72000, price: 105000, tax: 15, margin: 33, stock: 18, minStock: 4 },
  // Rón
  { sku: 'RÓN-001', name: 'Havana Club 3 Años', category: 'Rón', cost: 18000, price: 28000, tax: 15, margin: 33, stock: 40, minStock: 10 },
  { sku: 'RÓN-002', name: 'Bacardi Superior', category: 'Rón', cost: 15000, price: 24000, tax: 15, margin: 33, stock: 50, minStock: 10 },
  { sku: 'RÓN-003', name: 'Captain Morgan Original', category: 'Rón', cost: 22000, price: 35000, tax: 15, margin: 33, stock: 35, minStock: 8 },
  { sku: 'RÓN-004', name: 'Diplomático Reserva Exclusiva', category: 'Rón', cost: 55000, price: 82000, tax: 15, margin: 33, stock: 15, minStock: 4 },
  // Vodka
  { sku: 'VOD-001', name: 'Absolut Original', category: 'Vodka', cost: 32000, price: 48000, tax: 15, margin: 33, stock: 28, minStock: 6 },
  { sku: 'VOD-002', name: 'Smirnoff Red Label', category: 'Vodka', cost: 20000, price: 32000, tax: 15, margin: 33, stock: 45, minStock: 10 },
  { sku: 'VOD-003', name: 'Grey Goose La Vienne', category: 'Vodka', cost: 68000, price: 95000, tax: 15, margin: 33, stock: 10, minStock: 3 },
  // Cerveza
  { sku: 'CER-001', name: 'Imperial Premium', category: 'Cerveza', cost: 8000, price: 14000, tax: 15, margin: 33, stock: 100, minStock: 20 },
  { sku: 'CER-002', name: 'Bavaria 4 Pack', category: 'Cerveza', cost: 9500, price: 16000, tax: 15, margin: 33, stock: 80, minStock: 15 },
  { sku: 'CER-003', name: 'Heineken 6 Pack', category: 'Cerveza', cost: 12000, price: 20000, tax: 15, margin: 33, stock: 60, minStock: 12 },
  // Vino
  { sku: 'VIN-001', name: 'Casa Silva Reserva Cabernet', category: 'Vino', cost: 45000, price: 68000, tax: 15, margin: 33, stock: 20, minStock: 5 },
  { sku: 'VIN-002', name: 'Concha y Toro Casillero Del Diablo', category: 'Vino', cost: 25000, price: 38000, tax: 15, margin: 33, stock: 30, minStock: 8 },
  // Licores
  { sku: 'LIC-001', name: 'Baileys Original', category: 'Licores', cost: 42000, price: 62000, tax: 15, margin: 33, stock: 15, minStock: 4 },
  { sku: 'LIC-002', name: 'Amaretto Disaronno', category: 'Licores', cost: 38000, price: 55000, tax: 15, margin: 33, stock: 12, minStock: 3 },
  { sku: 'LIC-003', name: 'Cointreau', category: 'Licores', cost: 55000, price: 82000, tax: 15, margin: 33, stock: 10, minStock: 3 },
];

const SUPPLIERS = [
  { name: 'Distribuidora Nacional S.A.', contactName: 'Carlos Pérez', phone: '8888-1234', email: 'ventas@distribuidora.com', address: 'Managua, Nicaragua' },
  { name: 'Importadora Premium Ltda.', contactName: 'María López', phone: '8699-5678', email: 'info@importadorapremium.com', address: 'Granada, Nicaragua' },
  { name: 'Bebidas del Pacífico', contactName: 'Juan Rodríguez', phone: '8322-9012', email: 'contacto@bebidaspac.com', address: 'San José, Costa Rica' },
  { name: 'Licorería Central', contactName: 'Ana Gómez', phone: '8777-3456', email: 'admin@licoreriacentral.com', address: 'León, Nicaragua' },
  { name: 'Vinos y Licores del Sur', contactName: 'Pedro Sánchez', phone: '8455-7890', email: 'ventas@vinosurs.com', address: 'San Juan del Sur, Nicaragua' },
];

const CUSTOMERS = [
  { name: 'Juan Pérez', documentId: '001-123456-0001A', phone: '8777-4321', email: 'juan@correo.com', address: 'Managua, Nicaragua' },
  { name: 'María López', documentId: '002-987654-0002B', phone: '8699-1122', email: 'maria@correo.com', address: 'Granada, Nicaragua' },
  { name: 'Carlos Rodríguez', documentId: '003-555555-0003C', phone: '8322-3344', email: 'carlos@correo.com', address: 'León, Nicaragua' },
  { name: 'Ana Martínez', documentId: '004-222222-0004D', phone: '8777-5566', email: 'ana@correo.com', address: 'Masaya, Nicaragua' },
  { name: 'Pedro Sánchez', documentId: '005-333333-0005E', phone: '8455-7788', email: 'pedro@correo.com', address: 'San Juan del Sur, Nicaragua' },
  { name: 'Laura García', documentId: '006-444444-0006F', phone: '8666-9900', email: 'laura@correo.com', address: 'Estelí, Nicaragua' },
  { name: 'Diego Hernández', documentId: '007-666666-0007G', phone: '8888-1122', email: 'diego@correo.com', address: 'Chinandega, Nicaragua' },
  { name: 'Sofía Ramírez', documentId: '008-777777-0008H', phone: '8777-3344', email: 'sofia@correo.com', address: 'Rivas, Nicaragua' },
  { name: 'Luis Castillo', documentId: '009-888888-0009I', phone: '8699-5566', email: 'luis@correo.com', address: 'Bluefields, Nicaragua' },
  { name: 'Fernando Cruz', documentId: '010-999999-0010J', phone: '8322-7788', email: 'fernando@correo.com', address: 'Boaco, Nicaragua' },
];

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
        where: { roleId_permissionId: { roleId: role.id, permissionId: permissionIds.get(code)! } },
        update: {},
        create: { roleId: role.id, permissionId: permissionIds.get(code)! },
      });
    }
    console.log(`✔ Rol ${roleName} con ${ROLE_PERMISSIONS[roleName].length} permisos`);
  }

  // 3. Usuario administrador inicial
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@licoreria.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123*';
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: UserRole.ADMIN } });
  const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_SALT_ROUNDS);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: 'Administrador', email: adminEmail, passwordHash, roleId: adminRole.id },
  });
  console.log(`✔ Usuario admin: ${adminEmail}`);

  // 3.1 Usuarios demo por rol (Vendedor y Consulta), para probar los 3 roles
  for (const demo of DEMO_USERS) {
    const role = await prisma.role.findUniqueOrThrow({
      where: { name: demo.role },
    });
    const demoHash = await bcrypt.hash(demo.password, BCRYPT_SALT_ROUNDS);
    await prisma.user.upsert({
      where: { email: demo.email },
      update: {},
      create: {
        name: demo.name,
        email: demo.email,
        passwordHash: demoHash,
        roleId: role.id,
      },
    });
    console.log(`✔ Usuario demo ${demo.role}: ${demo.email}`);
  }

  // 4. Categorías
  const categoryIds = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: { description: cat.description },
      create: { name: cat.name, description: cat.description },
    });
    categoryIds.set(cat.name, created.id);
  }
  console.log(`✔ ${CATEGORIES.length} categorías`);

  // 5. Productos
  const productIds = new Map<string, string>();
  for (const prod of PRODUCTS) {
    const catId = categoryIds.get(prod.category)!;
    const created = await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {},
      create: {
        sku: prod.sku,
        name: prod.name,
        categoryId: catId,
        currentCost: prod.cost,
        marginPercentage: prod.margin,
        unitPrice: prod.price,
        taxRate: prod.tax,
        currentStock: prod.stock,
        minStock: prod.minStock,
      },
    });
    productIds.set(prod.sku, created.id);
  }
  console.log(`✔ ${PRODUCTS.length} productos`);

  // 6. Proveedores
  const supplierIds = new Map<string, string>();
  for (const sup of SUPPLIERS) {
    const existing = await prisma.supplier.findFirst({ where: { name: sup.name } });
    let supplierId: string;
    if (existing) {
      supplierId = existing.id;
    } else {
      const created = await prisma.supplier.create({ data: { ...sup } });
      supplierId = created.id;
    }
    supplierIds.set(sup.name, supplierId);
  }
  console.log(`✔ ${SUPPLIERS.length} proveedores`);

  // 7. Clientes
  const customerIds = new Map<string, string>();
  for (const cus of CUSTOMERS) {
    const existing = await prisma.customer.findFirst({ where: { name: cus.name } });
    let customerId: string;
    if (existing) {
      customerId = existing.id;
    } else {
      const created = await prisma.customer.create({ data: { ...cus } });
      customerId = created.id;
    }
    customerIds.set(cus.name, customerId);
  }
  console.log(`✔ ${CUSTOMERS.length} clientes`);

  // 8. Transacciones de demo (compras, ventas y Kardex coherentes).
  // Solo se inyectan si la base aún no tiene movimientos de inventario, para que el
  // seed sea idempotente y no contamine una base que ya tiene datos reales.
  const adminUser = await prisma.user.findFirstOrThrow({
    where: { role: { name: UserRole.ADMIN } },
  });
  const adminUserId = adminUser.id;
  const sellerUser = await prisma.user.findFirst({
    where: { role: { name: UserRole.VENDEDOR } },
  });
  const saleUserId = sellerUser?.id ?? adminUserId;

  const demoLoaded = (await prisma.inventoryMovement.count()) > 0;

  // Saldo corriente por producto (arranca en el stock de apertura del catálogo)
  const balance = new Map<string, number>(PRODUCTS.map((p) => [p.sku, p.stock]));

  if (demoLoaded) {
    console.log(
      '↷ Seed de transacciones omitido (ya existen movimientos de inventario)',
    );
  } else {
    // 8.1 Movimiento de apertura por producto (carga inicial de inventario)
    for (const prod of PRODUCTS) {
      await prisma.inventoryMovement.create({
        data: {
          productId: productIds.get(prod.sku)!,
          type: 'PURCHASE_IN',
          quantity: prod.stock,
          referenceType: 'PURCHASE',
          referenceId: randomUUID(),
          balanceAfter: prod.stock,
          userId: adminUserId,
        },
      });
    }
    console.log(`✔ ${PRODUCTS.length} movimientos de apertura`);

    // 8.2 Compras recientes (entran al stock del Kardex)
    const supplierNames = Array.from(supplierIds.keys());
    const purchaseOffsets = [24, 19, 13, 8, 3];
    const purchaseSkus = ['WHI-001', 'RÓN-001', 'VOD-001', 'CER-001', 'VIN-001'];

    for (let i = 0; i < purchaseOffsets.length; i++) {
      const supplierId =
        supplierIds.get(supplierNames[i % supplierNames.length])!;
      const sku = purchaseSkus[i % purchaseSkus.length];
      const productId = productIds.get(sku)!;
      const product = await prisma.product.findUniqueOrThrow({ where: { sku } });
      const qty = 12 + i * 4;
      const unitCost = product.currentCost.toNumber();
      const subtotal = unitCost * qty;

      const purchase = await prisma.purchase.create({
        data: {
          supplierId,
          userId: adminUserId,
          purchaseDate: daysAgo(purchaseOffsets[i]),
          total: subtotal,
          status: 'REGISTERED',
          details: { create: { productId, quantity: qty, unitCost, subtotal } },
        },
      });

      const newBalance = (balance.get(sku) ?? 0) + qty;
      balance.set(sku, newBalance);
      await prisma.inventoryMovement.create({
        data: {
          productId,
          type: 'PURCHASE_IN',
          quantity: qty,
          referenceType: 'PURCHASE',
          referenceId: purchase.id,
          balanceAfter: newBalance,
          userId: adminUserId,
        },
      });
    }
    console.log(`✔ ${purchaseOffsets.length} compras históricas`);

    // 8.3 Ventas recientes (salen del stock del Kardex)
    const customerNames = Array.from(customerIds.keys());
    const saleOffsets = [0, 0, 1, 2, 3, 4, 6, 8, 11, 14, 17, 20];
    const saleSkus = [
      'WHI-001',
      'RÓN-002',
      'VOD-002',
      'CER-002',
      'VIN-001',
      'LIC-001',
      'WHI-002',
      'RÓN-001',
      'VOD-001',
      'CER-001',
      'LIC-002',
      'WHI-003',
    ];

    for (let i = 0; i < saleOffsets.length; i++) {
      const customerId =
        customerIds.get(customerNames[i % customerNames.length])!;
      const sku = saleSkus[i % saleSkus.length];
      const productId = productIds.get(sku)!;
      const product = await prisma.product.findUniqueOrThrow({ where: { sku } });
      const qty = (i % 3) + 1;
      const unitPrice = product.unitPrice.toNumber();
      const subtotal = unitPrice * qty;
      const taxTotal = subtotal * (product.taxRate.toNumber() / 100);
      const total = subtotal + taxTotal;
      const invoiceNumber = `F-${String(i + 1).padStart(8, '0')}`;
      const sellerId = i % 3 === 0 ? adminUserId : saleUserId;

      const sale = await prisma.sale.create({
        data: {
          invoiceNumber,
          customerId,
          userId: sellerId,
          saleDate: daysAgo(saleOffsets[i], 16),
          subtotal,
          taxTotal,
          total,
          status: 'ISSUED',
          details: { create: { productId, quantity: qty, unitPrice, subtotal } },
        },
      });

      const newBalance = (balance.get(sku) ?? 0) - qty;
      balance.set(sku, newBalance);
      await prisma.inventoryMovement.create({
        data: {
          productId,
          type: 'SALE_OUT',
          quantity: qty,
          referenceType: 'SALE',
          referenceId: sale.id,
          balanceAfter: newBalance,
          userId: sellerId,
        },
      });
    }
    console.log(`✔ ${saleOffsets.length} ventas históricas`);

    // 8.4 Sincroniza current_stock con el saldo del Kardex (fuente de verdad)
    for (const prod of PRODUCTS) {
      await prisma.product.update({
        where: { sku: prod.sku },
        data: { currentStock: balance.get(prod.sku) ?? prod.stock },
      });
    }
    console.log('✔ Stock sincronizado con el Kardex');
  }

  // 9. Sincroniza la secuencia de numeración de facturas con el mayor número ya
  // emitido (seed o ventas reales). Sin esto, la próxima venta real reutiliza un
  // número existente y el constraint unique la rechaza (HTTP 409).
  await prisma.$executeRawUnsafe(
    'CREATE SEQUENCE IF NOT EXISTS invoice_number_seq',
  );
  await prisma.$queryRawUnsafe(
    `SELECT setval(
       'invoice_number_seq',
       COALESCE((SELECT MAX(CAST(SUBSTRING(invoice_number FROM 3) AS BIGINT))
                 FROM sales WHERE invoice_number LIKE 'F-%'), 0) + 1,
       false
     )`,
  );
  console.log('✔ Secuencia de numeración de facturas sincronizada');

  console.log('\n✔ Seed completo — datos de demo cargados correctamente');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
