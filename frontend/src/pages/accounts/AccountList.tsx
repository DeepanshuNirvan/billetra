import { useState } from 'react';
import { Plus, Building2, Smartphone, Banknote, CreditCard, Wallet, Star, Edit, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageSpinner } from '../../components/ui/Spinner';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useSetDefaultAccount } from '../../hooks/useAccounts';
import { formatCurrency } from '../../utils/format';
import { clsx } from 'clsx';
import type { Account } from '../../types';

const accountIcons: Record<string, React.ElementType> = {
  bank: Building2,
  upi: Smartphone,
  cash: Banknote,
  current: CreditCard,
  credit: CreditCard,
  wallet: Wallet,
};

const accountColors: Record<string, string> = {
  bank: 'bg-blue-50 text-blue-600',
  upi: 'bg-purple-50 text-purple-600',
  cash: 'bg-green-50 text-green-600',
  current: 'bg-orange-50 text-orange-600',
  credit: 'bg-red-50 text-red-600',
  wallet: 'bg-indigo-50 text-indigo-600',
};

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  accountType: z.enum(['bank', 'upi', 'cash', 'current', 'credit', 'wallet']),
  accountNumber: z.string().optional(),
  ifsc: z.string().optional(),
  upiId: z.string().optional(),
  branch: z.string().optional(),
  balance: z.coerce.number().default(0),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof schema>;

function AccountCard({ account, onEdit, onDelete, onSetDefault }: {
  account: Account;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const Icon = accountIcons[account.accountType] ?? Wallet;
  const colorCls = accountColors[account.accountType] ?? 'bg-gray-50 text-gray-600';

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx('rounded-xl p-3', colorCls)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">{account.name}</p>
              {account.isDefault && <Badge color="indigo" size="sm">Default</Badge>}
              {!account.isActive && <Badge color="gray" size="sm">Inactive</Badge>}
            </div>
            <p className="text-xs text-gray-400 capitalize mt-0.5">{account.accountType}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!account.isDefault && (
            <button
              className="rounded-lg p-1.5 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600 transition-colors"
              onClick={onSetDefault}
              title="Set as default"
            >
              <Star className="h-4 w-4" />
            </button>
          )}
          <button className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </button>
          <button className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        {account.accountNumber && (
          <p className="text-xs text-gray-500">Account: <span className="font-mono">{account.accountNumber}</span></p>
        )}
        {account.ifsc && (
          <p className="text-xs text-gray-500">IFSC: <span className="font-mono">{account.ifsc}</span></p>
        )}
        {account.upiId && (
          <p className="text-xs text-gray-500">UPI: <span className="font-mono">{account.upiId}</span></p>
        )}
        {account.branch && (
          <p className="text-xs text-gray-500">Branch: {account.branch}</p>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-400">Balance</span>
        <span className={clsx('font-bold text-lg', account.balance >= 0 ? 'text-gray-900' : 'text-red-600')}>
          {formatCurrency(account.balance)}
        </span>
      </div>
    </Card>
  );
}

export default function AccountList() {
  const { data: accounts = [], isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const setDefault = useSetDefaultAccount();

  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: editAccount
      ? { ...editAccount }
      : { accountType: 'bank', balance: 0, isDefault: false, isActive: true },
  });

  const openCreate = () => { setEditAccount(undefined); reset({ accountType: 'bank', balance: 0, isDefault: false, isActive: true }); setShowForm(true); };
  const openEdit = (a: Account) => { setEditAccount(a); reset({ ...a }); setShowForm(true); };

  const onSubmit = async (data: FormData) => {
    if (editAccount) {
      await updateAccount.mutateAsync({ id: editAccount.id, payload: data });
    } else {
      await createAccount.mutateAsync(data as any);
    }
    setShowForm(false);
    setEditAccount(undefined);
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Payment Accounts</h2>
          <p className="text-sm text-gray-500 mt-0.5">{accounts.length} accounts</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>Add Account</Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Add bank accounts, UPI IDs or cash accounts to track payments"
          action={{ label: 'Add Account', onClick: openCreate }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={() => openEdit(account)}
              onDelete={() => setDeleteId(account.id)}
              onSetDefault={() => setDefault.mutateAsync(account.id)}
            />
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editAccount ? 'Edit Account' : 'Add Account'}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" form="account-form" loading={isSubmitting}>
              {editAccount ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <form id="account-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Account Name" {...register('name')} error={errors.name?.message} required placeholder="e.g. SBI Current Account" />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Account Type <span className="text-red-500">*</span></label>
            <select {...register('accountType')} className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="bank">Bank Account</option>
              <option value="upi">UPI</option>
              <option value="cash">Cash</option>
              <option value="current">Current Account</option>
              <option value="credit">Credit Card</option>
              <option value="wallet">Digital Wallet</option>
            </select>
          </div>
          <Input label="Account Number" {...register('accountNumber')} placeholder="Optional" />
          <Input label="IFSC Code" {...register('ifsc')} placeholder="e.g. SBIN0001234" />
          <Input label="UPI ID" {...register('upiId')} placeholder="yourname@upi" />
          <Input label="Branch" {...register('branch')} placeholder="e.g. Mumbai - Andheri" />
          <Input label="Opening Balance (₹)" type="number" {...register('balance')} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isDefault" {...register('isDefault')} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <label htmlFor="isDefault" className="text-sm text-gray-700">Set as default account</label>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Account"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={async () => { await deleteAccount.mutateAsync(deleteId!); setDeleteId(null); }} loading={deleteAccount.isPending}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">Delete this account? Historical transactions will remain.</p>
      </Modal>
    </div>
  );
}
