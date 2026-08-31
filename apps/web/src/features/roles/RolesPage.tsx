import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface Permission {
  id: string;
  code: string;
  description: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  rolePermissions: { permission: Permission }[];
  _count: { users: number };
}

export function RolesPage() {
  const queryClient = useQueryClient();
  // Borrador local de permisos por rol mientras se edita
  const [drafts, setDrafts] = useState<Record<string, Set<string>>>({});

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<{ data: Role[] }>('/roles').then((r) => r.data.data),
  });

  const permissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: () =>
      api.get<{ data: Permission[] }>('/permissions').then((r) => r.data.data),
  });

  const save = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      api.put(`/roles/${roleId}/permissions`, { permissionIds }),
    onSuccess: (_res, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setDrafts((d) => {
        const next = { ...d };
        delete next[roleId];
        return next;
      });
    },
  });

  const currentIds = (role: Role): Set<string> =>
    drafts[role.id] ?? new Set(role.rolePermissions.map((rp) => rp.permission.id));

  const toggle = (roleId: string, permissionId: string, role: Role) => {
    const next = new Set(currentIds(role));
    if (next.has(permissionId)) {
      next.delete(permissionId);
    } else {
      next.add(permissionId);
    }
    setDrafts((d) => ({ ...d, [roleId]: next }));
  };

  const isDirty = (role: Role) => {
    const current = currentIds(role);
    const original = new Set(role.rolePermissions.map((rp) => rp.permission.id));
    if (current.size !== original.size) return true;
    for (const id of current) if (!original.has(id)) return true;
    return false;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-h1 font-semibold">Roles y permisos</h1>
        <p className="mt-1 text-body text-muted">
          Asigne o revoque permisos por rol. Los cambios aplican en el próximo
          request de cada usuario con ese rol.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {rolesQuery.data?.map((role) => (
          <Card key={role.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-h2 font-semibold">{role.name}</h2>
                  <Badge variant="info">{role._count.users} usuarios</Badge>
                </div>
                {role.description && (
                  <p className="mt-1 text-small text-muted">{role.description}</p>
                )}
              </div>
              <Button
                size="sm"
                disabled={!isDirty(role) || save.isPending}
                onClick={() =>
                  save.mutate({
                    roleId: role.id,
                    permissionIds: Array.from(currentIds(role)),
                  })
                }
              >
                <Save size={16} strokeWidth={1.5} aria-hidden />
                {save.isPending ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
                {permissionsQuery.data?.map((permission) => (
                  <label
                    key={permission.id}
                    className="flex items-center gap-2 text-body text-ink"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--brand-copper)]"
                      checked={currentIds(role).has(permission.id)}
                      onChange={() => toggle(role.id, permission.id, role)}
                    />
                    <span className="font-mono text-small">{permission.code}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
