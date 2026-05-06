import apiClient from './client';
import type { AuthResponse, LoginPayload, SignupPayload, ApiResponse } from '../types';

export const authApi = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', payload);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Login failed');
    return data.data;
  },

  signup: async (payload: SignupPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<AuthResponse>>('/auth/signup', payload);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Signup failed');
    return data.data;
  },

  me: async (): Promise<AuthResponse> => {
    const { data } = await apiClient.get<ApiResponse<AuthResponse>>('/auth/me');
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed to get user');
    return data.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};
