import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, subDays } from 'date-fns';
import {
  ArrowLeft, Shield, Package, Users as UsersIcon, FileText,
  Search, LayoutDashboard, CreditCard, BarChart2, Edit2, Save, X,
  ChevronRight, AlertTriangle,
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge, BillStatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { PageSpinner } from '../../components/ui/Spinner';
import {
  useAdminUser, useAdminUserStats, useAdminUserProducts,
  useAdminUserCustomers, useAdminUserBills, useAdminUserBillDetail,
  useAdminUserAccounts, useAdminUserBusiness, useUpdateUserBusiness,
  useAdminUserSalesReport, useAdminUserGSTReport, useAdminUserInventoryReport,
  useUpdateUser,
} from '../../hooks/useAdmin';
import { formatCurrency, formatDate } from '../../utils/format';
import { toast } from '../../store/uiStore';
import type { Product, Customer, Bill, Account, SalesReportRow, GSTReportRow, InventoryReportRow } from '../../types';

type Tab = 'overview' | 'products' | 'customers' | 'bills' | 'accounts' | 'reports';
type ReportTab = 'sales' | 'gst' | 'inventory';

export default function AdminUserDetail() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const [search, setSearch] = useState('');
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [reportTab, setReportTab] = useState<ReportTab>('sales');
  const [editingBiz, setEditingBiz] = useState(false);
  const [bizForm, setBizForm] = useState<Record<string, string>>({});
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('day');

  const { data: user, isLoading } = useAdminUser(id);
  const { data: stats } = useAdminUserStats(id);
  const products = useAdminUserProducts(id, { search: tab === 'products' ? search || undefined : undefined });
  const customers = useAdminUserCustomers(id, { search: tab === 'customers' ? search || undefined : undefined });
  const bills = useAdminUserBills(id, { search: tab === 'bills' ? search || undefined : undefined });
  const { data: billDetail, isLoading: billDetailLoading } = useAdminUserBillDetail(id, selectedBillId);
  const { data: accounts, isLoading: accountsLoading } = useAdminUserAccounts(id);
  const { data: business, isLoading: bizLoading } = useAdminUserBusiness(id);
  const updateBiz = useUpdateUserBusiness(id);
  const updateUser = useUpdateUser();

  const salesReport = useAdminUserSalesReport(id, { startDate, endDate, groupBy }, tab === 'reports' && reportTab === 'sales');
  const gstReport = useAdminUserGSTReport(id, { startDate, endDate }, tab === 'reports' && reportTab === 'gst');
  const inventoryReport = useAdminUserInventoryReport(id, tab === 'reports' && reportTab === 'inventory');

  if (isLoading) return <PageSpinner />;
  if (!user) return <div className="p-6 text-center text-gray-500">User not found</div>;

  const tabs: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: 'overview', label: 'Overview', icon: LayoutDashboard },
    { key: 'products', label: 'Products', icon: Package },
    { key: 'customers', label: 'Customers', icon: UsersIcon },
    { key: 'bills', label: 'Bills', icon: FileText },
    { key: 'accounts', label: 'Accounts', icon: CreditCard },
    { key: 'reports', label: 'Reports', icon: BarChart2 },
  ];

  const statCards = [
    { label: 'Total Bills', value: String(stats?.totalBills ?? 0) },
    { label: 'Month Sales', value: formatCurrency(stats?.monthSales ?? 0) },
    { label: 'Outstanding', value: formatCurrency(stats?.totalOutstanding ?? 0) },
    { label: 'GST Collected', value: formatCurrency(stats?.gstCollected ?? 0) },
  ];

  const handleSaveBiz = async () => {
    try {
      await updateBiz.mutateAsync(bizForm as any);
      setEditingBiz(false);
      toast.success('Business profile updated');
    } catch (e: any) {
      toast.error('Update failed', e.message);
    }
  };

  const startEditBiz = () => {
    if (business) {
      setBizForm({
        name: business.name ?? '',
        gstin: business.gstin ?? '',
        pan: business.pan ?? '',
        phone: business.phone ?? '',
        email: business.email ?? '',
        address: business.address ?? '',
        city: business.city ?? '',
        state: business.state ?? '',
        pincode: business.pincode ?? '',
        invoice_prefix: business.invoicePrefix ?? '',
      });
    }
    setEditingBiz(true);
  };

  const handleToggleActive = async () => {
    try {
      await updateUser.mutateAsync({ id, data: { is_active: !user.is_active } });
      toast.success(user.is_active ? 'User suspended' : 'User activated');
    } catch (e: any) {
      toast.error('Failed to update user', e.message);
    }
  };

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
          <div className="min-w-0 flex-1">
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
          <Button
            size="sm"
            variant={user.is_active ? 'danger' : 'outline'}
            onClick={handleToggleActive}
            loading={updateUser.isPending}
          >
            {user.is_active ? 'Suspend' : 'Activate'}
          </Button>
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

      {/* ── Overview ── */}
      {tab === 'overview' && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Business Profile</h3>
            {!editingBiz && (
              <Button size="sm" variant="outline" leftIcon={<Edit2 className="h-3.5 w-3.5" />} onClick={startEditBiz} disabled={bizLoading}>
                Edit
              </Button>
            )}
          </div>

          {editingBiz ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Business Name', key: 'name' },
                  { label: 'GSTIN', key: 'gstin' },
                  { label: 'PAN', key: 'pan' },
                  { label: 'Phone', key: 'phone' },
                  { label: 'Email', key: 'email' },
                  { label: 'Address', key: 'address' },
                  { label: 'City', key: 'city' },
                  { label: 'State', key: 'state' },
                  { label: 'Pincode', key: 'pincode' },
                  { label: 'Invoice Prefix', key: 'invoice_prefix' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-400 uppercase font-semibold mb-1">{label}</label>
                    <input
                      type="text"
                      value={bizForm[key] ?? ''}
                      onChange={(e) => setBizForm((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" leftIcon={<Save className="h-3.5 w-3.5" />} onClick={handleSaveBiz} loading={updateBiz.isPending}>
                  Save
                </Button>
                <Button size="sm" variant="outline" leftIcon={<X className="h-3.5 w-3.5" />} onClick={() => setEditingBiz(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : business ? (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Business Name" value={business.name} />
              <Field label="GSTIN" value={business.gstin} />
              <Field label="PAN" value={business.pan} />
              <Field label="Phone" value={business.phone} />
              <Field label="Email" value={business.email} />
              <Field label="Address" value={[business.address, business.city, business.state, business.pincode].filter(Boolean).join(', ')} />
              <Field label="Invoice Prefix" value={business.invoicePrefix} />
              <Field label="Joined" value={formatDate(user.created_at)} />
            </dl>
          ) : (
            <p className="text-sm text-gray-500">No business profile set up yet.</p>
          )}
        </Card>
      )}

      {/* ── Products ── */}
      {tab === 'products' && (
        <div className="space-y-3">
          <Input
            placeholder="Search products..."
            leftAddon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Table<Product>
            columns={[
              { key: 'name', header: 'Product', cell: (p) => <div><p className="font-medium text-gray-900">{p.name}</p>{p.sku && <p className="text-xs text-gray-400">SKU: {p.sku}</p>}</div> },
              { key: 'price', header: 'Price', cell: (p) => formatCurrency(p.sellingPrice) },
              { key: 'gst', header: 'GST', cell: (p) => `${p.gstRate}%` },
              { key: 'stock', header: 'Stock', cell: (p) => (
                <span className={p.stockQuantity === 0 ? 'text-red-600 font-semibold' : p.stockQuantity <= p.lowStockAlert ? 'text-amber-600 font-semibold' : 'text-gray-700'}>
                  {p.stockQuantity} {p.unitType}
                </span>
              )},
              { key: 'status', header: 'Status', cell: (p) => (
                <Badge color={p.stockQuantity === 0 ? 'red' : p.stockQuantity <= p.lowStockAlert ? 'yellow' : 'green'}>
                  {p.stockQuantity === 0 ? 'Out of Stock' : p.stockQuantity <= p.lowStockAlert ? 'Low Stock' : 'In Stock'}
                </Badge>
              )},
            ]}
            data={products.data?.data ?? []}
            keyExtractor={(p) => p.id}
            loading={products.isLoading}
            emptyMessage="No products"
          />
        </div>
      )}

      {/* ── Customers ── */}
      {tab === 'customers' && (
        <div className="space-y-3">
          <Input
            placeholder="Search customers..."
            leftAddon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Table<Customer>
            columns={[
              { key: 'name', header: 'Customer', cell: (c) => <div><p className="font-medium text-gray-900">{c.name}</p>{c.gstin && <p className="text-xs text-gray-400">GSTIN: {c.gstin}</p>}</div> },
              { key: 'phone', header: 'Phone', cell: (c) => <span className="text-gray-500">{c.phone ?? '-'}</span> },
              { key: 'state', header: 'State', cell: (c) => <span className="text-gray-500">{c.state ?? '-'}</span> },
              { key: 'outstanding', header: 'Outstanding', cell: (c) => (
                <span className={c.outstandingBalance > 0 ? 'font-semibold text-red-600' : 'text-gray-500'}>
                  {c.outstandingBalance > 0 ? formatCurrency(c.outstandingBalance) : '-'}
                </span>
              )},
            ]}
            data={customers.data?.data ?? []}
            keyExtractor={(c) => c.id}
            loading={customers.isLoading}
            emptyMessage="No customers"
          />
        </div>
      )}

      {/* ── Bills ── */}
      {tab === 'bills' && (
        <div className="space-y-3">
          <Input
            placeholder="Search by invoice number..."
            leftAddon={<Search className="h-4 w-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Table<Bill>
            columns={[
              { key: 'invoice', header: 'Invoice', cell: (b) => <span className="font-medium text-indigo-700">#{b.invoiceNumber}</span> },
              { key: 'date', header: 'Date', cell: (b) => formatDate(b.billDate) },
              { key: 'customer', header: 'Customer', cell: (b) => b.customer?.name ?? 'Walk-in' },
              { key: 'total', header: 'Total', cell: (b) => <span className="font-semibold">{formatCurrency(b.totalAmount)}</span> },
              { key: 'status', header: 'Status', cell: (b) => <BillStatusBadge status={b.status} /> },
              { key: 'action', header: '', cell: (b) => (
                <button
                  className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-0.5"
                  onClick={(e) => { e.stopPropagation(); setSelectedBillId(b.id); }}
                >
                  Detail <ChevronRight className="h-3 w-3" />
                </button>
              )},
            ]}
            data={bills.data?.data ?? []}
            keyExtractor={(b) => b.id}
            loading={bills.isLoading}
            onRowClick={(b) => setSelectedBillId(b.id)}
            emptyMessage="No bills"
          />
        </div>
      )}

      {/* ── Accounts ── */}
      {tab === 'accounts' && (
        <div className="space-y-3">
          {accountsLoading ? <PageSpinner /> : (
            <Table<Account>
              columns={[
                { key: 'name', header: 'Account', cell: (a) => <div><p className="font-medium text-gray-900">{a.name}</p>{a.isDefault && <Badge color="indigo" size="sm">Default</Badge>}</div> },
                { key: 'type', header: 'Type', cell: (a) => <Badge color="gray">{a.accountType.toUpperCase()}</Badge> },
                { key: 'number', header: 'Account #', cell: (a) => <span className="text-gray-500 font-mono text-sm">{a.accountNumber ?? a.upiId ?? '-'}</span> },
                { key: 'ifsc', header: 'IFSC', cell: (a) => <span className="text-gray-500">{a.ifsc ?? '-'}</span> },
                { key: 'balance', header: 'Balance', cell: (a) => <span className="font-semibold text-gray-900">{formatCurrency(a.balance)}</span> },
              ]}
              data={accounts ?? []}
              keyExtractor={(a) => a.id}
              emptyMessage="No accounts configured"
            />
          )}
        </div>
      )}

      {/* ── Reports ── */}
      {tab === 'reports' && (
        <div className="space-y-4">
          {/* Date filters */}
          <Card>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-medium mb-1">End Date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              {reportTab === 'sales' && (
                <div>
                  <label className="block text-xs text-gray-500 font-medium mb-1">Group By</label>
                  <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as 'day' | 'month')}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="day">Daily</option>
                    <option value="month">Monthly</option>
                  </select>
                </div>
              )}
            </div>
          </Card>

          {/* Report sub-tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {(['sales', 'gst', 'inventory'] as const).map((rt) => (
              <button key={rt} onClick={() => setReportTab(rt)}
                className={`pb-2 px-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                  reportTab === rt ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {rt === 'gst' ? 'GST' : rt.charAt(0).toUpperCase() + rt.slice(1)}
              </button>
            ))}
          </div>

          {/* Sales Report */}
          {reportTab === 'sales' && (
            <Table<SalesReportRow>
              columns={[
                { key: 'date', header: 'Date', cell: (r) => r.date },
                { key: 'count', header: 'Invoices', cell: (r) => r.invoiceCount },
                { key: 'subtotal', header: 'Subtotal', cell: (r) => formatCurrency(r.subtotal) },
                { key: 'taxable', header: 'Taxable', cell: (r) => formatCurrency(r.taxable) },
                { key: 'tax', header: 'Tax', cell: (r) => formatCurrency(r.cgst + r.sgst + r.igst) },
                { key: 'total', header: 'Total', cell: (r) => <span className="font-bold text-indigo-700">{formatCurrency(r.total)}</span> },
              ]}
              data={salesReport.data ?? []}
              keyExtractor={(r, i) => String(i)}
              loading={salesReport.isLoading}
              emptyMessage="No sales data for selected period"
            />
          )}

          {/* GST Report */}
          {reportTab === 'gst' && (
            <Table<GSTReportRow>
              columns={[
                { key: 'invoice', header: 'Invoice #', cell: (r) => <span className="font-semibold text-indigo-700">#{r.invoiceNumber}</span> },
                { key: 'customer', header: 'Customer', cell: (r) => r.customerName },
                { key: 'date', header: 'Date', cell: (r) => formatDate(r.billDate) },
                { key: 'taxable', header: 'Taxable', cell: (r) => formatCurrency(r.taxable) },
                { key: 'cgst', header: 'CGST', cell: (r) => r.isInterstate ? '-' : formatCurrency(r.cgst) },
                { key: 'sgst', header: 'SGST', cell: (r) => r.isInterstate ? '-' : formatCurrency(r.sgst) },
                { key: 'igst', header: 'IGST', cell: (r) => r.isInterstate ? formatCurrency(r.igst) : '-' },
                { key: 'total', header: 'Total GST', cell: (r) => <span className="font-semibold">{formatCurrency(r.totalGst)}</span> },
                { key: 'type', header: 'Type', cell: (r) => <Badge color={r.isInterstate ? 'blue' : 'indigo'} size="sm">{r.isInterstate ? 'IGST' : 'CGST+SGST'}</Badge> },
              ]}
              data={gstReport.data ?? []}
              keyExtractor={(r, i) => String(i)}
              loading={gstReport.isLoading}
              emptyMessage="No GST data for selected period"
            />
          )}

          {/* Inventory Report */}
          {reportTab === 'inventory' && (
            <Table<InventoryReportRow>
              columns={[
                { key: 'name', header: 'Product', cell: (r) => (
                  <div className="flex items-center gap-2">
                    {r.isLowStock && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />}
                    <div><p className="font-medium text-gray-900">{r.name}</p>{r.sku && <p className="text-xs text-gray-400">SKU: {r.sku}</p>}</div>
                  </div>
                )},
                { key: 'category', header: 'Category', cell: (r) => r.category || '-' },
                { key: 'stock', header: 'Stock', cell: (r) => (
                  <span className={r.stockQuantity === 0 ? 'font-bold text-red-600' : r.isLowStock ? 'font-bold text-amber-600' : 'text-gray-900'}>
                    {r.stockQuantity}
                  </span>
                )},
                { key: 'price', header: 'Selling Price', cell: (r) => formatCurrency(r.sellingPrice) },
                { key: 'value', header: 'Stock Value', cell: (r) => <span className="font-semibold text-indigo-700">{formatCurrency(r.stockValue)}</span> },
                { key: 'status', header: 'Status', cell: (r) => (
                  <Badge color={r.stockQuantity === 0 ? 'red' : r.isLowStock ? 'yellow' : 'green'}>
                    {r.stockQuantity === 0 ? 'Out of Stock' : r.isLowStock ? 'Low Stock' : 'In Stock'}
                  </Badge>
                )},
              ]}
              data={inventoryReport.data ?? []}
              keyExtractor={(r) => r.id}
              loading={inventoryReport.isLoading}
              emptyMessage="No inventory data"
            />
          )}
        </div>
      )}

      {/* ── Bill Detail Modal ── */}
      <Modal
        open={!!selectedBillId}
        onClose={() => setSelectedBillId(null)}
        title={billDetail ? `Invoice #${billDetail.invoiceNumber}` : 'Bill Detail'}
        size="lg"
        footer={<Button variant="outline" onClick={() => setSelectedBillId(null)}>Close</Button>}
      >
        {billDetailLoading ? (
          <div className="flex items-center justify-center py-8"><PageSpinner /></div>
        ) : billDetail ? (
          <div className="space-y-4">
            {/* Bill meta */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Customer" value={billDetail.customer?.name ?? 'Walk-in'} />
              <Field label="Date" value={formatDate(billDetail.billDate)} />
              {billDetail.dueDate && <Field label="Due Date" value={formatDate(billDetail.dueDate)} />}
              <Field label="Status" value={billDetail.status.toUpperCase()} />
              <Field label="Account" value={billDetail.account?.name ?? '-'} />
              <Field label="Notes" value={billDetail.notes || '-'} />
            </div>

            {/* Line items */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Line Items</h4>
              <div className="rounded-lg border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {['Item', 'Qty', 'Price', 'GST%', 'Discount', 'Total'].map((h) => (
                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(billDetail.items ?? []).map((item, i) => (
                      <tr key={item.id ?? i}>
                        <td className="px-3 py-2 font-medium text-gray-900">{item.name}</td>
                        <td className="px-3 py-2 text-gray-600">{item.quantity} {item.unit}</td>
                        <td className="px-3 py-2 text-gray-600">{formatCurrency(item.price)}</td>
                        <td className="px-3 py-2 text-gray-600">{item.gstRate}%</td>
                        <td className="px-3 py-2 text-gray-600">{formatCurrency(item.discountAmount)}</td>
                        <td className="px-3 py-2 font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-lg bg-gray-50 p-3 space-y-1 text-sm">
              <TotalRow label="Subtotal" value={billDetail.subtotal} />
              {billDetail.discountAmount > 0 && <TotalRow label="Discount" value={-billDetail.discountAmount} />}
              <TotalRow label="Taxable Amount" value={billDetail.taxableAmount} />
              {!billDetail.isInterstate && billDetail.cgstAmount > 0 && (
                <>
                  <TotalRow label="CGST" value={billDetail.cgstAmount} />
                  <TotalRow label="SGST" value={billDetail.sgstAmount} />
                </>
              )}
              {billDetail.isInterstate && billDetail.igstAmount > 0 && (
                <TotalRow label="IGST" value={billDetail.igstAmount} />
              )}
              <div className="border-t border-gray-200 pt-1 flex justify-between font-bold text-indigo-700">
                <span>Total</span>
                <span>{formatCurrency(billDetail.totalAmount)}</span>
              </div>
              {billDetail.paidAmount > 0 && <TotalRow label="Paid" value={billDetail.paidAmount} />}
              {billDetail.totalAmount - billDetail.paidAmount > 0 && (
                <div className="flex justify-between font-semibold text-red-600">
                  <span>Balance Due</span>
                  <span>{formatCurrency(billDetail.totalAmount - billDetail.paidAmount)}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-8">Bill not found</p>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase font-semibold">{label}</dt>
      <dd className="text-gray-900 mt-0.5 text-sm">{value || '-'}</dd>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-gray-700">
      <span>{label}</span>
      <span className={value < 0 ? 'text-red-600' : ''}>{formatCurrency(Math.abs(value))}{value < 0 ? ' off' : ''}</span>
    </div>
  );
}
