import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { ToastContainer } from '../ui/Toast';
import { useAuthStore } from '../../store/authStore';
import { businessApi } from '../../api/business';

export function AppLayout() {
  const { isAuthenticated, isSuperAdmin, setBusiness } = useAuthStore();

  // Keep the business profile in the store fresh. Login does not return it,
  // so without this the settings form, default template, logo, etc. stay blank.
  const { data: business } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: businessApi.get,
    enabled: isAuthenticated && !isSuperAdmin,
    staleTime: 0,
  });

  useEffect(() => {
    if (business) setBusiness(business);
  }, [business, setBusiness]);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          <div className="h-full">
            <Outlet />
          </div>
        </main>
      </div>

      <BottomNav />
      <ToastContainer />
    </div>
  );
}
