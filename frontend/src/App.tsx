import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { ThemeProvider } from './components/ThemeProvider';
import { FullScreenSpinner } from './components/ui/Spinner';
import { useAuthStore } from './store/authStore';

// Lazy-loaded pages
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const BillList = lazy(() => import('./pages/bills/BillList'));
const CreateBill = lazy(() => import('./pages/bills/CreateBill'));
const BillDetail = lazy(() => import('./pages/bills/BillDetail'));
const ProductList = lazy(() => import('./pages/products/ProductList'));
const ProductDetail = lazy(() => import('./pages/products/ProductDetail'));
const CustomerList = lazy(() => import('./pages/customers/CustomerList'));
const CustomerDetail = lazy(() => import('./pages/customers/CustomerDetail'));
const AccountList = lazy(() => import('./pages/accounts/AccountList'));
const ReportsIndex = lazy(() => import('./pages/reports/index'));
const SalesReport = lazy(() => import('./pages/reports/SalesReport'));
const GSTReport = lazy(() => import('./pages/reports/GSTReport'));
const InventoryReport = lazy(() => import('./pages/reports/InventoryReport'));
const BusinessSettings = lazy(() => import('./pages/settings/BusinessSettings'));
const AdminUserList = lazy(() => import('./pages/admin/UserList'));
const CreateAdminUser = lazy(() => import('./pages/admin/CreateUser'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireSuperAdmin({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isSuperAdmin } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isSuperAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<FullScreenSpinner />}>
            <Routes>
              {/* Guest routes */}
              <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />
              <Route path="/signup" element={<RequireGuest><Signup /></RequireGuest>} />

              {/* Protected routes */}
              <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                <Route index element={<Dashboard />} />

                <Route path="bills">
                  <Route index element={<BillList />} />
                  <Route path="create" element={<CreateBill />} />
                  <Route path=":id" element={<BillDetail />} />
                </Route>

                <Route path="products">
                  <Route index element={<ProductList />} />
                  <Route path=":id" element={<ProductDetail />} />
                </Route>

                <Route path="customers">
                  <Route index element={<CustomerList />} />
                  <Route path=":id" element={<CustomerDetail />} />
                </Route>

                <Route path="accounts" element={<AccountList />} />

                <Route path="reports">
                  <Route index element={<ReportsIndex />} />
                  <Route path="sales" element={<SalesReport />} />
                  <Route path="gst" element={<GSTReport />} />
                  <Route path="inventory" element={<InventoryReport />} />
                </Route>

                <Route path="settings" element={<BusinessSettings />} />
              </Route>

              {/* Super admin routes */}
              <Route element={<RequireSuperAdmin><AppLayout /></RequireSuperAdmin>}>
                <Route path="admin">
                  <Route path="users" element={<AdminUserList />} />
                  <Route path="users/create" element={<CreateAdminUser />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
