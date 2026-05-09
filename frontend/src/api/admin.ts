import apiClient from './client';
import type { AdminUser, ApiResponse } from '../types';

interface UserPage {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export const adminApi = {
  listUsers: async (params?: { search?: string; page?: number; role?: string }): Promise<UserPage> => {
    const { data } = await apiClient.get<ApiResponse<UserPage>>('/admin/users', { params });
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  createUser: async (input: { email: string; password: string; name: string; phone?: string }): Promise<AdminUser> => {
    const { data } = await apiClient.post<ApiResponse<AdminUser>>('/admin/users', input);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  updateUser: async (id: string, updates: { name?: string; is_active?: boolean }): Promise<AdminUser> => {
    const { data } = await apiClient.put<ApiResponse<AdminUser>>(`/admin/users/${id}`, updates);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },
};
