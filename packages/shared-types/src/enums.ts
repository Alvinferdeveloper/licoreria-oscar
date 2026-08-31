export enum UserRole {
  ADMIN = 'Administrador',
  VENDEDOR = 'Vendedor',
  CONSULTA = 'Consulta',
}

export enum SaleStatus {
  ISSUED = 'ISSUED',
  VOIDED = 'VOIDED',
}

export enum PurchaseStatus {
  REGISTERED = 'REGISTERED',
  CANCELLED = 'CANCELLED',
}

export enum MovementType {
  PURCHASE_IN = 'PURCHASE_IN',
  SALE_OUT = 'SALE_OUT',
  ADJUSTMENT_IN = 'ADJUSTMENT_IN',
  ADJUSTMENT_OUT = 'ADJUSTMENT_OUT',
  VOID_REVERSAL = 'VOID_REVERSAL',
}

export enum ReferenceType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum BackupType {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
}

export enum PermissionCode {
  PRODUCTS_VIEW = 'products.view',
  PRODUCTS_CREATE = 'products.create',
  PRODUCTS_UPDATE = 'products.update',
  PRODUCTS_DELETE = 'products.delete',
  CATEGORIES_VIEW = 'categories.view',
  CATEGORIES_MANAGE = 'categories.manage',
  SUPPLIERS_VIEW = 'suppliers.view',
  SUPPLIERS_MANAGE = 'suppliers.manage',
  CUSTOMERS_VIEW = 'customers.view',
  CUSTOMERS_MANAGE = 'customers.manage',
  PURCHASES_VIEW = 'purchases.view',
  PURCHASES_CREATE = 'purchases.create',
  SALES_VIEW = 'sales.view',
  SALES_CREATE = 'sales.create',
  SALES_VOID = 'sales.void',
  INVENTORY_VIEW = 'inventory.view',
  INVENTORY_ADJUST = 'inventory.adjust',
  REPORTS_VIEW = 'reports.view',
  REPORTS_EXPORT = 'reports.export',
  DASHBOARD_VIEW = 'dashboard.view',
  USERS_MANAGE = 'users.manage',
  ROLES_MANAGE = 'roles.manage',
  AUDIT_VIEW = 'audit.view',
  BACKUP_MANAGE = 'backup.manage',
}
