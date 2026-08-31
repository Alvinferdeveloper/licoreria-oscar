import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface Customer {
  id: string;
  name: string;
  documentId: string | null;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  unitPrice: string;
  taxRate: string;
  currentStock: number;
  isActive: boolean;
}

interface CartLine {
  product: Product;
  quantity: number;
}

export function NewSalePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [customerId, setCustomerId] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');

  const customersQuery = useQuery({
    queryKey: ['customers', 'options'],
    queryFn: () =>
      api
        .get<{ data: Customer[] }>('/customers', { params: { limit: 200 } })
        .then((r) => r.data.data.filter((c) => c.isActive)),
  });

  const productsQuery = useQuery({
    queryKey: ['products', 'options'],
    queryFn: () =>
      api
        .get<{ data: Product[] }>('/products', { params: { limit: 200 } })
        .then((r) => r.data.data.filter((p) => p.isActive)),
  });

  const create = useMutation({
    mutationFn: (payload: {
      customerId: string;
      details: { productId: string; quantity: number }[];
    }) => api.post('/sales', payload).then((r) => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      navigate('/ventas');
    },
  });

  const createError =
    create.error instanceof AxiosError
      ? (create.error.response?.data?.message as string)
      : null;

  const addToCart = () => {
    const product = (productsQuery.data ?? []).find(
      (p) => p.id === selectedProduct,
    );
    if (!product) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, quantity: Math.min(l.quantity + 1, product.currentStock) }
            : l,
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setSelectedProduct('');
  };

  const updateQuantity = (productId: string, quantity: number) =>
    setCart((prev) =>
      prev.map((l) => {
        if (l.product.id !== productId) return l;
        const qty = Math.max(1, Math.min(Math.trunc(quantity) || 1, l.product.currentStock));
        return { ...l, quantity: qty };
      }),
    );

  const removeLine = (productId: string) =>
    setCart((prev) => prev.filter((l) => l.product.id !== productId));

  // Totales estimados en cliente (espejo del cálculo del servidor;
  // el backend recalcula y es la autoridad final)
  const totals = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    for (const line of cart) {
      const lineSubtotal = Number(line.product.unitPrice) * line.quantity;
      subtotal += lineSubtotal;
      tax += lineSubtotal * (Number(line.product.taxRate) / 100);
    }
    return { subtotal, tax, total: subtotal + tax };
  }, [cart]);

  const submit = () => {
    create.mutate({
      customerId,
      details: cart.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
      })),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild aria-label="Volver a ventas">
          <Link to="/ventas">
            <ArrowLeft size={16} strokeWidth={1.5} />
          </Link>
        </Button>
        <h1 className="text-h1 font-semibold">Nueva venta</h1>
      </div>

      {createError && (
        <p
          role="alert"
          className="rounded-sm bg-status-danger/10 px-3 py-2 text-small text-status-danger"
        >
          {createError}
        </p>
      )}

      <Card>
        <CardContent className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="saleCustomer">Cliente</Label>
            <select
              id="saleCustomer"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="h-10 max-w-md rounded-sm border border-border bg-surface-card px-3 text-body"
            >
              <option value="">Seleccionar…</option>
              {(customersQuery.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.documentId ? ` — ${c.documentId}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="saleProduct">Agregar producto</Label>
            <div className="flex gap-2">
              <select
                id="saleProduct"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="h-10 flex-1 rounded-sm border border-border bg-surface-card px-3 text-body"
              >
                <option value="">Producto…</option>
                {(productsQuery.data ?? []).map((p) => (
                  <option key={p.id} value={p.id} disabled={p.currentStock < 1}>
                    {p.name} ({p.sku}) — {formatCurrency(p.unitPrice)} — stock:{' '}
                    {p.currentStock}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="secondary"
                onClick={addToCart}
                disabled={!selectedProduct}
              >
                <Plus size={16} strokeWidth={1.5} aria-hidden />
                Agregar
              </Button>
            </div>
          </div>

          <div className="table-scroll">
            <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="table-head-cell py-2 text-left">Producto</th>
                <th className="table-head-cell py-2 text-right">Stock</th>
                <th className="table-head-cell py-2 text-right">Cant.</th>
                <th className="table-head-cell py-2 text-right">Precio</th>
                <th className="table-head-cell py-2 text-right">IVA</th>
                <th className="table-head-cell py-2 text-right">Subtotal</th>
                <th className="table-head-cell py-2 text-right" />
              </tr>
            </thead>
            <tbody>
              {cart.map((line) => (
                <tr key={line.product.id} className="border-b border-border">
                  <td className="py-2">{line.product.name}</td>
                  <td className="py-2 text-right font-mono text-muted">
                    {line.product.currentStock}
                  </td>
                  <td className="py-2 text-right">
                    <Input
                      type="number"
                      min={1}
                      max={line.product.currentStock}
                      step={1}
                      value={line.quantity}
                      onChange={(e) =>
                        updateQuantity(line.product.id, Number(e.target.value))
                      }
                      aria-label={`Cantidad de ${line.product.name}`}
                      className="ml-auto w-20 text-right font-mono"
                    />
                  </td>
                  <td className="py-2 text-right font-mono">
                    {formatCurrency(line.product.unitPrice)}
                  </td>
                  <td className="py-2 text-right font-mono text-muted">
                    {Number(line.product.taxRate)}%
                  </td>
                  <td className="py-2 text-right font-mono">
                    {formatCurrency(
                      Number(line.product.unitPrice) * line.quantity,
                    )}
                  </td>
                  <td className="py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(line.product.id)}
                      aria-label={`Quitar ${line.product.name}`}
                    >
                      <Trash2 size={16} strokeWidth={1.5} />
                    </Button>
                  </td>
                </tr>
              ))}
              {cart.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted">
                    El carrito está vacío. Agregue productos para facturar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>

          <div className="flex flex-col items-end gap-1 border-t border-border pt-3">
            <span className="font-mono text-small text-muted">
              Subtotal: {formatCurrency(totals.subtotal)}
            </span>
            <span className="font-mono text-small text-muted">
              IVA: {formatCurrency(totals.tax)}
            </span>
            <span className="font-mono text-h2 font-semibold">
              {formatCurrency(totals.total)}
            </span>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={submit}
              disabled={create.isPending || !customerId || cart.length === 0}
            >
              {create.isPending ? 'Registrando…' : 'Emitir factura'}
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/ventas">Cancelar</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
