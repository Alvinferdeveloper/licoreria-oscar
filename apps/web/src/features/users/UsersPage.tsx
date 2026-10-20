import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { Pencil, Plus, UserX, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/stores/toast.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TableState } from '@/components/TableState';
import { Modal } from '@/components/ui/modal';
import { FieldError } from '@/components/FieldError';
import { PaginationControls } from '@/components/PaginationControls';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatDate } from '@/lib/utils';

interface Role {
  id: string;
  name: string;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  role: { id: string; name: string };
}

const createSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(100, 'El nombre no puede superar los 100 caracteres'),
  email: z.string().email('Ingrese un email válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres'),
  roleId: z.string().uuid('Seleccione un rol'),
});

// En edición la contraseña es opcional: vacía = no cambiar
const editSchema = createSchema.extend({
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .optional()
    .or(z.literal('')),
});

type UserForm = z.infer<typeof editSchema>;

export function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [toggleConfirmId, setToggleConfirmId] = useState<string | null>(null);
  const [toggleAction, setToggleAction] = useState<'deactivate' | 'reactivate'>('deactivate');

  const usersQuery = useQuery({
    queryKey: ['users', page],
    queryFn: () =>
      api
        .get<{ data: UserRow[]; meta: { page: number; limit: number; total: number } }>(
          '/users',
          { params: { page, limit: 20 } },
        )
        .then((r) => r.data),
  });

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<{ data: Role[] }>('/roles').then((r) => r.data.data),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['users'] });

  const save = useMutation({
    mutationFn: (data: UserForm) => {
      const payload = {
        ...data,
        password: data.password || undefined,
      };
      return editing
        ? api.patch(`/users/${editing.id}`, payload)
        : api.post('/users', payload);
    },
    onSuccess: () => {
      toast('Usuario guardado correctamente', 'success');
      invalidate();
      closeForm();
    },
  });

  const toggleActive = useMutation({
    mutationFn: (user: UserRow) =>
      user.isActive
        ? api.delete(`/users/${user.id}`)
        : api.patch(`/users/${user.id}`, { isActive: true }),
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
  } = useForm<UserForm>({
    resolver: zodResolver(editing ? editSchema : createSchema),
  });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', email: '', password: '', roleId: '' });
    setFormOpen(true);
  };
  const openEdit = (user: UserRow) => {
    setEditing(user);
    reset({
      name: user.name,
      email: user.email,
      password: '',
      roleId: user.role.id,
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
        <h1 className="text-h1 font-semibold">Usuarios</h1>
        <Button onClick={openCreate}>
          <Plus size={20} strokeWidth={1.5} aria-hidden />
          Nuevo usuario
        </Button>
      </div>

      <Card>
        <CardContent className="table-scroll p-0">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="table-head-cell px-4 py-2.5 text-left">Nombre</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Email</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Rol</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Estado</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Creado</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data?.data.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border transition-colors hover:bg-surface-sunken"
                >
                  <td className="px-4 py-2.5 font-medium">{row.name}</td>
                  <td className="px-4 py-2.5 text-muted">{row.email}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="info">{row.role.name}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={row.isActive ? 'success' : 'danger'}>
                      {row.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(row)}
                        aria-label={`Editar ${row.name}`}
                      >
                        <Pencil size={16} strokeWidth={1.5} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={currentUser?.id === row.id || toggleActive.isPending}
                        title={
                          currentUser?.id === row.id
                            ? 'No puede desactivar su propio usuario'
                            : undefined
                        }
                        onClick={() => {
                          if (row.isActive) {
                            setToggleAction('deactivate');
                          } else {
                            setToggleAction('reactivate');
                          }
                          setToggleConfirmId(row.id);
                        }}
                        aria-label={
                          currentUser?.id === row.id
                            ? 'No puede desactivar su propio usuario'
                            : row.isActive
                              ? `Desactivar ${row.name}`
                              : `Reactivar ${row.name}`
                        }
                      >
                        {row.isActive ? (
                          <UserX size={16} strokeWidth={1.5} />
                        ) : (
                          <UserCheck size={16} strokeWidth={1.5} />
                        )}
                      </Button>
                  </td>
                </tr>
              ))}
              <TableState
                colSpan={6}
                isLoading={usersQuery.isPending}
                isError={usersQuery.isError}
                isEmpty={usersQuery.data?.data.length === 0}
                emptyMessage="No hay usuarios registrados."
              />
            </tbody>
          </table>
          {usersQuery.data?.meta && (
            <PaginationControls
              page={usersQuery.data.meta.page}
              limit={usersQuery.data.meta.limit}
              total={usersQuery.data.meta.total}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? `Editar ${editing.name}` : 'Nuevo usuario'}
      >
        <form
          key={editing?.id ?? 'new'}
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
              placeholder="Ej. Ana Martínez"
              error={!!errors.name}
              {...register('name')}
            />
            <FieldError message={errors.name?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" required>
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Ej. ana@licoreria.local"
              error={!!errors.email}
              {...register('email')}
            />
            <FieldError message={errors.email?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" required={!editing}>
              Contraseña{editing && ' (vacía = no cambiar)'}
            </Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              error={!!errors.password}
              {...register('password')}
            />
            <FieldError message={errors.password?.message} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="roleId" required>
              Rol
            </Label>
            <Select id="roleId" error={!!errors.roleId} {...register('roleId')}>
              <option value="">Seleccione…</option>
              {rolesQuery.data?.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
            <FieldError message={errors.roleId?.message} />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending
                ? 'Guardando…'
                : editing
                  ? 'Guardar cambios'
                  : 'Crear usuario'}
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
          const row = usersQuery.data?.data.find((u) => u.id === toggleConfirmId);
          if (row) toggleActive.mutate(row);
        }}
        isPending={toggleActive.isPending}
        title={toggleAction === 'deactivate' ? 'Desactivar usuario' : 'Reactivar usuario'}
        message={
          toggleAction === 'deactivate'
            ? `¿Está seguro de desactivar este usuario?`
            : `¿Está seguro de reactivar este usuario?`
        }
        confirmText=""
        setConfirmText={() => {}}
      />
    </div>
  );
}
