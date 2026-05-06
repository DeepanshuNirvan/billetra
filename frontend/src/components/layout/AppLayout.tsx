import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { ToastContainer } from '../ui/Toast';

export function AppLayout() {
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
