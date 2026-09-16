import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios, { AxiosError } from 'axios';
import { Pencil, Plus, Search, Wine, UserX, UserCheck, ImagePlus } from 'lucide-react';
import { UserRole } from '@licoreria/shared-types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/stores/toast.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { FieldError } from '@/components/FieldError';
import { PaginationControls } from '@/components/PaginationControls';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatCurrency } from '@/lib/utils';

interface Product {
  id: string;
  sku: string;
  name: string;
  imageKey: string | null;
  imageUrl: string | null;
  currentCost: string;
  marginPercentage: string;
  unitPrice: string;
  taxRate: string;
  currentStock: number;
  minStock: number;
  isActive: boolean;
  category: { id: string; name: string };
}

interface Category {
  id: string;
  name: string;
}

const productSchema = z.object({
  sku: z.string().min(1, 'SKU requerido').max(40),
  name: z.string().min(1, 'Nombre requerido').max(120),
  categoryId: z.string().uuid('Seleccione una categoría'),
  unitPrice: z.coerce.number().min(0, 'No puede ser negativo'),
  taxRate: z.coerce.number().min(0).max(100).optional(),
  marginPercentage: z.coerce.number().min(0).optional(),
  minStock: z.coerce.number().int().min(0).optional(),
});
type ProductForm = z.infer<typeof productSchema>;

function stockBadge(product: Product) {
  if (product.currentStock === 0) {
    return <Badge variant="danger">Agotado</Badge>;
  }
  if (product.currentStock <= product.minStock) {
    return <Badge variant="warning">Stock bajo</Badge>;
  }
  return <Badge variant="success">Normal</Badge>;
}

function ProductImage({ product }: { product: Product }) {
  if (!product.imageUrl) {
    return (
      <div
        className="flex h-10 w-10 items-center justify-center rounded-sm bg-surface-sunken text-muted"
        aria-label="Sin imagen"
      >
        <Wine size={20} strokeWidth={1.5} />
      </div>
    );
  }
  return (
    <img
      src={product.imageUrl}
      alt={product.name}
      className="h-10 w-10 rounded-sm object-cover"
    />
  );
}

export function ProductsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toggleConfirmId, setToggleConfirmId] = useState<string | null>(null);
  const [toggleAction, setToggleAction] = useState<'deactivate' | 'reactivate'>('deactivate');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const productsQuery = useQuery({
    queryKey: ['products', page, search, categoryFilter, lowStockOnly],
    queryFn: () =>
      api
        .get<{ data: Product[]; meta: { page: number; limit: number; total: number } }>(
          '/products',
          {
            params: {
              page,
              limit: 20,
              search: search || undefined,
              categoryId: categoryFilter || undefined,
              includeInactive: true,
              lowStockOnly: lowStockOnly || undefined,
            },
          },
        )
        .then((r) => r.data),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'all'],
    queryFn: () =>
      api
        .get<{ data: Category[] }>('/categories', { params: { limit: 100 } })
        .then((r) => r.data.data),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['products'] });

  const save = useMutation({
    mutationFn: (data: ProductForm) =>
      editing
        ? api.patch(`/products/${editing.id}`, data)
        : api.post('/products', data),
    onSuccess: () => {
      toast(editing ? 'Producto actualizado' : 'Producto guardado', 'success');
      invalidate();
      closeForm();
    },
    onError: () => {
      toast('Error al guardar el producto', 'danger');
    },
  });

  const toggleActive = useMutation({
    mutationFn: (product: Product) =>
      product.isActive
        ? api.delete(`/products/${product.id}`)
        : api.patch(`/products/${product.id}`, { isActive: true }),
    onSuccess: () => {
      toast('Estado actualizado', 'success');
      invalidate();
      setToggleConfirmId(null);
    },
    onError: () => {
      toast('Error al cambiar el estado', 'danger');
    },
  });

  const uploadImage = useMutation({
    mutationFn: async ({ product, file }: { product: Product; file: File }) => {
      const { data } = await api.post<{
        data: { imageKey: string; signedUrl: string; token: string };
      }>(`/products/${product.id}/image/upload-url`, {
        contentType: file.type,
      });
      const { imageKey, signedUrl } = data.data;
      await axios.put(signedUrl, file, {
        headers: { 'Content-Type': file.type },
      });
      await api.patch(`/products/${product.id}`, { imageKey });
    },
    onSuccess: invalidate,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductForm>({ resolver: zodResolver(productSchema) });

  const openCreate = () => {
    setEditing(null);
    reset({
      sku: '',
      name: '',
      categoryId: '',
      unitPrice: 0,
      taxRate: undefined,
      marginPercentage: undefined,
      minStock: 0,
    });
    setFormOpen(true);
  };
  const openEdit = (product: Product) => {
    setEditing(product);
    reset({
      sku: product.sku,
      name: product.name,
      categoryId: product.category.id,
      unitPrice: Number(product.unitPrice),
      taxRate: Number(product.taxRate),
      marginPercentage: Number(product.marginPercentage),
      minStock: product.minStock,
    });
    setFormOpen(true);
  };
  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    reset();
  };

  const serverError =
    save.error instanceof AxiosError
      ? (save.error.response?.data?.message as string)
      : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 font-semibold">Productos</h1>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus size={20} strokeWidth={1.5} aria-hidden />
            Nuevo producto
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            placeholder="Buscar por nombre o SKU…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            aria-label="Buscar productos"
          />
        </div>
        <select
          className="h-10 rounded-sm border border-border bg-surface-sunken px-3 text-body text-ink focus-visible:border-brand-copper"
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          aria-label="Filtrar por categoría"
        >
          <option value="">Todas las categorías</option>
          {categoriesQuery.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-body text-muted">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => {
              setLowStockOnly(e.target.checked);
              setPage(1);
            }}
            className="h-4 w-4 accent-[var(--brand-copper)]"
          />
          Solo stock bajo
        </label>
      </div>

      <Card>
        <CardContent className="table-scroll p-0">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="table-head-cell px-4 py-2.5 text-left">Imagen</th>
                <th className="table-head-cell px-4 py-2.5 text-left">SKU</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Nombre</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Categoría</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Precio</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Stock</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Estado</th>
                {isAdmin && (
                  <th className="table-head-cell px-4 py-2.5 text-right">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {productsQuery.data?.data.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-border transition-colors hover:bg-surface-sunken"
                >
                  <td className="px-4 py-2.5">
                    <ProductImage product={product} />
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted">{product.sku}</td>
                  <td className="px-4 py-2.5 font-medium">{product.name}</td>
                  <td className="px-4 py-2.5 text-muted">{product.category.name}</td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatCurrency(product.unitPrice)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {product.currentStock}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-col items-start gap-1">
                      {stockBadge(product)}
                      {!product.isActive && <Badge variant="danger">Inactivo</Badge>}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(product)}
                        aria-label={`Editar ${product.name}`}
                      >
                        <Pencil size={16} strokeWidth={1.5} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (product.isActive) {
                            setToggleAction('deactivate');
                          } else {
                            setToggleAction('reactivate');
                          }
                          setToggleConfirmId(product.id);
                        }}
                        aria-label={
                          product.isActive
                            ? `Desactivar ${product.name}`
                            : `Reactivar ${product.name}`
                        }
                      >
                        {product.isActive ? (
                          <UserX size={16} strokeWidth={1.5} />
                        ) : (
                          <UserCheck size={16} strokeWidth={1.5} />
                        )}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {productsQuery.data?.data.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 8 : 7}
                    className="px-4 py-8 text-center text-muted"
                  >
                    No hay productos que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {productsQuery.data?.meta && (
            <PaginationControls
              page={productsQuery.data.meta.page}
              limit={productsQuery.data.meta.limit}
              total={productsQuery.data.meta.total}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Editar producto' : 'Nuevo producto'}
      >
        <form
          onSubmit={handleSubmit((data) => save.mutate(data))}
          className="flex flex-col gap-4"
          noValidate
        >
          {serverError && (
            <p
              role="alert"
              className="rounded-sm bg-status-danger/10 px-3 py-2 text-small text-status-danger"
            >
              {serverError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" error={!!errors.sku} {...register('sku')} />
              <FieldError message={errors.sku?.message} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="categoryId">Categoría</Label>
              <select
                id="categoryId"
                className="h-10 rounded-sm border border-border bg-surface-sunken px-3 text-body text-ink focus-visible:border-brand-copper"
                {...register('categoryId')}
              >
                <option value="">Seleccione…</option>
                {categoriesQuery.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <FieldError message={errors.categoryId?.message} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" error={!!errors.name} {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="unitPrice">Precio de venta</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                min="0"
                error={!!errors.unitPrice}
                {...register('unitPrice')}
              />
              <FieldError message={errors.unitPrice?.message} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="minStock">Stock mínimo</Label>
              <Input
                id="minStock"
                type="number"
                step="1"
                min="0"
                {...register('minStock')}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="taxRate">Impuesto % (vacío = default)</Label>
              <Input
                id="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register('taxRate')}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="marginPercentage">Margen % (vacío = default)</Label>
              <Input
                id="marginPercentage"
                type="number"
                step="0.01"
                min="0"
                {...register('marginPercentage')}
              />
            </div>
          </div>

          {editing && (
            <div className="flex items-center gap-3">
              <ProductImage product={editing} />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage.mutate({ product: editing, file });
                  e.target.value = '';
                }}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={uploadImage.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus size={16} strokeWidth={1.5} aria-hidden />
                {uploadImage.isPending ? 'Subiendo…' : 'Cambiar imagen'}
              </Button>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeForm}>
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toggleConfirmId}
        onClose={() => setToggleConfirmId(null)}
        onConfirm={() => {
          const product = productsQuery.data?.data.find((p) => p.id === toggleConfirmId);
          if (product) {
            toggleActive.mutate(product);
          }
        }}
        isPending={toggleActive.isPending}
        title={toggleAction === 'deactivate' ? 'Desactivar producto' : 'Reactivar producto'}
        message={
          toggleAction === 'deactivate'
            ? `¿Está seguro de desactivar este producto? Se ocultará de la lista pero no se eliminará.`
            : `¿Está seguro de reactivar este producto?`
        }
        confirmText=""
        setConfirmText={() => {}}
      />
    </div>
  );
}
