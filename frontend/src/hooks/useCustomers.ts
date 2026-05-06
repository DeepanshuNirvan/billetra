import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, type CustomerFilters } from '../api/customers';
import { toast } from '../store/uiStore';
import type { Customer } from '../types';

export const CUSTOMERS_KEY = 'customers';

export function useCustomers(filters: CustomerFilters = {}) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, filters],
    queryFn: () => customersApi.list(filters),
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: [CUSTOMERS_KEY, id],
    queryFn: () => customersApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Customer, 'id' | 'outstandingBalance'>) =>
      customersApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
      toast.success('Customer created');
    },
    onError: (err: Error) => toast.error('Failed to create customer', err.message),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Customer> }) =>
      customersApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
      toast.success('Customer updated');
    },
    onError: (err: Error) => toast.error('Failed to update customer', err.message),
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CUSTOMERS_KEY] });
      toast.success('Customer deleted');
    },
    onError: (err: Error) => toast.error('Failed to delete', err.message),
  });
}
