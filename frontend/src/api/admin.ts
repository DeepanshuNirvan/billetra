import apiClient from './client';
import type { AdminUser, ApiResponse, PaginatedResponse, Product, Customer, Bill } from '../types';

interface UserPage {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUserStats {
  todaySales: number;
  monthSales: number;
  totalOutstanding: number;
  gstCollected: number;
  totalBills: number;
  paidBills: number;
  pendingBills: number;
}

interface ListParams {
  search?: string;
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
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

  getUser: async (id: string): Promise<AdminUser> => {
    const { data } = await apiClient.get<ApiResponse<AdminUser>>(`/admin/users/${id}`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  getUserStats: async (id: string): Promise<AdminUserStats> => {
    const { data } = await apiClient.get<ApiResponse<AdminUserStats>>(`/admin/users/${id}/stats`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  getUserProducts: async (id: string, params: ListParams = {}): Promise<PaginatedResponse<Product>> => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Product>>>(`/admin/users/${id}/products`, { params });
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  getUserCustomers: async (id: string, params: ListParams = {}): Promise<PaginatedResponse<Customer>> => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Customer>>>(`/admin/users/${id}/customers`, { params });
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  getUserBills: async (id: string, params: ListParams = {}): Promise<PaginatedResponse<Bill>> => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Bill>>>(`/admin/users/${id}/bills`, { params });
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },
};
