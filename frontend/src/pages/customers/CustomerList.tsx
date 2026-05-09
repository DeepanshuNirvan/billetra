import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Edit, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, Pagination } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { CustomerForm } from '../../components/customers/CustomerForm';
import { BulkActions } from '../../components/bulk/BulkActions';
import { useCustomers, useDeleteCustomer } from '../../hooks/useCustomers';
import { formatCurrency } from '../../utils/format';
import { customersApi } from '../../api/customers';
import type { Customer } from '../../types';

export default function CustomerList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useCustomers({ search: search || undefined, page, limit: 20 });
  const deleteCustomer = useDeleteCustomer();

  const customers = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      cell: (c: Customer) => (
        <div>
          <p className="font-medium text-gray-900">{c.name}</p>
          {c.gstin && <p className="text-xs text-gray-400">GSTIN: {c.gstin}</p>}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: (c: Customer) => (
        <div>
          {c.phone && <p className="text-sm text-gray-700">{c.phone}</p>}
          {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
        </div>
      ),
    },
    {
      key: 'state',
      header: 'State',
      cell: (c: Customer) => <span className="text-gray-600">{c.state ?? '-'}</span>,
    },
    {
      key: 'outstanding',
      header: 'Outstanding',
      cell: (c: Customer) => (
        <span className={`font-semibold ${c.outstandingBalance > 0 ? 'text-red-600' : 'text-gray-500'}`}>
          {c.outstandingBalance > 0 ? formatCurrency(c.outstandingBalance) : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (c: Customer) => (
        <Badge color={c.isActive ? 'green' : 'gray'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (c: Customer) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            onClick={(e) => { e.stopPropagation(); setEditCustomer(c); setShowForm(true); }}
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Customers</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} customers</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditCustomer(undefined); setShowForm(true); }}>
          Add Customer
        </Button>
      </div>

      <div className="flex-1">
        <Input
          placeholder="Search by name, phone, email or GSTIN..."
          leftAddon={<Search className="h-4 w-4" />}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <BulkActions
        type="customers"
        exportData={customers.map((c) => ({
          name: c.name, email: c.email ?? '', phone: c.phone ?? '', gstin: c.gstin ?? '',
          address: c.billingAddress ?? '', state: c.state ?? '',
        }))}
        exportColumns={[
          { header: 'Name', dataKey: 'name' }, { header: 'Email', dataKey: 'email' },
          { header: 'Phone', dataKey: 'phone' }, { header: 'GSTIN', dataKey: 'gstin' },
          { header: 'Address', dataKey: 'address' }, { header: 'State', dataKey: 'state' },
        ]}
        onImport={customersApi.bulkImport}
      />

      {customers.length === 0 && !isLoading ? (
        <EmptyState
          icon={Users}
          title="No customers found"
          description="Add your first customer to get started"
          action={{ label: 'Add Customer', onClick: () => setShowForm(true) }}
        />
      ) : (
        <>
          <Table
            columns={columns}
            data={customers}
            keyExtractor={(c) => c.id}
            onRowClick={(c) => navigate(`/customers/${c.id}`)}
            loading={isLoading}
          />
          {totalPages > 1 && (
            <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />
          )}
        </>
      )}

      <CustomerForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditCustomer(undefined); }}
        customer={editCustomer}
      />

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Customer"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" onClick={async () => { await deleteCustomer.mutateAsync(deleteId!); setDeleteId(null); }} loading={deleteCustomer.isPending}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">Delete this customer? All their bills will remain but they will be unlinked.</p>
      </Modal>
    </div>
  );
}
