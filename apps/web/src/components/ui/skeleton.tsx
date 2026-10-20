import { cn } from '@/lib/utils';

// Marcador de carga reutilizable (rectángulo animado)
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-sm bg-surface-sunken', className)}
    />
  );
}
