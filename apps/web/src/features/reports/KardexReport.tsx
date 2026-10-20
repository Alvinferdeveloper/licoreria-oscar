import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { MovementType } from '@licoreria/shared-types';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TableState } from '@/components/TableState';
import { PaginationControls } from '@/components/PaginationControls';
import { downloadExcel } from './reports-utils';

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

// Reporte de Kardex por producto (histórico de movimientos)
export function KardexReport() {
  const [productId, setProductId] = useState('');
  const [page, setPage] = useState(1);

  const productsQuery = useQuery({
    queryKey: ['products', 'options'],
    queryFn: () =>
      api
        .get<{ data: Product[] }>('/products', { params: { limit: 200 } })
        .then((r) => r.data.data),
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

  const selectedProduct = kardexQuery.data?.data.product;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-64 flex-col gap-2">
          <Label htmlFor="krProduct">Producto</Label>
          <Select
            id="krProduct"
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
          </Select>
        </div>
        {productId && (
          <Button
            variant="secondary"
            onClick={() =>
              downloadExcel(
                `/reports/kardex/${productId}/export`,
                `kardex-${selectedProduct?.sku ?? 'producto'}.xlsx`,
              )
            }
          >
            <FileDown size={16} strokeWidth={1.5} aria-hidden />
            Exportar Excel
          </Button>
        )}
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
        <CardContent className="table-scroll p-0">
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
              <TableState
                colSpan={5}
                isLoading={!!productId && kardexQuery.isPending}
                isError={!!productId && kardexQuery.isError}
                isEmpty={!!productId && kardexQuery.data?.data.movements.length === 0}
                emptyMessage="Este producto aún no tiene movimientos."
              />
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
    </div>
  );
}
