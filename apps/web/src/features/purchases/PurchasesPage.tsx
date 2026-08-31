import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Plus, Trash2, XCircle, Eye } from 'lucide-react';
import { PurchaseStatus, UserRole } from '@licoreria/shared-types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { PaginationControls } from '@/components/PaginationControls';

interface Supplier {
  id: string;
  name: string;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unitPrice: string;
  currentStock: number;
}

interface PurchaseLine {
  productId: string;
  quantity: number;
  unitCost: number;
}

interface PurchaseDetail {
  id: string;
  quantity: number;
  unitCost: string;
  subtotal: string;
  product: { id: string; name: string; sku: string };
}

interface Purchase {
  id: string;
  purchaseDate: string;
  total: string;
  status: PurchaseStatus;
  supplier: { id: string; name: string };
  user: { id: string; name: string };
  details: PurchaseDetail[];
}

interface SuggestedPrice {
  productId: string;
  productName: string;
  newCost: string;
  marginPercentage: string;
  suggestedPrice: string;
  currentUnitPrice: string;
}

const emptyLine = (): PurchaseLine => ({ productId: '', quantity: 1, unitCost: 0 });

export function PurchasesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [lines, setLines] = useState<PurchaseLine[]>([emptyLine()]);
  const [detail, setDetail] = useState<Purchase | null>(null);
  const [suggested, setSuggested] = useState<SuggestedPrice[] | null>(null);
  const [cancelling, setCancelling] = useState<Purchase | null>(null);

  const purchasesQuery = useQuery({
    queryKey: ['purchases', page, supplierFilter, startDate, endDate],
    queryFn: () =>
      api
        .get<{
          data: Purchase[];
          meta: { page: number; limit: number; total: number };
        }>('/purchases', {
          params: {
            page,
            limit: 20,
            ...(supplierFilter ? { supplierId: supplierFilter } : {}),
            ...(startDate && endDate ? { startDate, endDate } : {}),
          },
        })
        .then((r) => r.data),
  });

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', 'options'],
    queryFn: () =>
      api
        .get<{ data: Supplier[] }>('/suppliers', { params: { limit: 200 } })
        .then((r) => r.data.data),
  });

  const productsQuery = useQuery({
    queryKey: ['products', 'options'],
    queryFn: () =>
      api
        .get<{ data: Product[] }>('/products', { params: { limit: 200 } })
        .then((r) => r.data.data),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['purchases'] });

  const create = useMutation({
    mutationFn: (payload: { supplierId: string; details: PurchaseLine[] }) =>
      api
        .post<{ data: { purchase: Purchase; suggestedPrices: SuggestedPrice[] } }>(
          '/purchases',
          payload,
        )
        .then((r) => r.data.data),
    onSuccess: (result) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      closeForm();
      if (result.suggestedPrices.length > 0) {
        setSuggested(result.suggestedPrices);
      }
    },
  });

  const cancel = useMutation({
    mutationFn: (purchase: Purchase) =>
      api.post(`/purchases/${purchase.id}/cancel`),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setCancelling(null);
    },
  });

  const applyPrice = useMutation({
    mutationFn: (sp: SuggestedPrice) =>
      api.patch(`/products/${sp.productId}`, {
        unitPrice: Number(sp.suggestedPrice),
      }),
    onSuccess: (_r, sp) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSuggested((prev) =>
        prev ? prev.filter((p) => p.productId !== sp.productId) : prev,
      );
    },
  });

  const openForm = () => {
    setSupplierId('');
    setLines([emptyLine()]);
    create.reset();
    setFormOpen(true);
  };
  const closeForm = () => setFormOpen(false);

  const updateLine = (index: number, patch: Partial<PurchaseLine>) =>
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  const removeLine = (index: number) =>
    setLines((prev) => prev.filter((_, i) => i !== index));

  const formTotal = lines.reduce(
    (acc, line) => acc + line.quantity * line.unitCost,
    0,
  );

  const submitPurchase = () => {
    const details = lines
      .filter((l) => l.productId && l.quantity >= 1 && l.unitCost > 0)
      .map((l) => ({
        productId: l.productId,
        quantity: Math.trunc(l.quantity),
        unitCost: l.unitCost,
      }));
    create.mutate({ supplierId, details });
  };

  const createError =
    create.error instanceof AxiosError
      ? (create.error.response?.data?.message as string)
      : null;
  const cancelError =
    cancel.error instanceof AxiosError
      ? (cancel.error.response?.data?.message as string)
      : null;

  const activeSuppliers = (suppliersQuery.data ?? []).filter((s) => s.isActive);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 font-semibold">Compras</h1>
        {isAdmin && (
          <Button onClick={openForm}>
            <Plus size={20} strokeWidth={1.5} aria-hidden />
            Registrar compra
          </Button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="supplierFilter">Proveedor</Label>
          <select
            id="supplierFilter"
            value={supplierFilter}
            onChange={(e) => {
              setSupplierFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-sm border border-border bg-surface-card px-3 text-body"
          >
            <option value="">Todos</option>
            {activeSuppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
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
        <CardContent className="p-0">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="table-head-cell px-4 py-2.5 text-left">Fecha</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Proveedor</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Registrada por</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Líneas</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Total</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Estado</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {purchasesQuery.data?.data.map((purchase) => (
                <tr
                  key={purchase.id}
                  className="border-b border-border transition-colors hover:bg-surface-sunken"
                >
                  <td className="px-4 py-2.5 font-mono text-muted">
                    {formatDate(purchase.purchaseDate)}
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    {purchase.supplier.name}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{purchase.user.name}</td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {purchase.details.length}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatCurrency(Number(purchase.total))}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge
                      variant={
                        purchase.status === PurchaseStatus.REGISTERED
                          ? 'success'
                          : 'danger'
                      }
                    >
                      {purchase.status === PurchaseStatus.REGISTERED
                        ? 'Registrada'
                        : 'Cancelada'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDetail(purchase)}
                      aria-label="Ver detalle"
                    >
                      <Eye size={16} strokeWidth={1.5} />
                    </Button>
                    {isAdmin && purchase.status === PurchaseStatus.REGISTERED && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancelling(purchase)}
                        aria-label="Cancelar compra"
                      >
                        <XCircle size={16} strokeWidth={1.5} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {purchasesQuery.data?.data.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    No hay compras registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {purchasesQuery.data?.meta && (
            <PaginationControls
              page={purchasesQuery.data.meta.page}
              limit={purchasesQuery.data.meta.limit}
              total={purchasesQuery.data.meta.total}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      {/* Formulario de nueva compra */}
      <Modal open={formOpen} onClose={closeForm} title="Registrar compra">
        <div className="flex flex-col gap-4">
          {createError && (
            <p
              role="alert"
              className="rounded-sm bg-status-danger/10 px-3 py-2 text-small text-status-danger"
            >
              {createError}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="purchaseSupplier">Proveedor</Label>
            <select
              id="purchaseSupplier"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-10 rounded-sm border border-border bg-surface-card px-3 text-body"
            >
              <option value="">Seleccionar…</option>
              {activeSuppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Líneas de compra</Label>
            {lines.map((line, index) => (
              <div key={index} className="flex items-end gap-2">
                <select
                  value={line.productId}
                  onChange={(e) => updateLine(index, { productId: e.target.value })}
                  aria-label={`Producto de la línea ${index + 1}`}
                  className="h-10 flex-1 rounded-sm border border-border bg-surface-card px-3 text-body"
                >
                  <option value="">Producto…</option>
                  {(productsQuery.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(index, { quantity: Number(e.target.value) })
                  }
                  aria-label="Cantidad"
                  className="w-24"
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={line.unitCost}
                  onChange={(e) =>
                    updateLine(index, { unitCost: Number(e.target.value) })
                  }
                  aria-label="Costo unitario"
                  className="w-28"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeLine(index)}
                  disabled={lines.length === 1}
                  aria-label="Quitar línea"
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setLines((prev) => [...prev, emptyLine()])}
              className="self-start"
            >
              <Plus size={16} strokeWidth={1.5} aria-hidden />
              Agregar línea
            </Button>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-small text-muted">Total</span>
            <span className="font-mono text-h2 font-semibold">
              {formatCurrency(formTotal)}
            </span>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={submitPurchase}
              disabled={
                create.isPending ||
                !supplierId ||
                lines.every((l) => !l.productId || l.quantity < 1 || l.unitCost <= 0)
              }
            >
              {create.isPending ? 'Registrando…' : 'Registrar compra'}
            </Button>
            <Button variant="secondary" onClick={closeForm}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detalle de compra */}
      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Detalle de compra"
      >
        {detail && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2 text-body">
              <span className="text-muted">Fecha</span>
              <span className="font-mono">{formatDate(detail.purchaseDate)}</span>
              <span className="text-muted">Proveedor</span>
              <span>{detail.supplier.name}</span>
              <span className="text-muted">Registrada por</span>
              <span>{detail.user.name}</span>
            </div>
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-border">
                  <th className="table-head-cell py-2 text-left">Producto</th>
                  <th className="table-head-cell py-2 text-right">Cant.</th>
                  <th className="table-head-cell py-2 text-right">Costo</th>
                  <th className="table-head-cell py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detail.details.map((d) => (
                  <tr key={d.id} className="border-b border-border">
                    <td className="py-2">{d.product.name}</td>
                    <td className="py-2 text-right font-mono">{d.quantity}</td>
                    <td className="py-2 text-right font-mono">
                      {formatCurrency(Number(d.unitCost))}
                    </td>
                    <td className="py-2 text-right font-mono">
                      {formatCurrency(Number(d.subtotal))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end font-mono text-h2 font-semibold">
              {formatCurrency(Number(detail.total))}
            </div>
          </div>
        )}
      </Modal>

      {/* Precios sugeridos tras registrar */}
      <Modal
        open={suggested !== null}
        onClose={() => setSuggested(null)}
        title="Precios sugeridos"
      >
        {suggested && (
          <div className="flex flex-col gap-4">
            <p className="text-small text-muted">
              Con el nuevo costo promedio, estos son los precios sugeridos según
              el margen de cada producto. No se aplican automáticamente.
            </p>
            <table className="w-full text-body">
              <thead>
                <tr className="border-b border-border">
                  <th className="table-head-cell py-2 text-left">Producto</th>
                  <th className="table-head-cell py-2 text-right">Costo nuevo</th>
                  <th className="table-head-cell py-2 text-right">Sugerido</th>
                  <th className="table-head-cell py-2 text-right">Actual</th>
                  {isAdmin && <th className="table-head-cell py-2 text-right" />}
                </tr>
              </thead>
              <tbody>
                {suggested.map((sp) => (
                  <tr key={sp.productId} className="border-b border-border">
                    <td className="py-2">{sp.productName}</td>
                    <td className="py-2 text-right font-mono">
                      {formatCurrency(Number(sp.newCost))}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold">
                      {formatCurrency(Number(sp.suggestedPrice))}
                    </td>
                    <td className="py-2 text-right font-mono text-muted">
                      {formatCurrency(Number(sp.currentUnitPrice))}
                    </td>
                    {isAdmin && (
                      <td className="py-2 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={applyPrice.isPending}
                          onClick={() => applyPrice.mutate(sp)}
                        >
                          Aplicar
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <Button variant="secondary" onClick={() => setSuggested(null)}>
              Cerrar
            </Button>
          </div>
        )}
      </Modal>

      {/* Confirmación de cancelación */}
      <Modal
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        title="Cancelar compra"
      >
        {cancelling && (
          <div className="flex flex-col gap-4">
            {cancelError && (
              <p
                role="alert"
                className="rounded-sm bg-status-danger/10 px-3 py-2 text-small text-status-danger"
              >
                {cancelError}
              </p>
            )}
            <p className="text-body">
              Se revertirá el stock ingresado por esta compra de{' '}
              <strong>{cancelling.supplier.name}</strong> (
              {formatCurrency(Number(cancelling.total))}). Esta acción no se puede
              deshacer.
            </p>
            <div className="flex gap-3">
              <Button
                variant="destructive"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate(cancelling)}
              >
                {cancel.isPending ? 'Cancelando…' : 'Sí, cancelar compra'}
              </Button>
              <Button variant="secondary" onClick={() => setCancelling(null)}>
                Volver
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
