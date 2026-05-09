import { Card, CardHeader } from '../ui/Card';
import { formatCurrency } from '../../utils/format';

interface Props {
  customers: { name: string; total_amount: number; total_bills: number }[];
}

export function TopCustomersWidget({ customers }: Props) {
  if (!customers.length) return null;

  return (
    <Card padding="none">
      <div className="px-5 py-4 border-b border-gray-50">
        <CardHeader title="Top Customers" subtitle="By revenue" />
      </div>
      <div className="divide-y divide-gray-50">
        {customers.map((c, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-400">{c.total_bills} bills</p>
              </div>
            </div>
            <span className="text-sm font-semibold text-primary-700 ml-3 flex-shrink-0">
              {formatCurrency(c.total_amount)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
