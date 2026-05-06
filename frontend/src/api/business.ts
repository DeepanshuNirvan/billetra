import apiClient from './client';
import type { Business, ApiResponse } from '../types';

export const businessApi = {
  get: async (): Promise<Business> => {
    const { data } = await apiClient.get<ApiResponse<Business>>('/business');
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  update: async (payload: Partial<Business>): Promise<Business> => {
    const { data } = await apiClient.put<ApiResponse<Business>>('/business', payload);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  uploadLogo: async (file: File): Promise<{ logoUrl: string }> => {
    const form = new FormData();
    form.append('logo', file);
    const { data } = await apiClient.post<ApiResponse<{ logoUrl: string }>>(
      '/business/logo',
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },
};
