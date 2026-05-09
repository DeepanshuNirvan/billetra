import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader } from '../ui/Card';
import { formatCurrency } from '../../utils/format';

interface Props {
  data: { month: string; amount: number }[];
}

export function MonthlyRevenueChart({ data }: Props) {
  return (
    <Card>
      <CardHeader title="Monthly Revenue" subtitle="Last 6 months" />
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
          <Tooltip formatter={(v: number) => [formatCurrency(v), 'Revenue']} />
          <Bar dataKey="amount" fill="var(--color-primary-500)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
