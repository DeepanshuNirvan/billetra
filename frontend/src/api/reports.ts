import apiClient from './client';
import type { ApiResponse, SalesReportRow, GSTReportRow, InventoryReportRow } from '../types';

export interface ReportFilters {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'month';
}

export const reportsApi = {
  sales: async (filters: ReportFilters): Promise<SalesReportRow[]> => {
    const { data } = await apiClient.get<ApiResponse<SalesReportRow[]>>('/reports/sales', {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        groupBy: filters.groupBy ?? 'day',
      },
    });
    if (!data.success) throw new Error(data.error ?? 'Failed');
    return Array.isArray(data.data) ? data.data : [];
  },

  gst: async (filters: Omit<ReportFilters, 'groupBy'>): Promise<GSTReportRow[]> => {
    const { data } = await apiClient.get<ApiResponse<GSTReportRow[]>>('/reports/gst', {
      params: {
        startDate: filters.startDate,
        endDate: filters.endDate,
      },
    });
    if (!data.success) throw new Error(data.error ?? 'Failed');
    return Array.isArray(data.data) ? data.data : [];
  },

  inventory: async (): Promise<InventoryReportRow[]> => {
    const { data } = await apiClient.get<ApiResponse<InventoryReportRow[]>>('/reports/inventory');
    if (!data.success) throw new Error(data.error ?? 'Failed');
    return Array.isArray(data.data) ? data.data : [];
  },
};
