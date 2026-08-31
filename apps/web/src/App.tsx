import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserRole } from '@licoreria/shared-types';
import { ProtectedRoute, ThemeApplier } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { UsersPage } from '@/features/users/UsersPage';
import { CategoriesPage } from '@/features/categories/CategoriesPage';
import { ProductsPage } from '@/features/products/ProductsPage';
import { SuppliersPage } from '@/features/suppliers/SuppliersPage';
import { CustomersPage } from '@/features/customers/CustomersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="productos" element={<ProductsPage />} />
                <Route path="categorias" element={<CategoriesPage />} />
                <Route path="proveedores" element={<SuppliersPage />} />
                <Route path="clientes" element={<CustomersPage />} />
                <Route
                  element={<ProtectedRoute roles={[UserRole.ADMIN]} />}
                >
                  <Route path="usuarios" element={<UsersPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeApplier>
    </QueryClientProvider>
  );
}
