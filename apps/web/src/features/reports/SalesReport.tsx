import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, FileDown } from 'lucide-react';
import { SaleStatus } from '@licoreria/shared-types';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TableState } from '@/components/TableState';
import { defaultRange, downloadExcel } from './reports-utils';

interface Option {
  id: string;
  name: string;
}

interface ReportSale {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  status: SaleStatus;
  customer: { id: string; name: string };
  user: { id: string; name: string };
  details: {
    id: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
    product: {
      id: string;
      name: string;
      sku: string;
      category: { id: string; name: string } | null;
    };
  }[];
}

interface SalesReportData {
  sales: ReportSale[];
  summary: {
    count: number;
    voidedCount: number;
    subtotal: string;
    taxTotal: string;
    total: string;
  };
}

// Maestro-detalle: cada factura expande su detalle de productos
export function SalesReport() {
  const [startDate, setStartDate] = useState(defaultRange().startDate);
  const [endDate, setEndDate] = useState(defaultRange().endDate);
  const [userId, setUserId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const params = {
    startDate,
    endDate,
    ...(userId ? { userId } : {}),
    ...(categoryId ? { categoryId } : {}),
  };

  const reportQuery = useQuery({
    queryKey: ['reports', 'sales', params],
    enabled: !!startDate && !!endDate,
    queryFn: () =>
      api
        .get<{ data: SalesReportData }>('/reports/sales', { params })
        .then((r) => r.data.data),
  });

  const usersQuery = useQuery({
    queryKey: ['users', 'options'],
    queryFn: () =>
      api.get<{ data: Option[] }>('/users/options').then((r) => r.data.data),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'options'],
    queryFn: () =>
      api
        .get<{ data: Option[] }>('/categories', { params: { limit: 200 } })
        .then((r) => r.data.data),
  });

  const summary = reportQuery.data?.summary;

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="srStart">Desde</Label>
          <Input
            id="srStart"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="srEnd">Hasta</Label>
          <Input
            id="srEnd"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="srUser">Vendedor</Label>
          <Select
            id="srUser"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-10 rounded-sm border border-border bg-surface-card px-3 text-body"
          >
            <option value="">Todos</option>
            {(usersQuery.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="srCategory">Categoría</Label>
          <Select
            id="srCategory"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-10 rounded-sm border border-border bg-surface-card px-3 text-body"
          >
            <option value="">Todas</option>
            {(categoriesQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          variant="secondary"
          disabled={!startDate || !endDate}
          onClick={() =>
            downloadExcel(
              '/reports/sales/export',
              `ventas-${startDate}-a-${endDate}.xlsx`,
              params,
            )
          }
        >
          <FileDown size={16} strokeWidth={1.5} aria-hidden />
          Exportar Excel
        </Button>
      </div>

      {/* Resumen */}
      {summary && (
        <div className="flex flex-wrap gap-6 text-body">
          <span>
            Facturas emitidas: <strong className="font-mono">{summary.count}</strong>
          </span>
          {summary.voidedCount > 0 && (
            <span className="text-muted">
              Anuladas: <span className="font-mono">{summary.voidedCount}</span>
            </span>
          )}
          <span>
            Subtotal: <strong className="font-mono">{formatCurrency(summary.subtotal)}</strong>
          </span>
          <span>
            IVA: <strong className="font-mono">{formatCurrency(summary.taxTotal)}</strong>
          </span>
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
                <th className="table-head-cell px-4 py-2.5 text-left">Factura</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Fecha</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Cliente</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Vendedor</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Total</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Estado</th>
              </tr>
            </thead>
            <tbody>
              {reportQuery.data?.sales.map((sale) => (
                <Fragment key={sale.id}>
                  <tr
                    onClick={() =>
                      setExpanded(expanded === sale.id ? null : sale.id)
                    }
                    className="cursor-pointer border-b border-border transition-colors hover:bg-surface-sunken"
                  >
                    <td className="px-4 py-2.5 text-muted">
                      {expanded === sale.id ? (
                        <ChevronDown size={16} strokeWidth={1.5} />
                      ) : (
                        <ChevronRight size={16} strokeWidth={1.5} />
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono">{sale.invoiceNumber}</td>
                    <td className="px-4 py-2.5 font-mono text-muted">
                      {formatDateTime(sale.saleDate)}
                    </td>
                    <td className="px-4 py-2.5 font-medium">{sale.customer.name}</td>
                    <td className="px-4 py-2.5 text-muted">{sale.user.name}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant={
                          sale.status === SaleStatus.ISSUED ? 'success' : 'danger'
                        }
                      >
                        {sale.status === SaleStatus.ISSUED ? 'Emitida' : 'Anulada'}
                      </Badge>
                    </td>
                  </tr>
                  {expanded === sale.id && (
                    <tr key={`${sale.id}-detail`} className="border-b border-border">
                      <td colSpan={7} className="bg-surface-sunken/50 px-8 py-3">
                        <table className="w-full text-small">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="table-head-cell py-1.5 text-left">Producto</th>
                              <th className="table-head-cell py-1.5 text-left">Categoría</th>
                              <th className="table-head-cell py-1.5 text-right">Cant.</th>
                              <th className="table-head-cell py-1.5 text-right">Precio</th>
                              <th className="table-head-cell py-1.5 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sale.details.map((d) => (
                              <tr key={d.id} className="border-b border-border/50">
                                <td className="py-1.5">
                                  {d.product.name}{' '}
                                  <span className="font-mono text-muted">{d.product.sku}</span>
                                </td>
                                <td className="py-1.5 text-muted">
                                  {d.product.category?.name ?? '—'}
                                </td>
                                <td className="py-1.5 text-right font-mono">{d.quantity}</td>
                                <td className="py-1.5 text-right font-mono">
                                  {formatCurrency(d.unitPrice)}
                                </td>
                                <td className="py-1.5 text-right font-mono">
                                  {formatCurrency(d.subtotal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="mt-2 flex justify-end gap-4 text-small text-muted">
                          <span>
                            Subtotal:{' '}
                            <span className="font-mono">{formatCurrency(sale.subtotal)}</span>
                          </span>
                          <span>
                            IVA: <span className="font-mono">{formatCurrency(sale.taxTotal)}</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              <TableState
                colSpan={7}
                isLoading={reportQuery.isPending && !!startDate && !!endDate}
                isError={reportQuery.isError}
                isEmpty={reportQuery.data?.sales.length === 0}
                emptyMessage="No hay ventas en el rango seleccionado."
              />
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
