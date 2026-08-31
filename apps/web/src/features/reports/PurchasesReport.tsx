import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { defaultRange } from './reports-utils';

interface Option {
  id: string;
  name: string;
}

interface ReportPurchase {
  id: string;
  purchaseDate: string;
  total: string;
  status: 'REGISTERED' | 'CANCELLED';
  supplier: { id: string; name: string };
  user: { id: string; name: string };
  details: {
    id: string;
    quantity: number;
    unitCost: string;
    subtotal: string;
    product: { id: string; name: string; sku: string };
  }[];
}

interface PurchasesReportData {
  purchases: ReportPurchase[];
  summary: { count: number; cancelledCount: number; total: string };
}

// Reporte de compras por proveedor y rango de fechas, con detalle expandible
export function PurchasesReport() {
  const [startDate, setStartDate] = useState(defaultRange().startDate);
  const [endDate, setEndDate] = useState(defaultRange().endDate);
  const [supplierId, setSupplierId] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const params = {
    startDate,
    endDate,
    ...(supplierId ? { supplierId } : {}),
  };

  const reportQuery = useQuery({
    queryKey: ['reports', 'purchases', params],
    enabled: !!startDate && !!endDate,
    queryFn: () =>
      api
        .get<{ data: PurchasesReportData }>('/reports/purchases', { params })
        .then((r) => r.data.data),
  });

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', 'options'],
    queryFn: () =>
      api
        .get<{ data: Option[] }>('/suppliers', { params: { limit: 200 } })
        .then((r) => r.data.data),
  });

  const summary = reportQuery.data?.summary;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="prStart">Desde</Label>
          <Input
            id="prStart"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="prEnd">Hasta</Label>
          <Input
            id="prEnd"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="prSupplier">Proveedor</Label>
          <select
            id="prSupplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="h-10 rounded-sm border border-border bg-surface-card px-3 text-body"
          >
            <option value="">Todos</option>
            {(suppliersQuery.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {summary && (
        <div className="flex flex-wrap gap-6 text-body">
          <span>
            Compras: <strong className="font-mono">{summary.count}</strong>
          </span>
          {summary.cancelledCount > 0 && (
            <span className="text-muted">
              Canceladas: <span className="font-mono">{summary.cancelledCount}</span>
            </span>
          )}
          <span>
            Total:{' '}
            <strong className="font-mono text-h2">{formatCurrency(summary.total)}</strong>
          </span>
        </div>
      )}

      <Card>
        <CardContent className="table-scroll p-0">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="table-head-cell px-4 py-2.5 text-left" aria-label="Expandir" />
                <th className="table-head-cell px-4 py-2.5 text-left">Fecha</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Proveedor</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Registró</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Total</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reportQuery.data?.purchases.map((purchase) => (
                <Fragment key={purchase.id}>
                  <tr
                    onClick={() =>
                      setExpanded(expanded === purchase.id ? null : purchase.id)
                    }
                    className="cursor-pointer border-b border-border transition-colors hover:bg-surface-sunken"
                  >
                    <td className="px-4 py-2.5 text-muted">
                      {expanded === purchase.id ? (
                        <ChevronDown size={16} strokeWidth={1.5} />
                      ) : (
                        <ChevronRight size={16} strokeWidth={1.5} />
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-muted">
                      {formatDateTime(purchase.purchaseDate)}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{purchase.supplier.name}</td>
                    <td className="px-4 py-2.5 text-muted">{purchase.user.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {formatCurrency(purchase.total)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant={
                          purchase.status === 'REGISTERED' ? 'success' : 'danger'
                        }
                      >
                        {purchase.status === 'REGISTERED' ? 'Registrada' : 'Cancelada'}
                      </Badge>
                    </td>
                  </tr>
                  {expanded === purchase.id && (
                    <tr className="border-b border-border">
                      <td colSpan={6} className="bg-surface-sunken/50 px-8 py-3">
                        <table className="w-full text-small">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="table-head-cell py-1.5 text-left">Producto</th>
                              <th className="table-head-cell py-1.5 text-right">Cant.</th>
                              <th className="table-head-cell py-1.5 text-right">Costo unit.</th>
                              <th className="table-head-cell py-1.5 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {purchase.details.map((d) => (
                              <tr key={d.id} className="border-b border-border/50">
                                <td className="py-1.5">
                                  {d.product.name}{' '}
                                  <span className="font-mono text-muted">{d.product.sku}</span>
                                </td>
                                <td className="py-1.5 text-right font-mono">{d.quantity}</td>
                                <td className="py-1.5 text-right font-mono">
                                  {formatCurrency(d.unitCost)}
                                </td>
                                <td className="py-1.5 text-right font-mono">
                                  {formatCurrency(d.subtotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {reportQuery.data?.purchases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No hay compras en el rango seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
