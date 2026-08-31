import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Badge de estado: pill con fondo semántico al 12% y texto a opacidad completa
const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-small font-medium',
  {
    variants: {
      variant: {
        success: 'bg-status-success/10 text-status-success',
        danger: 'bg-status-danger/10 text-status-danger',
        warning: 'bg-status-warning/10 text-status-warning',
        info: 'bg-status-info/10 text-status-info',
        neutral: 'bg-surface-sunken text-muted',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
