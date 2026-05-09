import { Card, CardHeader } from '../ui/Card';
import { formatCurrency } from '../../utils/format';

interface Props {
  aging: {
    days_0_30: number;
    days_31_60: number;
    days_61_90: number;
    days_90_plus: number;
  } | null;
}

export function OverdueAgingWidget({ aging }: Props) {
  if (!aging) return null;

  const buckets = [
    { label: '0–30 days',  value: aging.days_0_30,  color: 'bg-yellow-400' },
    { label: '31–60 days', value: aging.days_31_60, color: 'bg-orange-400' },
    { label: '61–90 days', value: aging.days_61_90, color: 'bg-red-400' },
    { label: '90+ days',   value: aging.days_90_plus, color: 'bg-red-700' },
  ];
  const total = buckets.reduce((s, b) => s + b.value, 0);

  return (
    <Card>
      <CardHeader title="Overdue Aging" subtitle={total > 0 ? `Total: ${formatCurrency(total)}` : 'No overdue'} />
      {total === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">No overdue receivables</p>
      ) : (
        <div className="space-y-3">
          {buckets.map((b) => (
            <div key={b.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">{b.label}</span>
                <span className="font-medium text-gray-900">{formatCurrency(b.value)}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${b.color} rounded-full transition-all duration-500`}
                  style={{ width: `${(b.value / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
