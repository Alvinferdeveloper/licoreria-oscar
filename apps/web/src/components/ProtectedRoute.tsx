import { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { UserRole } from '@licoreria/shared-types';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore, applyTheme } from '@/stores/theme.store';

// El frontend oculta rutas por UX; el backend es quien realmente autoriza
export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

export function ThemeApplier({ children }: { children: React.ReactNode }) {
  const dark = useThemeStore((s) => s.dark);
  useEffect(() => {
    applyTheme(dark);
  }, [dark]);
  return <>{children}</>;
}
