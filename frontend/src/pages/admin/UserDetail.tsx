import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Shield, Package, Users as UsersIcon, FileText, Search, LayoutDashboard,
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Card } from '../../components/ui/Card';
import { Badge, BillStatusBadge } from '../../components/ui/Badge';
import { PageSpinner } from '../../components/ui/Spinner';
import {
  useAdminUser, useAdminUserStats, useAdminUserProducts,
  useAdminUserCustomers, useAdminUserBills,
} from '../../hooks/useAdmin';
import { formatCurrency, formatDate } from '../../utils/format';
import type { Product, Customer, Bill } from '../../types';

type Tab = 'overview' | 'products' | 'customers' | 'bills';

export default function AdminUserDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');

  const { data: user, isLoading } = useAdminUser(id);
  const { data: stats } = useAdminUserStats(id);
  const products = useAdminUserProducts(id, { search: tab === 'products' ? search || undefined : undefined });
  const customers = useAdminUserCustomers(id, { search: tab === 'customers' ? search || undefined : undefined });
  const bills = useAdminUserBills(id, { search: tab === 'bills' ? search || undefined : undefined });

  if (isLoading) return <PageSpinner />;
  if (!user) return <div className="p-6 text-center text-gray-500">User not found</div>;

  const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'customers', label: 'Customers', icon: UsersIcon },
    { key: 'bills', label: 'Bills', icon: FileText },
  ];

  const statCards = [
    { label: 'Total Bills', value: String(stats?.totalBills ?? 0) },
    { label: 'Month Sales', value: formatCurrency(stats?.monthSales ?? 0) },
    { label: 'Outstanding', value: formatCurrency(stats?.totalOutstanding ?? 0) },
    { label: 'GST Collected', value: formatCurrency(stats?.gstCollected ?? 0) },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/admin/users')}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-11 w-11 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0">
            {user.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 truncate">{user.name}</h2>
              <Badge color={user.role === 'super_admin' ? 'indigo' : 'gray'}>
                {user.role === 'super_admin' ? (
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Super Admin</span>
                ) : 'Owner'}
              </Badge>
              <Badge color={user.is_active ? 'green' : 'red'}>{user.is_active ? 'Active' : 'Suspended'}</Badge>
            </div>
            <p className="text-sm text-gray-500 truncate">
              {user.email}{user.business?.name ? ` · ${user.business.name}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <p className="text-xs text-gray-400 uppercase font-semibold">{s.label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1 overflow-x-auto">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSearch(''); }}
            className={`pb-2 px-3 text-sm font-medium flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
              tab === key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Business overview */}
      {tab === 'overview' && (
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">Business Profile</h3>
          {user.business ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Business Name" value={user.business.name} />
              <Field label="GSTIN" value={user.business.gstin} />
              <Field label="PAN" value={user.business.pan} />
              <Field label="Phone" value={user.business.phone} />
              <Field label="Email" value={user.business.email} />
              <Field label="Address" value={[user.business.address, user.business.city, user.business.state, user.business.pincode].filter(Boolean).join(', ')} />
              <Field label="Joined" value={formatDate(user.created_at)} />
            </dl>
          ) : (
            <p className="text-sm text-gray-500">No business profile set up yet.</p>
          )}
        </Card>
      )}

      {/* Searchable data tabs */}
      {tab !== 'overview' && (
        <div className="space-y-3">
          <Input
            placeholder={`Search ${tab}...`}
            leftAddon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {tab === 'products' && (
            <Table<Product>
              columns={[
                { key: 'name', header: 'Product', cell: (p) => <span className="font-medium text-gray-900">{p.name}</span> },
                { key: 'sku', header: 'SKU', cell: (p) => <span className="text-gray-500">{p.sku ?? '-'}</span> },
                { key: 'price', header: 'Price', cell: (p) => formatCurrency(p.sellingPrice) },
                { key: 'stock', header: 'Stock', cell: (p) => `${p.stockQuantity} ${p.unitType ?? ''}` },
                { key: 'gst', header: 'GST', cell: (p) => `${p.gstRate}%` },
              ]}
              data={products.data?.data ?? []}
              keyExtractor={(p) => p.id}
              loading={products.isLoading}
              emptyMessage="No products"
            />
          )}

          {tab === 'customers' && (
            <Table<Customer>
              columns={[
                { key: 'name', header: 'Customer', cell: (c) => <span className="font-medium text-gray-900">{c.name}</span> },
                { key: 'phone', header: 'Phone', cell: (c) => <span className="text-gray-500">{c.phone ?? '-'}</span> },
                { key: 'gstin', header: 'GSTIN', cell: (c) => <span className="text-gray-500">{c.gstin ?? '-'}</span> },
                { key: 'outstanding', header: 'Outstanding', cell: (c) => formatCurrency(c.outstandingBalance) },
              ]}
              data={customers.data?.data ?? []}
              keyExtractor={(c) => c.id}
              loading={customers.isLoading}
              emptyMessage="No customers"
            />
          )}

          {tab === 'bills' && (
            <Table<Bill>
              columns={[
                { key: 'invoice', header: 'Invoice', cell: (b) => <span className="font-medium text-gray-900">#{b.invoiceNumber}</span> },
                { key: 'date', header: 'Date', cell: (b) => formatDate(b.billDate) },
                { key: 'customer', header: 'Customer', cell: (b) => b.customer?.name ?? 'Walk-in' },
                { key: 'total', header: 'Total', cell: (b) => formatCurrency(b.totalAmount) },
                { key: 'status', header: 'Status', cell: (b) => <BillStatusBadge status={b.status} /> },
              ]}
              data={bills.data?.data ?? []}
              keyExtractor={(b) => b.id}
              loading={bills.isLoading}
              emptyMessage="No bills"
            />
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase font-semibold">{label}</dt>
      <dd className="text-gray-900 mt-0.5">{value || '-'}</dd>
    </div>
  );
}
