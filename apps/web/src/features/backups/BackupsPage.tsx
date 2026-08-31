import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import {
  AlertTriangle,
  DatabaseBackup,
  Download,
  Upload,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { PaginationControls } from '@/components/PaginationControls';
import { formatDateTime } from '@/lib/utils';

interface BackupRow {
  id: string;
  filename: string;
  sizeBytes: number;
  createdAt: string;
  createdBy: string;
  type: 'MANUAL' | 'SCHEDULED';
}

const CONFIRM_WORD = 'RESTAURAR';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function errorMessage(error: unknown) {
  return error instanceof AxiosError
    ? ((error.response?.data?.message as string) ?? 'Error inesperado')
    : 'Error inesperado';
}

export function BackupsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [confirmStep, setConfirmStep] = useState<1 | 2 | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [restoreOk, setRestoreOk] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const backupsQuery = useQuery({
    queryKey: ['backups', page],
    queryFn: () =>
      api
        .get<{ data: BackupRow[]; meta: { page: number; limit: number; total: number } }>(
          '/backups',
          { params: { page, limit: 20 } },
        )
        .then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: () => api.post('/backups'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });

  const restore = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return api.post('/backups/restore', form);
    },
    onSuccess: () => {
      // La restauración reemplaza todos los datos: se invalida todo el cache
      queryClient.invalidateQueries();
      closeConfirm();
      clearFile();
      setRestoreOk(true);
    },
    onError: () => {
      closeConfirm();
    },
  });

  const download = async (backup: BackupRow) => {
    const res = await api.get(`/backups/${backup.id}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backup.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFile = () => {
    setRestoreFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const closeConfirm = () => {
    setConfirmStep(null);
    setConfirmText('');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 font-semibold">Respaldos</h1>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          <DatabaseBackup size={20} strokeWidth={1.5} aria-hidden />
          {create.isPending ? 'Generando…' : 'Nuevo respaldo'}
        </Button>
      </div>

      {create.error && (
        <p
          role="alert"
          className="rounded-sm bg-status-danger/10 px-3 py-2 text-small text-status-danger"
        >
          {errorMessage(create.error)}
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-body">
            <thead>
              <tr className="border-b border-border">
                <th className="table-head-cell px-4 py-2.5 text-left">Archivo</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Tamaño</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Tipo</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Creado por</th>
                <th className="table-head-cell px-4 py-2.5 text-left">Fecha</th>
                <th className="table-head-cell px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {backupsQuery.data?.data.map((backup) => (
                <tr
                  key={backup.id}
                  className="border-b border-border transition-colors hover:bg-surface-sunken"
                >
                  <td className="px-4 py-2.5 font-mono">{backup.filename}</td>
                  <td className="px-4 py-2.5 text-right font-mono">
                    {formatBytes(backup.sizeBytes)}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="info">
                      {backup.type === 'MANUAL' ? 'Manual' : 'Programado'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-muted">{backup.createdBy}</td>
                  <td className="px-4 py-2.5 font-mono text-muted">
                    {formatDateTime(backup.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => download(backup)}
                      aria-label={`Descargar ${backup.filename}`}
                    >
                      <Download size={16} strokeWidth={1.5} />
                    </Button>
                  </td>
                </tr>
              ))}
              {backupsQuery.data?.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No hay respaldos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {backupsQuery.data?.meta && (
            <PaginationControls
              page={backupsQuery.data.meta.page}
              limit={backupsQuery.data.meta.limit}
              total={backupsQuery.data.meta.total}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <h2 className="text-h2 font-semibold">Restaurar base de datos</h2>
          <p className="text-body text-muted">
            La restauración reemplaza <strong>todos los datos actuales</strong>{' '}
            por el contenido del archivo de respaldo. Esta operación no se puede
            deshacer.
          </p>

          {restoreOk && (
            <p
              role="status"
              className="rounded-sm bg-status-success/10 px-3 py-2 text-small text-status-success"
            >
              Base de datos restaurada correctamente. Es posible que deba
              iniciar sesión de nuevo.
            </p>
          )}
          {restore.error && (
            <p
              role="alert"
              className="rounded-sm bg-status-danger/10 px-3 py-2 text-small text-status-danger"
            >
              {errorMessage(restore.error)}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="restore-file">Archivo de respaldo (.dump)</Label>
            <Input
              id="restore-file"
              type="file"
              accept=".dump"
              ref={fileInputRef}
              onChange={(e) => {
                setRestoreFile(e.target.files?.[0] ?? null);
                setRestoreOk(false);
              }}
            />
          </div>
          <div>
            <Button
              variant="destructive"
              disabled={!restoreFile || restore.isPending}
              onClick={() => setConfirmStep(1)}
            >
              <Upload size={20} strokeWidth={1.5} aria-hidden />
              {restore.isPending ? 'Restaurando…' : 'Restaurar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmación paso 1: advertencia */}
      <Modal
        open={confirmStep === 1}
        onClose={closeConfirm}
        title="Restaurar base de datos"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 rounded-sm bg-status-warning/10 px-3 py-2 text-small text-status-warning">
            <AlertTriangle size={20} strokeWidth={1.5} className="mt-0.5 shrink-0" />
            <p>
              Está a punto de reemplazar todos los datos actuales con el
              contenido de <span className="font-mono">{restoreFile?.name}</span>
              . Los cambios posteriores al respaldo se perderán.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="destructive" onClick={() => setConfirmStep(2)}>
              Continuar
            </Button>
            <Button variant="secondary" onClick={closeConfirm}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirmación paso 2: escribir la palabra de confirmación */}
      <Modal
        open={confirmStep === 2}
        onClose={closeConfirm}
        title="Confirmación final"
      >
        <div className="flex flex-col gap-4">
          <p className="text-body">
            Para confirmar, escriba{' '}
            <span className="font-mono font-medium">{CONFIRM_WORD}</span> en el
            campo:
          </p>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={CONFIRM_WORD}
            autoFocus
            aria-label="Palabra de confirmación"
          />
          <div className="flex gap-3">
            <Button
              variant="destructive"
              disabled={confirmText !== CONFIRM_WORD || restore.isPending}
              onClick={() => restoreFile && restore.mutate(restoreFile)}
            >
              {restore.isPending ? 'Restaurando…' : 'Restaurar ahora'}
            </Button>
            <Button variant="secondary" onClick={closeConfirm}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
