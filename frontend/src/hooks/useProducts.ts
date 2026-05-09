import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, type ProductFilters } from '../api/products';
import { toast } from '../store/uiStore';
import type { Product } from '../types';

export const PRODUCTS_KEY = 'products';

export function useProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, filters],
    queryFn: () => productsApi.list(filters),
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [PRODUCTS_KEY, id],
    queryFn: () => productsApi.get(id),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => productsApi.categories(),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Product, 'id' | 'createdAt' | 'category'>) =>
      productsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
      toast.success('Product created');
    },
    onError: (err: Error) => toast.error('Failed to create product', err.message),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Product> }) =>
      productsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
      toast.success('Product updated');
    },
    onError: (err: Error) => toast.error('Failed to update product', err.message),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
      toast.success('Product deleted');
    },
    onError: (err: Error) => toast.error('Failed to delete', err.message),
  });
}

export function useBulkImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: Record<string, unknown>[]) => productsApi.bulkImport(rows),
    onSuccess: (result: { created: number; errors: string[] }) => {
      qc.invalidateQueries({ queryKey: [PRODUCTS_KEY] });
      toast.success(`Imported ${result.created} products`);
    },
    onError: (err: Error) => toast.error('Bulk import failed', err.message),
  });
}
