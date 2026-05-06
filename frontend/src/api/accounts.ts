import apiClient from './client';
import type { Account, ApiResponse } from '../types';

export const accountsApi = {
  list: async (): Promise<Account[]> => {
    const { data } = await apiClient.get<ApiResponse<Account[]>>('/accounts');
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  get: async (id: string): Promise<Account> => {
    const { data } = await apiClient.get<ApiResponse<Account>>(`/accounts/${id}`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  create: async (payload: Omit<Account, 'id'>): Promise<Account> => {
    const { data } = await apiClient.post<ApiResponse<Account>>('/accounts', payload);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  update: async (id: string, payload: Partial<Account>): Promise<Account> => {
    const { data } = await apiClient.put<ApiResponse<Account>>(`/accounts/${id}`, payload);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/accounts/${id}`);
  },

  setDefault: async (id: string): Promise<Account> => {
    const { data } = await apiClient.post<ApiResponse<Account>>(`/accounts/${id}/set-default`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },
};
