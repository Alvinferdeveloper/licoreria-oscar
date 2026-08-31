import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserRole } from '@licoreria/shared-types';
import { ProtectedRoute, ThemeApplier } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/Toaster';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { UsersPage } from '@/features/users/UsersPage';
import { RolesPage } from '@/features/roles/RolesPage';
import { CategoriesPage } from '@/features/categories/CategoriesPage';
import { ProductsPage } from '@/features/products/ProductsPage';
import { SuppliersPage } from '@/features/suppliers/SuppliersPage';
import { CustomersPage } from '@/features/customers/CustomersPage';
import { PurchasesPage } from '@/features/purchases/PurchasesPage';
import { KardexPage } from '@/features/inventory/KardexPage';
import { SalesPage } from '@/features/sales/SalesPage';
import { NewSalePage } from '@/features/sales/NewSalePage';
import { AuditPage } from '@/features/audit/AuditPage';
import { ReportsPage } from '@/features/reports/ReportsPage';
import { BackupsPage } from '@/features/backups/BackupsPage';
import { NotFoundPage } from '@/features/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeApplier>
          <BrowserRouter>
            <Toaster />
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="productos" element={<ProductsPage />} />
                <Route path="categorias" element={<CategoriesPage />} />
                <Route path="proveedores" element={<SuppliersPage />} />
                <Route path="clientes" element={<CustomersPage />} />
                <Route path="inventario" element={<KardexPage />} />
                <Route
                  element={
                    <ProtectedRoute roles={[UserRole.ADMIN, UserRole.VENDEDOR, UserRole.CONSULTA]} />
                  }
                >
                  <Route path="ventas" element={<SalesPage />} />
                </Route>
                <Route
                  element={
                    <ProtectedRoute roles={[UserRole.ADMIN, UserRole.VENDEDOR]} />
                  }
                >
                  <Route path="ventas/nueva" element={<NewSalePage />} />
                </Route>
                <Route
                  element={
                    <ProtectedRoute roles={[UserRole.ADMIN, UserRole.CONSULTA]} />
                  }
                >
                  <Route path="compras" element={<PurchasesPage />} />
                  <Route path="reportes" element={<ReportsPage />} />
                </Route>
                <Route
                  element={
                    <ProtectedRoute roles={[UserRole.ADMIN]} />
                  }
                >
                  <Route path="auditoria" element={<AuditPage />} />
                  <Route path="usuarios" element={<UsersPage />} />
                  <Route path="roles" element={<RolesPage />} />
                  <Route path="backups" element={<BackupsPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeApplier>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
