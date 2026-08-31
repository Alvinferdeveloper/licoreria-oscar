import { useState } from 'react';
import { UserRole } from '@licoreria/shared-types';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import { SalesReport } from './SalesReport';
import { PurchasesReport } from './PurchasesReport';
import { InventoryReport } from './InventoryReport';
import { KardexReport } from './KardexReport';
import { AuditReport } from './AuditReport';

type ReportKey = 'ventas' | 'compras' | 'inventario' | 'kardex' | 'auditoria';

const REPORT_TABS: { key: ReportKey; label: string; adminOnly?: boolean }[] = [
  { key: 'ventas', label: 'Ventas (maestro-detalle)' },
  { key: 'compras', label: 'Compras' },
  { key: 'inventario', label: 'Inventario actual' },
  { key: 'kardex', label: 'Kardex' },
  { key: 'auditoria', label: 'Auditoría', adminOnly: true },
];

export function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const tabs = REPORT_TABS.filter((t) => !t.adminOnly || isAdmin);
  const [active, setActive] = useState<ReportKey>('ventas');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1 font-semibold">Reportes</h1>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tipo de reporte">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            onClick={() => setActive(tab.key)}
            className={cn(
              'rounded-md border px-4 py-2 text-body transition-colors duration-150',
              active === tab.key
                ? 'border-brand-copper bg-brand-copper text-white'
                : 'border-border bg-surface-card hover:bg-surface-sunken',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {active === 'ventas' && <SalesReport />}
      {active === 'compras' && <PurchasesReport />}
      {active === 'inventario' && <InventoryReport />}
      {active === 'kardex' && <KardexReport />}
      {active === 'auditoria' && isAdmin && <AuditReport />}
    </div>
  );
}
