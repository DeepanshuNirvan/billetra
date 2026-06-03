import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { toast } from '../store/uiStore';
import type { LoginPayload, SignupPayload } from '../types';

export function useLogin() {
  const { login } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (data) => {
      login(data.accessToken, data.user, data.business);
      toast.success('Welcome back!', `Logged in as ${data.user.name}`);
      navigate('/');
    },
    onError: (err: Error) => {
      toast.error('Login failed', err.message);
    },
  });
}

export function useSignup() {
  const { login } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: SignupPayload) => authApi.signup(payload),
    onSuccess: (data) => {
      login(data.accessToken, data.user, data.business);
      toast.success('Account created!', 'Welcome to Billetra');
      navigate('/');
    },
    onError: (err: Error) => {
      toast.error('Signup failed', err.message);
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return () => {
    authApi.logout().catch(() => {});
    logout();
    navigate('/login');
  };
}
