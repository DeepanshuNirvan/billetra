import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type ReportParams } from '../api/admin';

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
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user', id] });
    },
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

export function useAdminUserBillDetail(userId: string, billId: string | null) {
  return useQuery({
    queryKey: ['admin', 'user', userId, 'bill', billId],
    queryFn: () => adminApi.getUserBillDetail(userId, billId!),
    enabled: !!userId && !!billId,
  });
}

export function useAdminUserAccounts(id: string) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'accounts'],
    queryFn: () => adminApi.getUserAccounts(id),
    enabled: !!id,
  });
}

export function useAdminUserBusiness(id: string) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'business'],
    queryFn: () => adminApi.getUserBusiness(id),
    enabled: !!id,
  });
}

export function useUpdateUserBusiness(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof adminApi.updateUserBusiness>[1]) =>
      adminApi.updateUserBusiness(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'user', id, 'business'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user', id] });
    },
  });
}

export function useAdminUserSalesReport(id: string, params: ReportParams, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'reports', 'sales', params],
    queryFn: () => adminApi.getUserSalesReport(id, params),
    enabled: !!id && enabled,
  });
}

export function useAdminUserGSTReport(id: string, params: Omit<ReportParams, 'groupBy'>, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'reports', 'gst', params],
    queryFn: () => adminApi.getUserGSTReport(id, params),
    enabled: !!id && enabled,
  });
}

export function useAdminUserInventoryReport(id: string, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'user', id, 'reports', 'inventory'],
    queryFn: () => adminApi.getUserInventoryReport(id),
    enabled: !!id && enabled,
  });
}
