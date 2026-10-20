import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tags,
  Truck,
  Users,
  UsersRound,
  ShieldCheck,
  ShoppingCart,
  ClipboardList,
  Receipt,
  FileBarChart,
  ScrollText,
  DatabaseBackup,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { BRAND_NAME, UserRole } from '@licoreria/shared-types';
import { useAuthStore } from '@/stores/auth.store';
import { useThemeStore } from '@/stores/theme.store';
import { useLogout } from '@/features/auth/hooks';
import { BrandMark } from '@/components/BrandMark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[]; // si no se define, visible para todos los autenticados
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/productos', label: 'Productos', icon: Package },
  { to: '/categorias', label: 'Categorías', icon: Tags },
  { to: '/proveedores', label: 'Proveedores', icon: Truck },
  { to: '/clientes', label: 'Clientes', icon: Users },
  {
    to: '/compras',
    label: 'Compras',
    icon: ShoppingCart,
    roles: [UserRole.ADMIN, UserRole.CONSULTA],
  },
  { to: '/inventario', label: 'Inventario', icon: ClipboardList },
  { to: '/ventas', label: 'Ventas', icon: Receipt },
  {
    to: '/reportes',
    label: 'Reportes',
    icon: FileBarChart,
    roles: [UserRole.ADMIN, UserRole.CONSULTA],
  },
  {
    to: '/usuarios',
    label: 'Usuarios',
    icon: UsersRound,
    roles: [UserRole.ADMIN],
  },
  {
    to: '/roles',
    label: 'Roles',
    icon: ShieldCheck,
    roles: [UserRole.ADMIN],
  },
  {
    to: '/backups',
    label: 'Backups',
    icon: DatabaseBackup,
    roles: [UserRole.ADMIN],
  },
  {
    to: '/auditoria',
    label: 'Auditoría',
    icon: ScrollText,
    roles: [UserRole.ADMIN],
  },
];

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const { dark, toggle } = useThemeStore();
  const logout = useLogout();
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  // Migas de pan derivadas de la ruta actual (usa las etiquetas del sidebar)
  const labelByPath: Record<string, string> = {
    ...Object.fromEntries(NAV_ITEMS.map((item) => [item.to, item.label])),
    '/ventas/nueva': 'Nueva venta',
  };
  const segments = pathname.split('/').filter(Boolean);
  const crumbs =
    segments.length === 0
      ? [{ to: '/', label: 'Dashboard' }]
      : segments.map((segment, i) => {
          const to = `/${segments.slice(0, i + 1).join('/')}`;
          return { to, label: labelByPath[to] ?? segment };
        });

  const navContent = (onNavigate?: () => void) => (
    <>
      <div className="flex items-center gap-3 px-5 py-5">
        <BrandMark className="h-9 w-9" />
        <span className="text-h2 font-semibold leading-tight">
          {BRAND_NAME}
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto py-2" aria-label="Principal">
        {visibleItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 border-l-[3px] border-transparent px-5 py-2.5 text-body transition-colors duration-150',
                isActive
                  ? 'border-brand-copper bg-brand-cava-soft text-white'
                  : 'text-on-cava-muted hover:bg-brand-cava-soft hover:text-white',
              )
            }
          >
            <Icon size={20} strokeWidth={1.5} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar fijo en desktop, oculto en tablet/móvil */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-brand-cava text-on-cava lg:flex">
        {navContent()}
      </aside>

      {/* Drawer de navegación en tablet/móvil */}
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setNavOpen(false)}
          role="presentation"
        >
          <aside
            className="flex h-full w-60 flex-col bg-brand-cava text-on-cava"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end px-3 pt-3">
              <button
                onClick={() => setNavOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-sm p-1 text-on-cava-muted hover:bg-brand-cava-soft hover:text-white"
              >
                <X size={20} strokeWidth={1.5} />
              </button>
            </div>
            {navContent(() => setNavOpen(false))}
          </aside>
        </div>
      )}

      <div className="flex min-h-screen flex-1 flex-col lg:ml-60">
        <header className="flex h-14 items-center justify-between border-b border-border bg-surface-card px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setNavOpen(true)}
              aria-label="Abrir menú"
              aria-expanded={navOpen}
            >
              <Menu size={20} strokeWidth={1.5} />
            </Button>
            <nav aria-label="Ruta" aria-live="polite">
              <ol className="flex items-center gap-1.5 text-small text-muted">
                {crumbs.map((crumb, i) => (
                  <li key={crumb.to} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <span aria-hidden className="text-muted/60">
                        /
                      </span>
                    )}
                    {i === crumbs.length - 1 ? (
                      <span aria-current="page" className="font-medium text-ink">
                        {crumb.label}
                      </span>
                    ) : (
                      <NavLink to={crumb.to} className="hover:text-ink">
                        {crumb.label}
                      </NavLink>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggle}
              aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </Button>

            {user && (
              <>
                <div className="text-right">
                  <p className="text-body font-medium leading-tight">
                    {user.name}
                  </p>
                  <Badge variant="info" className="mt-0.5">
                    {user.role}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout.mutate()}
                  aria-label="Cerrar sesión"
                >
                  <LogOut size={16} />
                </Button>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
