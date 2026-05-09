import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Business } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  business: Business | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  login: (token: string, user: User, business?: Business) => void;
  logout: () => void;
  setBusiness: (business: Business) => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      business: null,
      isAuthenticated: false,
      isSuperAdmin: false,

      login: (token, user, business) => {
        localStorage.setItem('billetra_token', token);
        set({
          token,
          user,
          business: business ?? null,
          isAuthenticated: true,
          isSuperAdmin: user.role === 'super_admin',
        });
      },

      logout: () => {
        localStorage.removeItem('billetra_token');
        set({ token: null, user: null, business: null, isAuthenticated: false, isSuperAdmin: false });
      },

      setBusiness: (business) => set({ business }),
      setUser: (user) => set({ user, isSuperAdmin: user.role === 'super_admin' }),
    }),
    {
      name: 'billetra_auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        business: state.business,
        isAuthenticated: state.isAuthenticated,
        isSuperAdmin: state.isSuperAdmin,
      }),
    }
  )
);
