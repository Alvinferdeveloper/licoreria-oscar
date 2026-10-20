import { AlertTriangle, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TableStateProps {
  colSpan: number;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  errorMessage?: string;
  skeletonRows?: number;
}

// Estado unificado de una tabla: carga (skeleton), error o vacío.
// Se renderiza dentro del <tbody>, después del map de filas.
export function TableState({
  colSpan,
  isLoading,
  isError,
  isEmpty,
  emptyMessage,
  errorMessage = 'No se pudieron cargar los datos. Intente de nuevo.',
  skeletonRows = 5,
}: TableStateProps) {
  if (isLoading) {
    return (
      <>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <tr key={i} className="border-b border-border">
            <td colSpan={colSpan} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          </tr>
        ))}
      </>
    );
  }

  if (isError) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-4 py-8 text-center">
          <span className="inline-flex items-center gap-2 text-status-danger">
            <AlertTriangle size={16} aria-hidden />
            {errorMessage}
          </span>
        </td>
      </tr>
    );
  }

  if (isEmpty) {
    return (
      <tr>
        <td colSpan={colSpan} className="px-4 py-8 text-center text-muted">
          <span className="inline-flex items-center gap-2">
            <Inbox size={16} aria-hidden />
            {emptyMessage}
          </span>
        </td>
      </tr>
    );
  }

  return null;
}
