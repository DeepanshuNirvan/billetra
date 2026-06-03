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

export interface TemplateInfo {
  value: string;
  label: string;
  description: string;
  accent: string;
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

function toSnakePayload(payload: Partial<CreateBillPayload>) {
  return {
    customer_id: payload.customerId || undefined,
    account_id: payload.accountId || undefined,
    bill_date: payload.billDate,
    due_date: payload.dueDate || undefined,
    bill_size: payload.billSize,
    template: payload.template,
    discount_type: payload.discountType,
    discount_value: payload.discountValue,
    notes: payload.notes,
    is_interstate: payload.isInterstate,
    items: payload.items?.map((item) => ({
      product_id: (item as { productId?: string }).productId || undefined,
      name: item.name,
      hsn_code: (item as { hsnCode?: string }).hsnCode ?? '',
      quantity: item.quantity,
      unit: item.unit ?? '',
      price: item.price,
      discount_type: item.discountType,
      discount_value: item.discountValue,
      gst_rate: item.gstRate,
    })),
  };
}

export const billsApi = {
  list: async (filters: BillFilters = {}): Promise<PaginatedResponse<Bill>> => {
    const { startDate, endDate, customerId, ...rest } = filters;
    const params = {
      ...rest,
      from: startDate,
      to: endDate,
      customer_id: customerId,
    };
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Bill>>>('/bills', { params });
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  get: async (id: string): Promise<Bill> => {
    const { data } = await apiClient.get<ApiResponse<Bill>>(`/bills/${id}`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  create: async (payload: CreateBillPayload): Promise<Bill> => {
    const { data } = await apiClient.post<ApiResponse<Bill>>('/bills', toSnakePayload(payload));
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  update: async (id: string, payload: Partial<CreateBillPayload>): Promise<Bill> => {
    const { data } = await apiClient.put<ApiResponse<Bill>>(`/bills/${id}`, toSnakePayload(payload));
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/bills/${id}`);
  },

  markPaid: async (id: string, paidAmount: number): Promise<Bill> => {
    const { data } = await apiClient.put<ApiResponse<Bill>>(`/bills/${id}/mark-paid`, { paid_amount: paidAmount });
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

  // Render a PDF for an unsaved bill (live preview while editing).
  previewPdf: async (payload: Partial<CreateBillPayload>): Promise<Blob> => {
    const { data } = await apiClient.post('/bills/preview', toSnakePayload(payload), {
      responseType: 'blob',
    });
    return data;
  },

  // Render a dummy bill so users can preview a template's look.
  samplePdf: async (template: string): Promise<Blob> => {
    const { data } = await apiClient.get('/bills/template-sample', {
      params: { template },
      responseType: 'blob',
    });
    return data;
  },

  templates: async (): Promise<TemplateInfo[]> => {
    const { data } = await apiClient.get<ApiResponse<TemplateInfo[]>>('/bills/templates');
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  cancel: async (id: string): Promise<Bill> => {
    const { data } = await apiClient.post<ApiResponse<Bill>>(`/bills/${id}/cancel`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },
};
