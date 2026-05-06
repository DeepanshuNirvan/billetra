import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi } from '../api/accounts';
import { toast } from '../store/uiStore';
import type { Account } from '../types';

export const ACCOUNTS_KEY = 'accounts';

export function useAccounts() {
  return useQuery({
    queryKey: [ACCOUNTS_KEY],
    queryFn: () => accountsApi.list(),
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<Account, 'id'>) => accountsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
      toast.success('Account created');
    },
    onError: (err: Error) => toast.error('Failed to create account', err.message),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Account> }) =>
      accountsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
      toast.success('Account updated');
    },
    onError: (err: Error) => toast.error('Failed to update account', err.message),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
      toast.success('Account deleted');
    },
    onError: (err: Error) => toast.error('Failed to delete', err.message),
  });
}

export function useSetDefaultAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountsApi.setDefault(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ACCOUNTS_KEY] });
      toast.success('Default account updated');
    },
    onError: (err: Error) => toast.error('Failed', err.message),
  });
}
