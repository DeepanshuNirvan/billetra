import apiClient from './client';
import type { Bill, BillItem, PaginatedResponse, ApiResponse } from '../types';

export interface BillFilters {
  search?: string;
  status?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface CreateBillPayload {
  customerId?: string;
  accountId?: string;
  billDate: string;
  dueDate?: string;
  billSize: string;
  template: string;
  items: Omit<BillItem, 'id'>[];
  discountType: 'fixed' | 'percent';
  discountValue: number;
  notes?: string;
  isInterstate: boolean;
}

export const billsApi = {
  list: async (filters: BillFilters = {}): Promise<PaginatedResponse<Bill>> => {
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Bill>>>('/bills', {
      params: filters,
    });
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  get: async (id: string): Promise<Bill> => {
    const { data } = await apiClient.get<ApiResponse<Bill>>(`/bills/${id}`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  create: async (payload: CreateBillPayload): Promise<Bill> => {
    const { data } = await apiClient.post<ApiResponse<Bill>>('/bills', payload);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  update: async (id: string, payload: Partial<CreateBillPayload>): Promise<Bill> => {
    const { data } = await apiClient.put<ApiResponse<Bill>>(`/bills/${id}`, payload);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/bills/${id}`);
  },

  markPaid: async (id: string, paidAmount: number): Promise<Bill> => {
    const { data } = await apiClient.post<ApiResponse<Bill>>(`/bills/${id}/mark-paid`, { paidAmount });
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  duplicate: async (id: string): Promise<Bill> => {
    const { data } = await apiClient.post<ApiResponse<Bill>>(`/bills/${id}/duplicate`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  downloadPdf: async (id: string): Promise<Blob> => {
    const { data } = await apiClient.get(`/bills/${id}/pdf`, { responseType: 'blob' });
    return data;
  },

  cancel: async (id: string): Promise<Bill> => {
    const { data } = await apiClient.post<ApiResponse<Bill>>(`/bills/${id}/cancel`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },
};
