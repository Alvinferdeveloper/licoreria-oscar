import { AlertCircle } from 'lucide-react';

// Mensaje de error de validación con ícono — nunca solo color (accesibilidad)
export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-small text-status-danger" role="alert">
      <AlertCircle size={14} aria-hidden />
      {message}
    </p>
  );
}
