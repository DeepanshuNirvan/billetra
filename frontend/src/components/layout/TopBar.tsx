import { type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/bills': 'Bills',
  '/bills/create': 'Create Bill',
  '/products': 'Products',
  '/customers': 'Customers',
  '/accounts': 'Accounts',
  '/reports': 'Reports',
  '/reports/sales': 'Sales Report',
  '/reports/gst': 'GST Report',
  '/reports/inventory': 'Inventory Report',
  '/settings': 'Business Settings',
  '/admin/users': 'Admin — Users',
  '/admin/users/create': 'Create User',
};

interface TopBarProps {
  actions?: ReactNode;
}

export function TopBar({ actions }: TopBarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const title = pageTitles[pathname] ?? 'Billetra';
  const canGoBack = pathname !== '/';

  return (
    <header className="sticky top-0 z-20 bg-surface border-b border-gray-100 px-4 md:px-6 h-16 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {canGoBack && (
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div className="md:hidden">
          {pathname === '/' && (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">B</span>
              </div>
              <span className="font-bold text-gray-900">Billetra</span>
            </div>
          )}
          {pathname !== '/' && (
            <h1 className="text-base font-semibold text-gray-900">{title}</h1>
          )}
        </div>
        <h1 className="hidden md:block text-lg font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {actions}
        <ThemeSwitcher />
        <button className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors relative min-h-[44px] min-w-[44px] flex items-center justify-center">
          <Bell className="h-5 w-5" />
        </button>
        <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-primary-700">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </span>
        </div>
      </div>
    </header>
  );
}
