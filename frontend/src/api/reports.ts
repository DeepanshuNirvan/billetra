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
      params: filters,
    });
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  gst: async (filters: ReportFilters): Promise<GSTReportRow[]> => {
    const { data } = await apiClient.get<ApiResponse<GSTReportRow[]>>('/reports/gst', {
      params: filters,
    });
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  inventory: async (): Promise<InventoryReportRow[]> => {
    const { data } = await apiClient.get<ApiResponse<InventoryReportRow[]>>('/reports/inventory');
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  exportSalesCsv: async (filters: ReportFilters): Promise<Blob> => {
    const { data } = await apiClient.get('/reports/sales/export', {
      params: { ...filters, format: 'csv' },
      responseType: 'blob',
    });
    return data;
  },

  exportGstCsv: async (filters: ReportFilters): Promise<Blob> => {
    const { data } = await apiClient.get('/reports/gst/export', {
      params: { ...filters, format: 'csv' },
      responseType: 'blob',
    });
    return data;
  },
};
