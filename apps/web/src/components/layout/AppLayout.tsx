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
  Receipt,
  FileBarChart,
  DatabaseBackup,
  Moon,
  Sun,
  LogOut,
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
  { to: '/compras', label: 'Compras', icon: ShoppingCart },
  { to: '/ventas', label: 'Ventas', icon: Receipt },
  { to: '/reportes', label: 'Reportes', icon: FileBarChart },
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
];

export function AppLayout() {
  const user = useAuthStore((s) => s.user);
  const { dark, toggle } = useThemeStore();
  const logout = useLogout();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar: superficie de marca verde cava */}
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col bg-brand-cava text-[#EDE7D8]">
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
      </aside>

      <div className="ml-60 flex min-h-screen flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-border bg-surface-card px-6">
          <span className="text-small text-muted" aria-live="polite">
            {/* breadcrumb se enriquecerá por ruta en fases siguientes */}
          </span>

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

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
