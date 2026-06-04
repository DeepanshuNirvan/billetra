import apiClient from './client';
import type {
  AdminUser, ApiResponse, PaginatedResponse,
  Product, Customer, Bill, Account,
  SalesReportRow, GSTReportRow, InventoryReportRow,
  Business,
} from '../types';

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

export interface ReportParams {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'month';
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

  getUserBillDetail: async (userId: string, billId: string): Promise<Bill> => {
    const { data } = await apiClient.get<ApiResponse<Bill>>(`/admin/users/${userId}/bills/${billId}`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  getUserAccounts: async (id: string): Promise<Account[]> => {
    const { data } = await apiClient.get<ApiResponse<Account[]>>(`/admin/users/${id}/accounts`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  getUserBusiness: async (id: string): Promise<Business> => {
    const { data } = await apiClient.get<ApiResponse<Business>>(`/admin/users/${id}/business`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  updateUserBusiness: async (id: string, payload: Partial<Business>): Promise<Business> => {
    const { data } = await apiClient.put<ApiResponse<Business>>(`/admin/users/${id}/business`, payload);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  getUserSalesReport: async (id: string, params: ReportParams): Promise<SalesReportRow[]> => {
    const { data } = await apiClient.get<ApiResponse<SalesReportRow[]>>(`/admin/users/${id}/reports/sales`, { params });
    if (!data.success) throw new Error(data.error ?? 'Failed');
    return Array.isArray(data.data) ? data.data : [];
  },

  getUserGSTReport: async (id: string, params: Omit<ReportParams, 'groupBy'>): Promise<GSTReportRow[]> => {
    const { data } = await apiClient.get<ApiResponse<GSTReportRow[]>>(`/admin/users/${id}/reports/gst`, { params });
    if (!data.success) throw new Error(data.error ?? 'Failed');
    return Array.isArray(data.data) ? data.data : [];
  },

  getUserInventoryReport: async (id: string): Promise<InventoryReportRow[]> => {
    const { data } = await apiClient.get<ApiResponse<InventoryReportRow[]>>(`/admin/users/${id}/reports/inventory`);
    if (!data.success) throw new Error(data.error ?? 'Failed');
    return Array.isArray(data.data) ? data.data : [];
  },
};
