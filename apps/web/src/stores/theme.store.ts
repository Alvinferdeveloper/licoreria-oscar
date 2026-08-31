import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  dark: boolean;
  toggle: () => void;
}

// Default inicial: prefers-color-scheme del sistema operativo
const prefersDark =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      dark: prefersDark,
      toggle: () => set((s) => ({ dark: !s.dark })),
    }),
    { name: 'licoreria-theme' },
  ),
);

export function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle('dark', dark);
}
