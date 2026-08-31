import { create } from 'zustand';

export type ToastVariant = 'success' | 'danger' | 'info';

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
const AUTO_DISMISS_MS = 4000;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (message, variant = 'info') => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, AUTO_DISMISS_MS);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// Atajo para usar fuera de componentes (interceptores, utilidades)
export const toast = (message: string, variant: ToastVariant = 'info') =>
  useToastStore.getState().push(message, variant);
