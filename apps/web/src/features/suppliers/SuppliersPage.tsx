import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { Pencil, Plus, UserX, UserCheck } from 'lucide-react';
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
  name: z.string().min(1, 'Nombre requerido').max(120),
  contactName: z.string().max(120).optional(),
  phone: z.string().max(30).optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  address: z.string().max(255).optional(),
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
    onError: () => {
      toast('Error al guardar el proveedor', 'danger');
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
    onError: () => {
      toast('Error al cambiar el estado', 'danger');
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
                          <UserX size={16} strokeWidth={1.5} />
                        ) : (
                          <UserCheck size={16} strokeWidth={1.5} />
                        )}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {suppliersQuery.data?.data.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 6 : 5}
                    className="px-4 py-8 text-center text-muted"
                  >
                    No hay proveedores registrados.
                  </td>
                </tr>
              )}
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
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" error={!!errors.name} {...register('name')} />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="contactName">Nombre de contacto</Label>
            <Input id="contactName" {...register('contactName')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input id="phone" {...register('phone')} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" error={!!errors.email} {...register('email')} />
              <FieldError message={errors.email?.message} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" {...register('address')} />
          </div>
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
