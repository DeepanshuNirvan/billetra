import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { Card, CardHeader } from '../ui/Card';
import { formatCurrency } from '../../utils/format';
import { useState } from 'react';
import { Button } from '../ui/Button';

interface DataPoint {
  date: string;
  amount: number;
}

interface SalesChartProps {
  data: DataPoint[];
  title?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 shadow-lg p-3">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-sm font-bold text-indigo-600">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export function SalesChart({ data, title = 'Sales Overview' }: SalesChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle="Last 7 days"
        action={
          <div className="flex gap-1">
            <Button
              size="xs"
              variant={chartType === 'bar' ? 'primary' : 'outline'}
              onClick={() => setChartType('bar')}
            >
              Bar
            </Button>
            <Button
              size="xs"
              variant={chartType === 'line' ? 'primary' : 'outline'}
              onClick={() => setChartType('line')}
            >
              Line
            </Button>
          </div>
        }
      />
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="amount" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          ) : (
            <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#4f46e5"
                strokeWidth={2.5}
                dot={{ fill: '#4f46e5', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
