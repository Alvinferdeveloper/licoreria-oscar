import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { Pencil, Plus, Ban, RotateCcw } from 'lucide-react';
import { UserRole } from '@licoreria/shared-types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/stores/toast.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TableState } from '@/components/TableState';
import { Modal } from '@/components/ui/modal';
import { FieldError } from '@/components/FieldError';
import { PaginationControls } from '@/components/PaginationControls';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface Supplier {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
}

const supplierSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(120, 'El nombre no puede superar los 120 caracteres'),
  contactName: z
    .string()
    .max(120, 'El nombre de contacto no puede superar los 120 caracteres')
    .optional(),
  phone: z
    .string()
    .max(30, 'El teléfono no puede superar los 30 caracteres')
    .optional(),
  email: z
    .string()
    .email('Ingrese un email válido')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(255, 'La dirección no puede superar los 255 caracteres')
    .optional(),
});
type SupplierForm = z.infer<typeof supplierSchema>;

export function SuppliersPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toggleConfirmId, setToggleConfirmId] = useState<string | null>(null);
  const [toggleAction, setToggleAction] = useState<'deactivate' | 'reactivate'>('deactivate');

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', page],
    queryFn: () =>
      api
        .get<{ data: Supplier[]; meta: { page: number; limit: number; total: number } }>(
          '/suppliers',
          { params: { page, limit: 20, includeInactive: true } },
        )
        .then((r) => r.data),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });

  const save = useMutation({
    mutationFn: (data: SupplierForm) =>
      editing
        ? api.patch(`/suppliers/${editing.id}`, data)
        : api.post('/suppliers', data),
    onSuccess: () => {
      toast('Proveedor guardado correctamente', 'success');
      invalidate();
      closeForm();
    },
  });

  const toggleActive = useMutation({
    mutationFn: (supplier: Supplier) =>
      supplier.isActive
        ? api.delete(`/suppliers/${supplier.id}`)
        : api.patch(`/suppliers/${supplier.id}`, { isActive: true }),
    onSuccess: () => {
      toast('Estado actualizado', 'success');
      invalidate();
      setToggleConfirmId(null);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierForm>({ resolver: zodResolver(supplierSchema) });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', contactName: '', phone: '', email: '', address: '' });
    setFormOpen(true);
  };
  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    reset({
      name: supplier.name,
      contactName: supplier.contactName ?? '',
      phone: supplier.phone ?? '',
      email: supplier.email ?? '',
      address: supplier.address ?? '',
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
        <h1 className="text-h1 font-semibold">Proveedores</h1>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus size={20} strokeWidth={1.5} aria-hidden />
            Nuevo proveedor
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="table-scroll p-0">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="table-head-cell px-4 py-2.5 text-left">Nombre</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Contacto</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Teléfono</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Email</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Estado</th>
                {isAdmin && (
                  <th className="table-head-cell px-4 py-2.5 text-right">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {suppliersQuery.data?.data.map((supplier) => (
                <tr
                  key={supplier.id}
                  className="border-b border-border transition-colors hover:bg-surface-sunken"
                >
                  <td className="px-4 py-2.5 font-medium">{supplier.name}</td>
                  <td className="px-4 py-2.5 text-muted">
                    {supplier.contactName ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted">
                    {supplier.phone ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{supplier.email ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={supplier.isActive ? 'success' : 'danger'}>
                      {supplier.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(supplier)}
                        aria-label={`Editar ${supplier.name}`}
                      >
                        <Pencil size={16} strokeWidth={1.5} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={toggleActive.isPending}
                        onClick={() => {
                          if (supplier.isActive) {
                            setToggleAction('deactivate');
                          } else {
                            setToggleAction('reactivate');
                          }
                          setToggleConfirmId(supplier.id);
                        }}
                        aria-label={
                          supplier.isActive
                            ? `Desactivar ${supplier.name}`
                            : `Reactivar ${supplier.name}`
                        }
                      >
                        {supplier.isActive ? (
                          <Ban size={16} strokeWidth={1.5} />
                        ) : (
                          <RotateCcw size={16} strokeWidth={1.5} />
                        )}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              <TableState
                colSpan={isAdmin ? 6 : 5}
                isLoading={suppliersQuery.isPending}
                isError={suppliersQuery.isError}
                isEmpty={suppliersQuery.data?.data.length === 0}
                emptyMessage="No hay proveedores registrados."
              />
            </tbody>
          </table>
          {suppliersQuery.data?.meta && (
            <PaginationControls
              page={suppliersQuery.data.meta.page}
              limit={suppliersQuery.data.meta.limit}
              total={suppliersQuery.data.meta.total}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Editar proveedor' : 'Nuevo proveedor'}
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="name" required>
              Nombre
            </Label>
            <Input
              id="name"
              placeholder="Ej. Distribuidora La Cava"
              error={!!errors.name}
              {...register('name')}
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contactName">Nombre de contacto</Label>
            <Input
              id="contactName"
              placeholder="Ej. María López"
              error={!!errors.contactName}
              {...register('contactName')}
            />
            <FieldError message={errors.contactName?.message} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                placeholder="Ej. 2222 3333"
                error={!!errors.phone}
                {...register('phone')}
              />
              <FieldError message={errors.phone?.message} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ej. ventas@proveedor.com"
                error={!!errors.email}
                {...register('email')}
              />
              <FieldError message={errors.email?.message} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              placeholder="Ej. Managua, barrio Bolonia"
              error={!!errors.address}
              {...register('address')}
            />
            <FieldError message={errors.address?.message} />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending
                ? 'Guardando…'
                : editing
                  ? 'Guardar cambios'
                  : 'Crear proveedor'}
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
          const supplier = suppliersQuery.data?.data.find((s) => s.id === toggleConfirmId);
          if (supplier) toggleActive.mutate(supplier);
        }}
        isPending={toggleActive.isPending}
        title={toggleAction === 'deactivate' ? 'Desactivar proveedor' : 'Reactivar proveedor'}
        message={
          toggleAction === 'deactivate'
            ? `¿Está seguro de desactivar este proveedor?`
            : `¿Está seguro de reactivar este proveedor?`
        }
        confirmText=""
        setConfirmText={() => {}}
      />
    </div>
  );
}
