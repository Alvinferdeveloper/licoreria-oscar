import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { Pencil, Plus, Search, UserX, UserCheck } from 'lucide-react';
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

interface Customer {
  id: string;
  name: string;
  documentId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
}

const customerSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(120, 'El nombre no puede superar los 120 caracteres'),
  documentId: z
    .string()
    .max(30, 'El documento no puede superar los 30 caracteres')
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
type CustomerForm = z.infer<typeof customerSchema>;

const CAN_MANAGE = [UserRole.ADMIN, UserRole.VENDEDOR];

export function CustomersPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = user && CAN_MANAGE.includes(user.role);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toggleConfirmId, setToggleConfirmId] = useState<string | null>(null);
  const [toggleAction, setToggleAction] = useState<'deactivate' | 'reactivate'>('deactivate');

  const customersQuery = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () =>
      api
        .get<{ data: Customer[]; meta: { page: number; limit: number; total: number } }>(
          '/customers',
          { params: { page, limit: 20, search: search || undefined, includeInactive: true } },
        )
        .then((r) => r.data),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['customers'] });

  const save = useMutation({
    mutationFn: (data: CustomerForm) =>
      editing
        ? api.patch(`/customers/${editing.id}`, data)
        : api.post('/customers', data),
    onSuccess: () => {
      toast('Cliente guardado correctamente', 'success');
      invalidate();
      closeForm();
    },
  });

  const toggleActive = useMutation({
    mutationFn: (customer: Customer) =>
      customer.isActive
        ? api.delete(`/customers/${customer.id}`)
        : api.patch(`/customers/${customer.id}`, { isActive: true }),
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
  } = useForm<CustomerForm>({ resolver: zodResolver(customerSchema) });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', documentId: '', phone: '', email: '', address: '' });
    setFormOpen(true);
  };
  const openEdit = (customer: Customer) => {
    setEditing(customer);
    reset({
      name: customer.name,
      documentId: customer.documentId ?? '',
      phone: customer.phone ?? '',
      email: customer.email ?? '',
      address: customer.address ?? '',
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
        <h1 className="text-h1 font-semibold">Clientes</h1>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus size={20} strokeWidth={1.5} aria-hidden />
            Nuevo cliente
          </Button>
        )}
      </div>

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <Input
          placeholder="Buscar por nombre o documento…"
          className="pl-9"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          aria-label="Buscar clientes"
        />
      </div>

      <Card>
        <CardContent className="table-scroll p-0">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="table-head-cell px-4 py-2.5 text-left">Nombre</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Documento</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Teléfono</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Email</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Estado</th>
                {canManage && (
                  <th className="table-head-cell px-4 py-2.5 text-right">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {customersQuery.data?.data.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-border transition-colors hover:bg-surface-sunken"
                >
                  <td className="px-4 py-2.5 font-medium">{customer.name}</td>
                  <td className="px-4 py-2.5 font-mono text-muted">
                    {customer.documentId ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted">
                    {customer.phone ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-muted">{customer.email ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant={customer.isActive ? 'success' : 'danger'}>
                      {customer.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  {canManage && (
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(customer)}
                        aria-label={`Editar ${customer.name}`}
                      >
                        <Pencil size={16} strokeWidth={1.5} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={toggleActive.isPending}
                        onClick={() => {
                          if (customer.isActive) {
                            setToggleAction('deactivate');
                          } else {
                            setToggleAction('reactivate');
                          }
                          setToggleConfirmId(customer.id);
                        }}
                        aria-label={
                          customer.isActive
                            ? `Desactivar ${customer.name}`
                            : `Reactivar ${customer.name}`
                        }
                      >
                        {customer.isActive ? (
                          <UserX size={16} strokeWidth={1.5} />
                        ) : (
                          <UserCheck size={16} strokeWidth={1.5} />
                        )}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              <TableState
                colSpan={canManage ? 6 : 5}
                isLoading={customersQuery.isPending}
                isError={customersQuery.isError}
                isEmpty={customersQuery.data?.data.length === 0}
                emptyMessage="No hay clientes registrados."
              />
            </tbody>
          </table>
          {customersQuery.data?.meta && (
            <PaginationControls
              page={customersQuery.data.meta.page}
              limit={customersQuery.data.meta.limit}
              total={customersQuery.data.meta.total}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Editar cliente' : 'Nuevo cliente'}
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
              placeholder="Ej. Juan Pérez"
              error={!!errors.name}
              {...register('name')}
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="documentId">RUC / Cédula</Label>
              <Input
                id="documentId"
                placeholder="Ej. 001-010190-0001A"
                error={!!errors.documentId}
                {...register('documentId')}
              />
              <FieldError message={errors.documentId?.message} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                placeholder="Ej. 8888 8888"
                error={!!errors.phone}
                {...register('phone')}
              />
              <FieldError message={errors.phone?.message} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Ej. cliente@correo.com"
              error={!!errors.email}
              {...register('email')}
            />
            <FieldError message={errors.email?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              placeholder="Ej. Managua, km 5 carretera sur"
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
                  : 'Crear cliente'}
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
          const customer = customersQuery.data?.data.find((c) => c.id === toggleConfirmId);
          if (customer) toggleActive.mutate(customer);
        }}
        isPending={toggleActive.isPending}
        title={toggleAction === 'deactivate' ? 'Desactivar cliente' : 'Reactivar cliente'}
        message={
          toggleAction === 'deactivate'
            ? `¿Está seguro de desactivar este cliente?`
            : `¿Está seguro de reactivar este cliente?`
        }
        confirmText=""
        setConfirmText={() => {}}
      />
    </div>
  );
}
