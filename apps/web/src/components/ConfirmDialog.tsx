import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  title: string;
  message: string;
  confirmWord?: string;
  confirmText?: string;
  setConfirmText?: (text: string) => void;
  variant?: 'destructive' | 'secondary';
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  title,
  message,
  confirmWord,
  confirmText,
  setConfirmText,
  variant = 'destructive',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    if (!confirmWord || !confirmText || confirmText === confirmWord) {
      onConfirm();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-sm bg-status-warning/10 px-3 py-2 text-small text-status-warning">
          <AlertTriangle size={20} strokeWidth={1.5} className="mt-0.5 shrink-0" />
          <p>{message}</p>
        </div>
        {confirmWord && (
          <>
            <p className="text-small text-muted">
              Escriba <span className="font-mono font-medium">{confirmWord}</span> en el campo:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText?.(e.target.value)}
              placeholder={confirmWord}
              autoFocus
              aria-label="Palabra de confirmación"
            />
          </>
        )}
        <div className="flex gap-3">
          <Button
            variant={variant}
            disabled={(confirmWord && (!confirmText || confirmText !== confirmWord)) || isPending}
            onClick={handleConfirm}
          >
            {isPending ? 'Procesando…' : 'Confirmar'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
