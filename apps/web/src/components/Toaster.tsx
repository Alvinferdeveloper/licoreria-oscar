import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToastStore, ToastVariant } from '@/stores/toast.store';
import { cn } from '@/lib/utils';

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-status-success/40 text-status-success',
  danger: 'border-status-danger/40 text-status-danger',
  info: 'border-status-info/40 text-status-info',
};

const VARIANT_ICONS: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle2,
  danger: XCircle,
  info: Info,
};

// Toasts de confirmación/error, arriba-derecha, auto-dismiss
export function Toaster() {
  const { toasts, dismiss } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed right-4 top-4 z-[60] flex w-80 flex-col gap-2"
    >
      {toasts.map((t) => {
        const Icon = VARIANT_ICONS[t.variant];
        return (
          <div
            key={t.id}
            className={cn(
              'flex items-start gap-2 rounded-md border bg-surface-card px-3 py-2.5 shadow-elevation-1',
              'animate-[modal-in_200ms_ease-out]',
              VARIANT_STYLES[t.variant],
            )}
          >
            <Icon size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
            <p className="flex-1 text-body text-ink">{t.message}</p>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar notificación"
              className="rounded-sm p-0.5 text-muted hover:text-ink"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
