import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PaginationControls } from '@/components/PaginationControls';
import { TableState } from '@/components/TableState';
import { downloadExcel } from '@/features/reports/reports-utils';
import {
  AUDIT_ACTION_LABELS,
  auditActionLabel,
  auditEntityLabel,
  formatAuditMetadata,
} from './audit-labels';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface AuditContentProps {
  showTitle?: boolean;
}

export function AuditContent({ showTitle = true }: AuditContentProps) {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const usersQuery = useQuery({
    queryKey: ['users', 'options'],
    queryFn: () =>
      api
        .get<{ data: { id: string; name: string }[] }>('/users/options')
        .then((r) => r.data.data),
  });

  const auditQuery = useQuery({
    queryKey: ['audit', page, userId, action, startDate, endDate],
    queryFn: () =>
      api
        .get<{
          data: AuditLog[];
          meta: { page: number; limit: number; total: number };
        }>('/reports/audit', {
          params: {
            page,
            limit: 20,
            ...(userId ? { userId } : {}),
            ...(action.trim() ? { action: action.trim() } : {}),
            ...(startDate && endDate ? { startDate, endDate } : {}),
          },
        })
        .then((r) => r.data),
  });

  return (
    <div className="flex flex-col gap-6">
      {showTitle && <h1 className="text-h1 font-semibold">Auditoría</h1>}

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="auUser">Usuario</Label>
          <Select
            id="auUser"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-sm border border-border bg-surface-card px-3 text-body"
          >
            <option value="">Todos</option>
            {(usersQuery.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="auAction">Acción</Label>
          <Select
            id="auAction"
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            {Object.entries(AUDIT_ACTION_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="auStart">Desde</Label>
          <Input
            id="auStart"
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="auEnd">Hasta</Label>
          <Input
            id="auEnd"
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            downloadExcel('/reports/audit/export', 'auditoria.xlsx', {
              ...(userId ? { userId } : {}),
              ...(action ? { action } : {}),
              ...(startDate && endDate ? { startDate, endDate } : {}),
            })
          }
        >
          <FileDown size={16} strokeWidth={1.5} aria-hidden />
          Exportar Excel
        </Button>
      </div>

      <Card>
        <CardContent className="table-scroll p-0">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="table-head-cell px-4 py-2.5 text-left">Fecha</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Usuario</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Acción</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Entidad</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {auditQuery.data?.data.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-border transition-colors hover:bg-surface-sunken"
                >
                  <td className="px-4 py-2.5 font-mono text-muted">
                    {formatDateTime(log.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    {log.user.name}{' '}
                    <span className="text-small text-muted">{log.user.email}</span>
                  </td>
                  <td className="px-4 py-2.5">{auditActionLabel(log.action)}</td>
                  <td className="px-4 py-2.5 text-muted">
                    {auditEntityLabel(log.entity)}
                    {log.entityId ? (
                      <span className="font-mono text-small"> · {log.entityId.slice(0, 8)}…</span>
                    ) : null}
                  </td>
                  <td className="max-w-64 truncate px-4 py-2.5 text-small text-muted">
                    {formatAuditMetadata(log.metadata)}
                  </td>
                </tr>
              ))}
              <TableState
                colSpan={5}
                isLoading={auditQuery.isPending}
                isError={auditQuery.isError}
                isEmpty={auditQuery.data?.data.length === 0}
                emptyMessage="No hay registros de auditoría con esos filtros."
              />
            </tbody>
          </table>
          {auditQuery.data?.meta && (
            <PaginationControls
              page={auditQuery.data.meta.page}
              limit={auditQuery.data.meta.limit}
              total={auditQuery.data.meta.total}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
