import apiClient from './client';
import type { Product, PaginatedResponse, ApiResponse, Category } from '../types';

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

export const productsApi = {
  list: async (filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> => {
    const { isActive, categoryId, lowStock, ...rest } = filters;
    const params = {
      ...rest,
      is_active: isActive,
      category_id: categoryId,
      low_stock: lowStock,
    };
    const { data } = await apiClient.get<ApiResponse<PaginatedResponse<Product>>>('/products', { params });
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  get: async (id: string): Promise<Product> => {
    const { data } = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  create: async (payload: Omit<Product, 'id' | 'createdAt' | 'category'>): Promise<Product> => {
    const { data } = await apiClient.post<ApiResponse<Product>>('/products', payload);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  update: async (id: string, payload: Partial<Product>): Promise<Product> => {
    const { data } = await apiClient.put<ApiResponse<Product>>(`/products/${id}`, payload);
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/products/${id}`);
  },

  bulkImport: async (rows: Record<string, unknown>[]): Promise<{ created: number; errors: string[] }> => {
    const { data } = await apiClient.post<ApiResponse<{ created: number; errors: string[] }>>(
      '/products/bulk-import',
      rows
    );
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },

  categories: async (): Promise<Category[]> => {
    const { data } = await apiClient.get<ApiResponse<Category[]>>('/categories');
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },
};
