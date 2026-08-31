import * as React from 'react';
import { cn } from '@/lib/utils';

// Input base: fondo sunken, foco con borde cobre + outline (accesibilidad)
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(({ className, error, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-sm border border-border bg-surface-sunken px-3 text-body text-ink',
      'placeholder:text-muted transition-colors duration-150',
      'focus-visible:border-brand-copper focus-visible:outline-2 focus-visible:outline-brand-copper/30',
      'disabled:cursor-not-allowed disabled:opacity-50',
      error && 'border-status-danger',
      className,
    )}
    aria-invalid={error || undefined}
    {...props}
  />
));
Input.displayName = 'Input';

export { Input };
