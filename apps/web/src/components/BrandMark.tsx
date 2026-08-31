import { cn } from '@/lib/utils';

// Isotipo placeholder: silueta de botella en cobre sobre
// círculo cava. Reemplazable en un solo lugar cuando exista logo real.
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn('h-10 w-10', className)}
      role="img"
      aria-label="Marca"
    >
      <circle cx="24" cy="24" r="24" fill="var(--brand-cava)" />
      <path
        d="M21 10h6v6l3 4v16a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2V20l3-4v-6z"
        fill="var(--brand-copper)"
      />
      <rect x="21" y="8" width="6" height="3" rx="1" fill="var(--brand-copper)" />
    </svg>
  );
}
