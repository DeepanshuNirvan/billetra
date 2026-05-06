import { type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { Card } from '../ui/Card';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: 'indigo' | 'emerald' | 'amber' | 'rose';
}

const colorMap = {
  indigo: {
    bg: 'bg-indigo-50',
    icon: 'text-indigo-600',
    trend: 'text-indigo-600',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'text-emerald-600',
    trend: 'text-emerald-600',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'text-amber-600',
    trend: 'text-amber-600',
  },
  rose: {
    bg: 'bg-rose-50',
    icon: 'text-rose-600',
    trend: 'text-rose-600',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'indigo',
}: StatCardProps) {
  const colors = colorMap[color];

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 truncate">{value}</p>
          {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={clsx(
                  'text-xs font-semibold',
                  trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'
                )}
              >
                {trend.value >= 0 ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-xs text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={clsx('rounded-xl p-3 flex-shrink-0', colors.bg)}>
          <Icon className={clsx('h-6 w-6', colors.icon)} />
        </div>
      </div>
    </Card>
  );
}
