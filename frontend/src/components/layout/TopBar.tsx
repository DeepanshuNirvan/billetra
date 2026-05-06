import { type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

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
};

interface TopBarProps {
  actions?: ReactNode;
}

export function TopBar({ actions }: TopBarProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const title = pageTitles[pathname] ?? 'Billetra';
  const isNested = pathname.split('/').filter(Boolean).length > 1 && !pageTitles[pathname]?.includes('Report');
  const canGoBack = pathname !== '/' && pathname.split('/').length > 2;

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 md:px-6 h-16 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {canGoBack && (
          <button
            onClick={() => navigate(-1)}
            className="md:hidden rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {/* Mobile logo / app name */}
        <div className="md:hidden">
          {pathname === '/' && (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center">
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

      <div className="flex items-center gap-2">
        {actions}
        <button className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors relative">
          <Bell className="h-5 w-5" />
        </button>
        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-indigo-700">
            {user?.name?.charAt(0)?.toUpperCase() ?? 'U'}
          </span>
        </div>
      </div>
    </header>
  );
}
