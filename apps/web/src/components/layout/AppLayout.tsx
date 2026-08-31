import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
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

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  const navContent = (onNavigate?: () => void) => (
    <>
      <div className="flex items-center gap-3 px-5 py-5">
        <BrandMark className="h-9 w-9" />
        <span className="font-display text-h2 font-medium leading-tight">
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
                  : 'text-[#A79E8C] hover:bg-brand-cava-soft hover:text-white',
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
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col bg-brand-cava text-[#EDE7D8] lg:flex">
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
            className="flex h-full w-60 flex-col bg-brand-cava text-[#EDE7D8]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end px-3 pt-3">
              <button
                onClick={() => setNavOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-sm p-1 text-[#A79E8C] hover:bg-brand-cava-soft hover:text-white"
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
            <span className="text-small text-muted" aria-live="polite">
              {/* breadcrumb se enriquecerá por ruta en fases siguientes */}
            </span>
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
