import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Package, Users, Wallet,
  BarChart3, Settings, LogOut, ChevronLeft, Zap, Shield,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useAuthStore } from '../../store/authStore';
import { useLogout } from '../../hooks/useAuth';
import { useUIStore } from '../../store/uiStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/bills', icon: FileText, label: 'Bills' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/accounts', icon: Wallet, label: 'Accounts' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { business, user, isSuperAdmin } = useAuthStore();
  const logout = useLogout();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <aside
      className={clsx(
        'hidden md:flex flex-col h-screen bg-surface border-r border-gray-100 transition-all duration-300 flex-shrink-0',
        sidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
        {sidebarOpen && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">Billetra</span>
          </div>
        )}
        {!sidebarOpen && (
          <div className="h-8 w-8 rounded-lg bg-primary-600 flex items-center justify-center mx-auto">
            <Zap className="h-5 w-5 text-white" />
          </div>
        )}
        {sidebarOpen && (
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Business name */}
      {sidebarOpen && business && (
        <div className="px-4 py-3 border-b border-gray-50">
          <p className="text-xs text-gray-400 uppercase tracking-wider">Business</p>
          <p className="text-sm font-medium text-gray-800 truncate mt-0.5">{business.name}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 mb-1 text-sm font-medium transition-colors min-h-[44px]',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                !sidebarOpen && 'justify-center'
              )
            }
            title={!sidebarOpen ? label : undefined}
          >
            {({ isActive }) => (
              <>
                <Icon className={clsx('h-5 w-5 flex-shrink-0', isActive ? 'text-primary-600' : 'text-gray-400')} />
                {sidebarOpen && <span>{label}</span>}
              </>
            )}
          </NavLink>
        ))}

        {/* Admin link — super admin only */}
        {isSuperAdmin && (
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 mb-1 text-sm font-medium transition-colors mt-2 border-t border-gray-100 pt-4 min-h-[44px]',
                isActive
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                !sidebarOpen && 'justify-center'
              )
            }
            title={!sidebarOpen ? 'Admin' : undefined}
          >
            {({ isActive }) => (
              <>
                <Shield className={clsx('h-5 w-5 flex-shrink-0', isActive ? 'text-purple-600' : 'text-gray-400')} />
                {sidebarOpen && <span>Admin</span>}
              </>
            )}
          </NavLink>
        )}
      </nav>

      {/* Collapse button when closed */}
      {!sidebarOpen && (
        <div className="px-2 pb-2">
          <button
            onClick={toggleSidebar}
            className="w-full flex justify-center rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </button>
        </div>
      )}

      {/* User + Logout */}
      <div className="border-t border-gray-100 p-3">
        {sidebarOpen && user && (
          <div className="px-1 mb-2">
            <p className="text-xs font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={logout}
          className={clsx(
            'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full min-h-[44px]',
            !sidebarOpen && 'justify-center'
          )}
          title={!sidebarOpen ? 'Logout' : undefined}
        >
          <LogOut className="h-4 w-4" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
