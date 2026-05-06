import apiClient from './client';
import type { DashboardData, ApiResponse } from '../types';

export const dashboardApi = {
  get: async (): Promise<DashboardData> => {
    const { data } = await apiClient.get<ApiResponse<DashboardData>>('/dashboard');
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },
};
