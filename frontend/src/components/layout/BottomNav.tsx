import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Package, Users, MoreHorizontal } from 'lucide-react';
import { clsx } from 'clsx';

const tabs = [
  { to: '/', icon: LayoutDashboard, label: 'Home', exact: true },
  { to: '/bills', icon: FileText, label: 'Bills' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/accounts', icon: MoreHorizontal, label: 'More' },
];

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 safe-area-inset-bottom">
      <div className="flex">
        {tabs.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center gap-1 py-2.5 px-1 text-xs font-medium transition-colors',
                isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={clsx('h-5 w-5', isActive && 'text-indigo-600')} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
