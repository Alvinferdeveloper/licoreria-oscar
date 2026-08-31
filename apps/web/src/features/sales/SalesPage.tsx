import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Plus, Eye, XCircle, FileDown } from 'lucide-react';
import { SaleStatus, UserRole } from '@licoreria/shared-types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { PaginationControls } from '@/components/PaginationControls';

interface Customer {
  id: string;
  name: string;
  isActive: boolean;
}

interface SaleDetail {
  id: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  product: { id: string; name: string; sku: string; taxRate: string };
}

interface Sale {
  id: string;
  invoiceNumber: string;
  saleDate: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  status: SaleStatus;
  customer: { id: string; name: string; documentId: string | null };
  user: { id: string; name: string };
  details: SaleDetail[];
}

export function SalesPage() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const canSell = user?.role === UserRole.ADMIN || user?.role === UserRole.VENDEDOR;

  const [page, setPage] = useState(1);
  const [customerFilter, setCustomerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [detail, setDetail] = useState<Sale | null>(null);
  const [voiding, setVoiding] = useState<Sale | null>(null);

  const salesQuery = useQuery({
    queryKey: ['sales', page, customerFilter, statusFilter, startDate, endDate],
    queryFn: () =>
      api
        .get<{
          data: Sale[];
          meta: { page: number; limit: number; total: number };
        }>('/sales', {
          params: {
            page,
            limit: 20,
            ...(customerFilter ? { customerId: customerFilter } : {}),
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(startDate && endDate ? { startDate, endDate } : {}),
          },
        })
        .then((r) => r.data),
  });

  const customersQuery = useQuery({
    queryKey: ['customers', 'options'],
    queryFn: () =>
      api
        .get<{ data: Customer[] }>('/customers', { params: { limit: 200 } })
        .then((r) => r.data.data),
  });

  const voidSale = useMutation({
    mutationFn: (sale: Sale) => api.post(`/sales/${sale.id}/void`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setVoiding(null);
      setDetail(null);
    },
  });

  const voidError =
    voidSale.error instanceof AxiosError
      ? (voidSale.error.response?.data?.message as string)
      : null;

  // El PDF viaja con el JWT del interceptor; se descarga como blob
  const downloadPdf = async (sale: Sale) => {
    const res = await api.get(`/sales/${sale.id}/pdf`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data as Blob);
    window.open(url, '_blank');
  };

  const canVoid = (sale: Sale) =>
    sale.status === SaleStatus.ISSUED &&
    (user?.role === UserRole.ADMIN || sale.user.id === user?.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 font-semibold">Ventas</h1>
        {canSell && (
          <Button asChild>
            <Link to="/ventas/nueva">
              <Plus size={20} strokeWidth={1.5} aria-hidden />
              Nueva venta
            </Link>
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="customerFilter">Cliente</Label>
          <select
            id="customerFilter"
            value={customerFilter}
            onChange={(e) => {
              setCustomerFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-sm border border-border bg-surface-card px-3 text-body"
          >
            <option value="">Todos</option>
            {(customersQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="statusFilter">Estado</Label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-sm border border-border bg-surface-card px-3 text-body"
          >
            <option value="">Todos</option>
            <option value={SaleStatus.ISSUED}>Emitida</option>
            <option value={SaleStatus.VOIDED}>Anulada</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="startDate">Desde</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="endDate">Hasta</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <Card>
        <CardContent className="table-scroll p-0">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="table-head-cell px-4 py-2.5 text-left">Factura</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Fecha</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Cliente</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Vendedor</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Total</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Estado</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {salesQuery.data?.data.map((sale) => (
                <tr
                  key={sale.id}
                  className="border-b border-border transition-colors hover:bg-surface-sunken"
                >
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
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDetail(sale)}
                      aria-label="Ver detalle"
                    >
                      <Eye size={16} strokeWidth={1.5} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadPdf(sale)}
                      aria-label="Descargar factura PDF"
                    >
                      <FileDown size={16} strokeWidth={1.5} />
                    </Button>
                    {canVoid(sale) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setVoiding(sale)}
                        aria-label="Anular venta"
                      >
                        <XCircle size={16} strokeWidth={1.5} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {salesQuery.data?.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No hay ventas registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {salesQuery.data?.meta && (
            <PaginationControls
              page={salesQuery.data.meta.page}
              limit={salesQuery.data.meta.limit}
              total={salesQuery.data.meta.total}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Detalle de venta */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={`Factura ${detail?.invoiceNumber ?? ''}`}
      >
        {detail && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 text-body">
              <span className="text-muted">Fecha</span>
              <span className="font-mono">{formatDateTime(detail.saleDate)}</span>
              <span className="text-muted">Cliente</span>
              <span>{detail.customer.name}</span>
              <span className="text-muted">Vendedor</span>
              <span>{detail.user.name}</span>
              <span className="text-muted">Estado</span>
              <Badge
                variant={detail.status === SaleStatus.ISSUED ? 'success' : 'danger'}
                className="justify-self-start"
              >
                {detail.status === SaleStatus.ISSUED ? 'Emitida' : 'Anulada'}
              </Badge>
            </div>
            <div className="table-scroll">
              <table className="w-full text-body">
              <thead>
                <tr className="border-b border-border">
                  <th className="table-head-cell py-2 text-left">Producto</th>
                  <th className="table-head-cell py-2 text-right">Cant.</th>
                  <th className="table-head-cell py-2 text-right">Precio</th>
                  <th className="table-head-cell py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detail.details.map((d) => (
                  <tr key={d.id} className="border-b border-border">
                    <td className="py-2">{d.product.name}</td>
                    <td className="py-2 text-right font-mono">{d.quantity}</td>
                    <td className="py-2 text-right font-mono">
                      {formatCurrency(d.unitPrice)}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {formatCurrency(d.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div className="flex flex-col items-end gap-1 border-t border-border pt-3">
              <span className="font-mono text-small text-muted">
                Subtotal: {formatCurrency(detail.subtotal)}
              </span>
              <span className="font-mono text-small text-muted">
                IVA: {formatCurrency(detail.taxTotal)}
              </span>
              <span className="font-mono text-h2 font-semibold">
                {formatCurrency(detail.total)}
              </span>
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => downloadPdf(detail)}>
                <FileDown size={16} strokeWidth={1.5} aria-hidden />
                Descargar PDF
              </Button>
              {canVoid(detail) && (
                <Button variant="destructive" onClick={() => setVoiding(detail)}>
                  Anular venta
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmación de anulación */}
      <Modal
        open={voiding !== null}
        onClose={() => setVoiding(null)}
        title="Anular venta"
      >
        {voiding && (
          <div className="flex flex-col gap-4">
            {voidError && (
              <p
                role="alert"
                className="rounded-sm bg-status-danger/10 px-3 py-2 text-small text-status-danger"
              >
                {voidError}
              </p>
            )}
            <p className="text-body">
              Se anulará la factura <strong>{voiding.invoiceNumber}</strong> (
              {formatCurrency(voiding.total)}) y se repondrá el stock de sus
              productos. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                disabled={voidSale.isPending}
                onClick={() => voidSale.mutate(voiding)}
              >
                {voidSale.isPending ? 'Anulando…' : 'Sí, anular venta'}
              </Button>
              <Button variant="secondary" onClick={() => setVoiding(null)}>
                Volver
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
