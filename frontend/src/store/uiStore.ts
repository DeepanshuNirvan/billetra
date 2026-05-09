import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type Theme = 'indigo' | 'ocean' | 'forest' | 'amber' | 'rose' | 'dark';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface UIState {
  sidebarOpen: boolean;
  theme: Theme;
  toasts: Toast[];
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: Theme) => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

let toastId = 0;

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'indigo',
      toasts: [],

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      setTheme: (theme) => {
        const root = document.documentElement;
        if (theme === 'indigo') {
          root.removeAttribute('data-theme');
        } else {
          root.setAttribute('data-theme', theme);
        }
        set({ theme });
      },

      addToast: (toast) => {
        const id = String(++toastId);
        set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 4000);
      },

      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'billetra_ui',
      partialize: (s) => ({ sidebarOpen: s.sidebarOpen, theme: s.theme }),
    }
  )
);

export const toast = {
  success: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'success', title, message }),
  error: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'error', title, message }),
  warning: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'warning', title, message }),
  info: (title: string, message?: string) =>
    useUIStore.getState().addToast({ type: 'info', title, message }),
};
