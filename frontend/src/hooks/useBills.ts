import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billsApi, type BillFilters, type CreateBillPayload } from '../api/bills';
import { toast } from '../store/uiStore';

export const BILLS_KEY = 'bills';

export function useBills(filters: BillFilters = {}) {
  return useQuery({
    queryKey: [BILLS_KEY, filters],
    queryFn: () => billsApi.list(filters),
  });
}

export function useBill(id: string) {
  return useQuery({
    queryKey: [BILLS_KEY, id],
    queryFn: () => billsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBillPayload) => billsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BILLS_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Bill created successfully');
    },
    onError: (err: Error) => toast.error('Failed to create bill', err.message),
  });
}

export function useUpdateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateBillPayload> }) =>
      billsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BILLS_KEY] });
      toast.success('Bill updated');
    },
    onError: (err: Error) => toast.error('Failed to update bill', err.message),
  });
}

export function useMarkBillPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, paidAmount }: { id: string; paidAmount: number }) =>
      billsApi.markPaid(id, paidAmount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BILLS_KEY] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Bill marked as paid');
    },
    onError: (err: Error) => toast.error('Failed', err.message),
  });
}

export function useDuplicateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => billsApi.duplicate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BILLS_KEY] });
      toast.success('Bill duplicated');
    },
    onError: (err: Error) => toast.error('Failed to duplicate', err.message),
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => billsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BILLS_KEY] });
      toast.success('Bill deleted');
    },
    onError: (err: Error) => toast.error('Failed to delete', err.message),
  });
}

export function useCancelBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => billsApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BILLS_KEY] });
      toast.success('Bill cancelled');
    },
    onError: (err: Error) => toast.error('Failed to cancel', err.message),
  });
}
