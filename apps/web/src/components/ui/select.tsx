import * as React from 'react';
import { cn } from '@/lib/utils';

// Select base: mismo chrome y foco cobre visible que <Input> (no negociable)
const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }
>(({ className, error, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'flex h-10 w-full rounded-sm border border-border bg-surface-sunken px-3 text-body text-ink',
      'transition-colors duration-150',
      'focus-visible:border-brand-copper focus-visible:outline-2 focus-visible:outline-brand-copper/30',
      'disabled:cursor-not-allowed disabled:opacity-50',
      error && 'border-status-danger',
      className,
    )}
    aria-invalid={error || undefined}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

export { Select };
