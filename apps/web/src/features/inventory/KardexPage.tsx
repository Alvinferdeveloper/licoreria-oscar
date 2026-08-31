import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { MovementType, UserRole } from '@licoreria/shared-types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { FieldError } from '@/components/FieldError';
import { PaginationControls } from '@/components/PaginationControls';

interface Product {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  minStock: number;
  category: { id: string; name: string } | null;
}

interface Movement {
  id: string;
  type: MovementType;
  quantity: number;
  balanceAfter: number;
  referenceType: string | null;
  createdAt: string;
  user: { id: string; name: string };
}

const MOVEMENT_LABELS: Record<MovementType, { label: string; sign: 1 | -1 }> = {
  [MovementType.PURCHASE_IN]: { label: 'Compra', sign: 1 },
  [MovementType.SALE_OUT]: { label: 'Venta', sign: -1 },
  [MovementType.ADJUSTMENT_IN]: { label: 'Ajuste entrada', sign: 1 },
  [MovementType.ADJUSTMENT_OUT]: { label: 'Ajuste salida', sign: -1 },
  [MovementType.VOID_REVERSAL]: { label: 'Reversión anulación', sign: 1 },
};

export function KardexPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const queryClient = useQueryClient();

  const [productId, setProductId] = useState('');
  const [page, setPage] = useState(1);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [quantity, setQuantity] = useState('0');
  const [reason, setReason] = useState('');

  const productsQuery = useQuery({
    queryKey: ['products', 'options'],
    queryFn: () =>
      api
        .get<{ data: Product[] }>('/products', { params: { limit: 200 } })
        .then((r) => r.data.data),
  });

  const lowStockQuery = useQuery({
    queryKey: ['inventory', 'low-stock'],
    queryFn: () =>
      api.get<{ data: Product[] }>('/inventory/low-stock').then((r) => r.data.data),
  });

  const kardexQuery = useQuery({
    queryKey: ['inventory', 'kardex', productId, page],
    enabled: !!productId,
    queryFn: () =>
      api
        .get<{
          data: { product: Product; movements: Movement[] };
          meta: { page: number; limit: number; total: number };
        }>(`/inventory/kardex/${productId}`, { params: { page, limit: 20 } })
        .then((r) => r.data),
  });

  const adjust = useMutation({
    mutationFn: (payload: { productId: string; quantity: number; reason: string }) =>
      api.post('/inventory/adjustments', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setAdjustOpen(false);
      setQuantity('0');
      setReason('');
    },
  });

  const adjustError =
    adjust.error instanceof AxiosError
      ? (adjust.error.response?.data?.message as string)
      : null;

  const selectedProduct = kardexQuery.data?.data.product;
  const lowStock = lowStockQuery.data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 font-semibold">Inventario</h1>
        {isAdmin && productId && (
          <Button onClick={() => setAdjustOpen(true)}>
            <SlidersHorizontal size={20} strokeWidth={1.5} aria-hidden />
            Ajuste manual
          </Button>
        )}
      </div>

      {/* Alertas de stock bajo */}
      {lowStock.length > 0 && (
        <Card className="border-status-warning/40">
          <CardContent className="flex flex-col gap-2 p-4">
            <div className="flex items-center gap-2 text-status-warning">
              <AlertTriangle size={18} strokeWidth={1.5} aria-hidden />
              <span className="text-body font-medium">
                {lowStock.length}{' '}
                {lowStock.length === 1
                  ? 'producto en o bajo su stock mínimo'
                  : 'productos en o bajo su stock mínimo'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProductId(p.id);
                    setPage(1);
                  }}
                  className="rounded-sm border border-border px-2 py-1 text-small transition-colors hover:bg-surface-sunken"
                >
                  {p.name}{' '}
                  <span className="font-mono text-status-danger">
                    {p.currentStock}/{p.minStock}
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selector de producto */}
      <div className="flex max-w-md flex-col gap-2">
        <Label htmlFor="kardexProduct">Producto</Label>
        <select
          id="kardexProduct"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-sm border border-border bg-surface-card px-3 text-body"
        >
          <option value="">Seleccionar producto…</option>
          {(productsQuery.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </select>
      </div>

      {selectedProduct && (
        <div className="flex items-center gap-4 text-body">
          <span className="font-medium">{selectedProduct.name}</span>
          <span className="text-muted">{selectedProduct.sku}</span>
          <span className="font-mono">
            Stock actual: <strong>{selectedProduct.currentStock}</strong>
          </span>
          {selectedProduct.currentStock <= selectedProduct.minStock && (
            <Badge variant="warning">Stock bajo</Badge>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="table-head-cell px-4 py-2.5 text-left">Fecha</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Tipo</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Cantidad</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Saldo</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Usuario</th>
              </tr>
            </thead>
            <tbody>
              {kardexQuery.data?.data.movements.map((m) => {
                const meta = MOVEMENT_LABELS[m.type];
                return (
                  <tr
                    key={m.id}
                    className="border-b border-border transition-colors hover:bg-surface-sunken"
                  >
                    <td className="px-4 py-2.5 font-mono text-muted">
                      {formatDateTime(m.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={meta.sign > 0 ? 'success' : 'info'}>
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {meta.sign > 0 ? '+' : '-'}
                      {m.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">
                      {m.balanceAfter}
                    </td>
                    <td className="px-4 py-2.5 text-muted">{m.user.name}</td>
                  </tr>
                );
              })}
              {!productId && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    Selecciona un producto para ver su Kardex.
                  </td>
                </tr>
              )}
              {productId && kardexQuery.data?.data.movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    Este producto aún no tiene movimientos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {kardexQuery.data?.meta && (
            <PaginationControls
              page={kardexQuery.data.meta.page}
              limit={kardexQuery.data.meta.limit}
              total={kardexQuery.data.meta.total}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Ajuste manual */}
      <Modal
        open={adjustOpen}
        onClose={() => setAdjustOpen(false)}
        title="Ajuste manual de inventario"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            adjust.mutate({
              productId,
              quantity: Number(quantity),
              reason: reason.trim(),
            });
          }}
          className="flex flex-col gap-4"
          noValidate
        >
          {adjustError && (
            <p
              role="alert"
              className="rounded-sm bg-status-danger/10 px-3 py-2 text-small text-status-danger"
            >
              {adjustError}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="adjustQty">
              Cantidad (positiva = entrada, negativa = salida)
            </Label>
            <Input
              id="adjustQty"
              type="number"
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="adjustReason">Motivo</Label>
            <Input
              id="adjustReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. producto dañado, conteo físico…"
            />
            <FieldError
              message={
                !reason.trim() && adjust.isError
                  ? 'El motivo es requerido'
                  : undefined
              }
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={
                adjust.isPending || !reason.trim() || Number(quantity) === 0
              }
            >
              {adjust.isPending ? 'Aplicando…' : 'Aplicar ajuste'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAdjustOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
