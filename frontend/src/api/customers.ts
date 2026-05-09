import apiClient from './client';
import type { Customer, PaginatedResponse, ApiResponse } from '../types';

export interface CustomerFilters {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export const customersApi = {
  list: async (filters: CustomerFilters = {}): Promise<PaginatedResponse<Customer>> => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Customer>>>('/customers', {
      params: filters,
    });
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  get: async (id: string): Promise<Customer> => {
    const { data } = await apiClient.get<ApiResponse<Customer>>(`/customers/${id}`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  create: async (payload: Omit<Customer, 'id' | 'outstandingBalance'>): Promise<Customer> => {
    const { data } = await apiClient.post<ApiResponse<Customer>>('/customers', payload);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  update: async (id: string, payload: Partial<Customer>): Promise<Customer> => {
    const { data } = await apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, payload);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  },

  bulkImport: async (rows: Record<string, unknown>[]): Promise<{ created: number; errors: string[] }> => {
    const { data } = await apiClient.post<ApiResponse<{ created: number; errors: string[] }>>(
      '/customers/bulk-import',
      rows
    );
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  bills: async (id: string): Promise<{ data: import('../types').Bill[] }> => {
    const { data } = await apiClient.get<ApiResponse<{ data: import('../types').Bill[] }>>(`/customers/${id}/bills`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },
};
