// Traducción de las acciones de auditoría a lenguaje de negocio
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  'sale.void': 'Venta anulada',
  'purchase.cancel': 'Compra cancelada',
  'inventory.adjust': 'Ajuste de inventario',
  BACKUP_CREATE: 'Respaldo creado',
  BACKUP_RESTORE: 'Respaldo restaurado',
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  sale: 'Venta',
  purchase: 'Compra',
  product: 'Producto',
  backup: 'Respaldo',
};

const METADATA_KEY_LABELS: Record<string, string> = {
  productId: 'Producto',
  quantity: 'Cantidad',
  type: 'Tipo',
  reason: 'Motivo',
  filename: 'Archivo',
  sizeBytes: 'Tamaño (bytes)',
  imageKey: 'Imagen',
  saleId: 'Venta',
  purchaseId: 'Compra',
};

export function auditActionLabel(action: string): string {
  return AUDIT_ACTION_LABELS[action] ?? action;
}

export function auditEntityLabel(entity: string): string {
  return AUDIT_ENTITY_LABELS[entity] ?? entity;
}

// Convierte el metadata crudo en pares "Etiqueta: valor" legibles
export function formatAuditMetadata(
  metadata: Record<string, unknown> | null,
): string {
  if (!metadata) return '—';
  const entries = Object.entries(metadata);
  if (entries.length === 0) return '—';
  return entries
    .map(([key, value]) => `${METADATA_KEY_LABELS[key] ?? key}: ${String(value)}`)
    .join(' · ');
}
