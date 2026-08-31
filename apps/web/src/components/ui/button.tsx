import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Variantes de botón del sistema: primario, secundario, destructivo y ghost
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-body font-medium transition-colors duration-150 ease-out focus-visible:outline-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-copper text-white hover:bg-brand-copper-strong',
        secondary:
          'bg-transparent border border-border text-ink hover:bg-surface-sunken',
        destructive:
          'bg-transparent border border-status-danger/40 text-status-danger hover:bg-status-danger/10',
        ghost: 'text-muted hover:bg-surface-sunken hover:text-ink',
      },
      size: {
        sm: 'h-8 px-3 text-small',
        md: 'h-10 px-4',
        lg: 'h-12 px-6',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
