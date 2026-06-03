import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../api/admin';

export function useAdminUsers(params?: { search?: string; page?: number }) {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminApi.listUsers(params),
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; is_active?: boolean } }) =>
      adminApi.updateUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => adminApi.getUser(id),
    enabled: !!id,
  });
}

export function useAdminUserStats(id: string) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'stats'],
    queryFn: () => adminApi.getUserStats(id),
    enabled: !!id,
  });
}

export function useAdminUserProducts(id: string, params: { search?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'products', params],
    queryFn: () => adminApi.getUserProducts(id, params),
    enabled: !!id,
  });
}

export function useAdminUserCustomers(id: string, params: { search?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'customers', params],
    queryFn: () => adminApi.getUserCustomers(id, params),
    enabled: !!id,
  });
}

export function useAdminUserBills(id: string, params: { search?: string; status?: string; page?: number } = {}) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'bills', params],
    queryFn: () => adminApi.getUserBills(id, params),
    enabled: !!id,
  });
}
