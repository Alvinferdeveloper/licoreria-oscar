import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { UserRole } from '@licoreria/shared-types';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from '@/stores/toast.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { FieldError } from '@/components/FieldError';
import { PaginationControls } from '@/components/PaginationControls';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface Category {
  id: string;
  name: string;
  description: string | null;
  _count: { products: number };
}

const categorySchema = z.object({
  name: z.string().min(1, 'Nombre requerido').max(80),
  description: z.string().max(255).optional(),
});
type CategoryForm = z.infer<typeof categorySchema>;

export function CategoriesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === UserRole.ADMIN;
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Category | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const categoriesQuery = useQuery({
    queryKey: ['categories', page],
    queryFn: () =>
      api
        .get<{ data: Category[]; meta: { page: number; limit: number; total: number } }>(
          '/categories',
          { params: { page, limit: 20 } },
        )
        .then((r) => r.data),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['categories'] });

  const save = useMutation({
    mutationFn: (data: CategoryForm) =>
      editing
        ? api.patch(`/categories/${editing.id}`, data)
        : api.post('/categories', data),
    onSuccess: () => {
      toast('Categoría guardada correctamente', 'success');
      invalidate();
      closeForm();
    },
    onError: () => {
      toast('Error al guardar la categoría', 'danger');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      toast('Categoría eliminada', 'success');
      invalidate();
      setDeleteConfirmId(null);
      setDeleteConfirmText('');
    },
    onError: () => {
      toast('Error al eliminar la categoría', 'danger');
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryForm>({ resolver: zodResolver(categorySchema) });

  const openCreate = () => {
    setEditing(null);
    reset({ name: '', description: '' });
    setFormOpen(true);
  };
  const openEdit = (category: Category) => {
    setEditing(category);
    reset({ name: category.name, description: category.description ?? '' });
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
        <h1 className="text-h1 font-semibold">Categorías</h1>
        {isAdmin && (
          <Button onClick={openCreate}>
            <Plus size={20} strokeWidth={1.5} aria-hidden />
            Nueva categoría
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="table-scroll p-0">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="table-head-cell px-4 py-2.5 text-left">Nombre</th>
                <th className="table-head-cell px-4 py-2.5 text-left">
                  Descripción
                </th>
                <th className="table-head-cell px-4 py-2.5 text-right">
                  Productos
                </th>
                {isAdmin && (
                  <th className="table-head-cell px-4 py-2.5 text-right">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {categoriesQuery.data?.data.map((category) => (
                <tr
                  key={category.id}
                  className="border-b border-border transition-colors hover:bg-surface-sunken"
                >
                  <td className="px-4 py-2.5 font-medium">{category.name}</td>
                  <td className="px-4 py-2.5 text-muted">
                    {category.description ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {category._count.products}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(category)}
                        aria-label={`Editar ${category.name}`}
                      >
                        <Pencil size={16} strokeWidth={1.5} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setDeleteConfirmId(category.id);
                          setDeleteConfirmText('');
                        }}
                        disabled={category._count.products > 0}
                        aria-label={`Eliminar ${category.name}`}
                      >
                        <Trash2 size={16} strokeWidth={1.5} />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {categoriesQuery.data?.data.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 4 : 3}
                    className="px-4 py-8 text-center text-muted"
                  >
                    No hay categorías registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {categoriesQuery.data?.meta && (
            <PaginationControls
              page={categoriesQuery.data.meta.page}
              limit={categoriesQuery.data.meta.limit}
              total={categoriesQuery.data.meta.total}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
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
            <Label htmlFor="description">Descripción</Label>
            <Input
              id="description"
              error={!!errors.description}
              {...register('description')}
            />
            <FieldError message={errors.description?.message} />
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
        open={!!deleteConfirmId}
        onClose={() => {
          setDeleteConfirmId(null);
          setDeleteConfirmText('');
        }}
        onConfirm={() => {
          if (deleteConfirmId) {
            remove.mutate(deleteConfirmId);
          }
        }}
        isPending={remove.isPending}
        title="Eliminar categoría"
        message="¿Está seguro de eliminar esta categoría? Esta acción no se puede deshacer."
        confirmWord="ELIMINAR"
        confirmText={deleteConfirmText}
        setConfirmText={setDeleteConfirmText}
      />
    </div>
  );
}
