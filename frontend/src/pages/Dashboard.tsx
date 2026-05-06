import { useNavigate } from 'react-router-dom';
import { TrendingUp, Calendar, AlertTriangle, Receipt, Plus, FileText } from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { SalesChart } from '../components/dashboard/SalesChart';
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

  const chartData = data.salesChart ?? [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Good {getTimeGreeting()}, {business?.name ?? 'there'}!
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Here's your business overview</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={() => navigate('/bills/create')}>
          New Bill
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(data.todaySales)}
          icon={TrendingUp}
          color="indigo"
          trend={{ value: 12, label: 'vs yesterday' }}
        />
        <StatCard
          title="Month Sales"
          value={formatCurrency(data.monthSales)}
          icon={Calendar}
          color="emerald"
          trend={{ value: 8, label: 'vs last month' }}
        />
        <StatCard
          title="Outstanding"
          value={formatCurrency(data.totalOutstanding)}
          subtitle={`${data.pendingBills} pending bills`}
          icon={Receipt}
          color="amber"
        />
        <StatCard
          title="GST Collected"
          value={formatCurrency(data.gstCollected)}
          subtitle="This month"
          icon={FileText}
          color="rose"
        />
      </div>

      {/* Chart + Quick stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart data={chartData} />
        </div>
        <Card>
          <CardHeader title="Bill Summary" />
          <div className="space-y-4">
            {[
              { label: 'Total Bills', value: data.totalBills, color: 'text-gray-900' },
              { label: 'Paid', value: data.paidBills, color: 'text-green-600' },
              { label: 'Pending', value: data.pendingBills, color: 'text-yellow-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{label}</span>
                <span className={`text-sm font-bold ${color}`}>{value}</span>
              </div>
            ))}

            <div className="pt-2">
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${data.totalBills > 0 ? (data.paidBills / data.totalBills) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {data.totalBills > 0
                  ? Math.round((data.paidBills / data.totalBills) * 100)
                  : 0}% collection rate
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bills */}
        <div className="lg:col-span-2">
          <Card padding="none">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Bills</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/bills')}>
                View all
              </Button>
            </div>
            {data.recentBills.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No bills yet</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data.recentBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/bills/${bill.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">#{bill.invoiceNumber}</p>
                      <p className="text-xs text-gray-400">
                        {bill.customer?.name ?? 'Walk-in'} • {formatDate(bill.billDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <BillStatusBadge status={bill.status} />
                      <span className="text-sm font-semibold text-gray-900">
                        {formatCurrency(bill.totalAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Low Stock Alerts */}
        <Card padding="none">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Low Stock</h3>
            {data.lowStockProducts.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" />
                {data.lowStockProducts.length} items
              </span>
            )}
          </div>
          {data.lowStockProducts.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">All stock levels OK</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.lowStockProducts.slice(0, 6).map((p) => (
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

      {/* Top Products */}
      {data.topProducts.length > 0 && (
        <Card>
          <CardHeader title="Top Products" subtitle="By revenue this month" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-3 text-xs font-semibold text-gray-400 uppercase">Product</th>
                  <th className="text-right pb-3 text-xs font-semibold text-gray-400 uppercase">Qty Sold</th>
                  <th className="text-right pb-3 text-xs font-semibold text-gray-400 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.topProducts.map((p, i) => (
                  <tr key={i}>
                    <td className="py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="py-3 text-right text-gray-600">{p.quantity}</td>
                    <td className="py-3 text-right font-semibold text-indigo-700">
                      {formatCurrency(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
