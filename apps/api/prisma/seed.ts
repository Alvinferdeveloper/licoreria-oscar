// Seed ampliado: crea roles, permisos, categorías, productos, proveedores,
// clientes, compras y ventas de ejemplo para que el dashboard y reportes
// tengan datos reales al iniciar la app. Idempotente: usa upsert en todos los casos.

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UserRole, PermissionCode } from '@licoreria/shared-types';

const prisma = new PrismaClient();

const BCRYPT_SALT_ROUNDS = 10;

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

  // 8. Compras históricas
  const supplierNames = Array.from(supplierIds.keys());
  const purchaseDates = ['2026-08-01', '2026-08-05', '2026-08-10', '2026-08-15', '2026-08-20'];
  const purchaseProductKeys = ['WHI-001', 'RÓN-001', 'VOD-001', 'CER-001', 'VIN-001'];
  const userIds = await prisma.user.findMany({ select: { id: true } });
  const adminUserId = userIds.find(u => u.id)?.id ?? '';

  for (let i = 0; i < 5; i++) {
    const supplierName = supplierNames[i % supplierNames.length];
    const supplierId = supplierIds.get(supplierName)!;
    const prodSku = purchaseProductKeys[i % purchaseProductKeys.length];
    const productId = productIds.get(prodSku)!;
    const product = await prisma.product.findUniqueOrThrow({ where: { sku: prodSku } });
    const qty = 10 + i * 5;
    const unitCost = product.currentCost.toNumber();

    await prisma.purchase.create({
      data: {
        supplierId,
        userId: adminUserId,
        purchaseDate: new Date(purchaseDates[i]),
        total: unitCost * qty,
        status: 'REGISTERED',
        details: {
          create: {
            productId,
            quantity: qty,
            unitCost,
            subtotal: unitCost * qty,
          },
        },
      },
    });
  }
  console.log(`✔ 5 compras históricas`);

  // 9. Ventas históricas (con numeración secuencial)
  const customerNames = Array.from(customerIds.keys());
  const saleDates = ['2026-08-03', '2026-08-07', '2026-08-12', '2026-08-16', '2026-08-18', '2026-08-22', '2026-08-25', '2026-08-27', '2026-08-28', '2026-08-29'];
  const saleProductKeys = ['WHI-001', 'RÓN-002', 'VOD-002', 'CER-002', 'VIN-001', 'LIC-001', 'WHI-002', 'RÓN-001', 'VOD-001', 'CER-001'];
  const allUsers = await prisma.user.findMany({ select: { id: true, role: { select: { name: true } } } });
  const adminUser = allUsers.find(u => u.role.name === 'Administrador');
  const sellerUser = allUsers.find(u => u.role.name === 'Vendedor') ?? allUsers[0];

  for (let i = 0; i < 10; i++) {
    const customerName = customerNames[i % customerNames.length];
    const customerId = customerIds.get(customerName)!;
    const prodSku = saleProductKeys[i % saleProductKeys.length];
    const productId = productIds.get(prodSku)!;
    const product = await prisma.product.findUniqueOrThrow({ where: { sku: prodSku } });
    const qty = 1 + Math.floor(Math.random() * 4);
    const unitPrice = product.unitPrice.toNumber();
    const subtotal = unitPrice * qty;
    const taxTotal = subtotal * (product.taxRate.toNumber() / 100);
    const total = subtotal + taxTotal;
    const invoiceNumber = `F-${String(i + 1).padStart(8, '0')}`;

    const sellerId = i % 2 === 0 ? adminUser!.id : sellerUser.id;

    await prisma.sale.create({
      data: {
        invoiceNumber,
        customerId,
        userId: sellerId,
        saleDate: new Date(saleDates[i]),
        subtotal,
        taxTotal,
        total,
        status: 'ISSUED',
        details: {
          create: {
            productId,
            quantity: qty,
            unitPrice,
            subtotal,
          },
        },
      },
    });
  }
  console.log(`✔ 10 ventas históricas`);

  // 10. Movimientos de inventario para que el stock actual sea coherente
  // Las compras generan PURCHASE_IN, las ventas generan SALE_OUT
  // Ya que creamos productos con stock inicial, necesitamos movimientos que reflejen eso
  for (const prod of PRODUCTS) {
    const productId = productIds.get(prod.sku)!;
    // Movimiento de compra inicial
    await prisma.inventoryMovement.create({
      data: {
        productId,
        type: 'PURCHASE_IN',
        quantity: prod.stock,
        referenceType: 'PURCHASE',
        referenceId: 'seed',
        balanceAfter: prod.stock,
        userId: adminUserId,
      },
    });
  }
  console.log(`✔ Movimientos de inventario iniciales`);

  console.log('\n✔ Seed completo — datos de demo cargados correctamente');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
