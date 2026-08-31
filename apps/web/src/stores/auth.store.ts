import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserRole } from '@licoreria/shared-types';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: SessionUser | null;
  accessToken: string | null;
  setSession: (user: SessionUser, accessToken: string) => void;
  clearSession: () => void;
}

// Estado de sesión del lado del cliente. El usuario persiste en
// localStorage para sobrevivir recargas; el access token también, el
// refresh token nunca (vive en httpOnly cookie).
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setSession: (user, accessToken) => set({ user, accessToken }),
      clearSession: () => set({ user: null, accessToken: null }),
    }),
    { name: 'licoreria-auth' },
  ),
);
