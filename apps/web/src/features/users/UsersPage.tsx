import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { AlertCircle, Plus, UserX, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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

const createUserSchema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  roleId: z.string().uuid('Seleccione un rol'),
});
type CreateUserForm = z.infer<typeof createUserSchema>;

export function UsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () =>
      api.get<{ data: UserRow[] }>('/users').then((r) => r.data.data),
  });

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<{ data: Role[] }>('/roles').then((r) => r.data.data),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['users'] });

  const createUser = useMutation({
    mutationFn: (data: CreateUserForm) => api.post('/users', data),
    onSuccess: () => {
      invalidate();
      setShowForm(false);
      reset();
    },
  });

  const toggleActive = useMutation({
    mutationFn: (user: UserRow) =>
      user.isActive
        ? api.delete(`/users/${user.id}`)
        : api.patch(`/users/${user.id}`, { isActive: true }),
    onSuccess: invalidate,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>({ resolver: zodResolver(createUserSchema) });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 font-semibold">Usuarios</h1>
        <Button onClick={() => setShowForm((v) => !v)}>
          <Plus size={20} strokeWidth={1.5} aria-hidden />
          Nuevo usuario
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <h2 className="text-h2 font-semibold">Crear usuario</h2>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((data) => createUser.mutate(data))}
              className="grid grid-cols-1 gap-4 sm:grid-cols-2"
              noValidate
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" error={!!errors.name} {...register('name')} />
                {errors.name && (
                  <FieldError message={errors.name.message} />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  error={!!errors.email}
                  {...register('email')}
                />
                {errors.email && (
                  <FieldError message={errors.email.message} />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  error={!!errors.password}
                  {...register('password')}
                />
                {errors.password && (
                  <FieldError message={errors.password.message} />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="roleId">Rol</Label>
                <select
                  id="roleId"
                  className="h-10 rounded-sm border border-border bg-surface-sunken px-3 text-body text-ink focus-visible:border-brand-copper"
                  {...register('roleId')}
                >
                  <option value="">Seleccione…</option>
                  {rolesQuery.data?.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                {errors.roleId && (
                  <FieldError message={errors.roleId.message} />
                )}
              </div>
              <div className="flex gap-3 sm:col-span-2">
                <Button type="submit" disabled={createUser.isPending}>
                  {createUser.isPending ? 'Guardando…' : 'Guardar'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="table-head-cell px-4 py-2.5 text-left">
                  Nombre
                </th>
                <th className="table-head-cell px-4 py-2.5 text-left">Email</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Rol</th>
                <th className="table-head-cell px-4 py-2.5 text-left">
                  Estado
                </th>
                <th className="table-head-cell px-4 py-2.5 text-left">
                  Creado
                </th>
                <th className="table-head-cell px-4 py-2.5 text-right">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data?.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-border transition-colors hover:bg-surface-sunken"
                >
                  <td className="px-4 py-2.5 font-medium">{user.name}</td>
                  <td className="px-4 py-2.5 text-muted">{user.email}</td>
                  <td className="px-4 py-2.5">
                    <Badge variant="info">{user.role.name}</Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant={user.isActive ? 'success' : 'danger'}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive.mutate(user)}
                      aria-label={
                        user.isActive ? 'Desactivar usuario' : 'Reactivar usuario'
                      }
                    >
                      {user.isActive ? (
                        <UserX size={16} strokeWidth={1.5} />
                      ) : (
                        <UserCheck size={16} strokeWidth={1.5} />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
              {usersQuery.data?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No hay usuarios registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-small text-status-danger">
      <AlertCircle size={14} aria-hidden />
      {message}
    </p>
  );
}
