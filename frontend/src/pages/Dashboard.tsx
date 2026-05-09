import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Calendar, AlertTriangle, Receipt, Plus, FileText } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { SalesChart } from '../components/dashboard/SalesChart';
import { MonthlyRevenueChart } from '../components/dashboard/MonthlyRevenueChart';
import { OverdueAgingWidget } from '../components/dashboard/OverdueAgingWidget';
import { TopCustomersWidget } from '../components/dashboard/TopCustomersWidget';
import { Card, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BillStatusBadge } from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency, formatDate } from '../utils/format';
import { useAuthStore } from '../store/authStore';

export default function Dashboard() {
  const navigate = useNavigate();
  const { business } = useAuthStore();
  const { data, isLoading, error } = useDashboard();

  if (isLoading) return <PageSpinner />;

  if (error || !data) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Receipt}
          title="Failed to load dashboard"
          description="Please check your connection and try again."
        />
      </div>
    );
  }

  const todayTrend =
    data.yesterday_sales > 0
      ? Math.round(((data.today_sales - data.yesterday_sales) / data.yesterday_sales) * 100)
      : 0;
  const monthTrend =
    data.last_month_sales > 0
      ? Math.round(((data.month_sales - data.last_month_sales) / data.last_month_sales) * 100)
      : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {getTimeGreeting()}, {business?.name ?? 'there'}!
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Here&apos;s your business overview</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/bills/create')}>
          New Bill
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(data.today_sales)}
          icon={TrendingUp}
          color="indigo"
          trend={{ value: todayTrend, label: 'vs yesterday' }}
        />
        <StatCard
          title="Month Sales"
          value={formatCurrency(data.month_sales)}
          icon={Calendar}
          color="emerald"
          trend={{ value: monthTrend, label: 'vs last month' }}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(data.total_outstanding)}
          subtitle={`${data.pending_bills} pending bills`}
          icon={Receipt}
          color="amber"
        />
        <StatCard
          title="GST Collected"
          value={formatCurrency(data.gst_collected)}
          subtitle="This month"
          icon={FileText}
          color="rose"
        />
      </div>

      {/* Sales trend + Bill summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart data={data.sales_chart ?? []} />
        </div>
        <Card>
          <CardHeader title="Bill Summary" />
          <div className="space-y-4">
            {[
              { label: 'Total Bills', value: data.total_bills, color: 'text-gray-900' },
              { label: 'Paid',        value: data.paid_bills,    color: 'text-green-600' },
              { label: 'Pending',     value: data.pending_bills, color: 'text-yellow-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{label}</span>
                <span className={`text-sm font-bold ${color}`}>{value}</span>
              </div>
            ))}
            <div className="pt-2">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${data.total_bills > 0 ? (data.paid_bills / data.total_bills) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {data.total_bills > 0
                  ? Math.round((data.paid_bills / data.total_bills) * 100)
                  : 0}
                % collection rate
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Monthly Revenue + Overdue Aging */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyRevenueChart data={data.monthly_revenue ?? []} />
        <OverdueAgingWidget aging={data.overdue_aging ?? null} />
      </div>

      {/* Recent Bills + Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Bills</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/bills')}>
                View all
              </Button>
            </div>
            {data.recent_bills.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No bills yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.recent_bills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-surface-alt cursor-pointer transition-colors"
                    onClick={() => navigate(`/bills/${bill.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">#{bill.invoice_number}</p>
                      <p className="text-xs text-gray-400">
                        {bill.customer_name || 'Walk-in'} • {formatDate(bill.bill_date)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <BillStatusBadge status={bill.status as any} />
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(bill.total_amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card padding="none">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Low Stock</h3>
            {data.low_stock_products?.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                {data.low_stock_products.length} items
              </span>
            )}
          </div>
          {!data.low_stock_products?.length ? (
            <div className="py-12 text-center text-gray-400 text-sm">All stock levels OK</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.low_stock_products.slice(0, 6).map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-400">Alert at {p.lowStockAlert}</p>
                  </div>
                  <span
                    className={`text-sm font-bold ml-3 ${
                      p.stockQuantity === 0 ? 'text-red-600' : 'text-amber-600'
                    }`}
                  >
                    {p.stockQuantity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Top Products + Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data.top_products?.length > 0 && (
          <Card>
            <CardHeader title="Top Products" subtitle="By revenue this month" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-3 text-xs font-semibold text-gray-400 uppercase">Product</th>
                    <th className="text-right pb-3 text-xs font-semibold text-gray-400 uppercase">Qty</th>
                    <th className="text-right pb-3 text-xs font-semibold text-gray-400 uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.top_products.map((p, i) => (
                    <tr key={i}>
                      <td className="py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="py-3 text-right text-gray-600">{p.total_qty}</td>
                      <td className="py-3 text-right font-semibold text-primary-700">
                        {formatCurrency(p.total_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        <TopCustomersWidget customers={data.top_customers ?? []} />
      </div>
    </div>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
