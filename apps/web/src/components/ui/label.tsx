import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '@/lib/utils';

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    required?: boolean;
  }
>(({ className, required, children, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-small font-medium text-muted', className)}
    {...props}
  >
    {children}
    {required && (
      <>
        {' '}
        <span aria-hidden className="text-status-danger">
          *
        </span>
      </>
    )}
  </LabelPrimitive.Root>
));
Label.displayName = 'Label';

export { Label };
