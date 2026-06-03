import { clsx } from 'clsx';

type BadgeColor = 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'indigo' | 'emerald' | 'orange';

interface BadgeProps {
  color?: BadgeColor;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const colorClasses: Record<BadgeColor, string> = {
  gray: 'bg-gray-100 text-gray-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  orange: 'bg-orange-100 text-orange-700',
};

const dotColorClasses: Record<BadgeColor, string> = {
  gray: 'bg-gray-500',
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  orange: 'bg-orange-500',
};

export function Badge({ color = 'gray', children, size = 'sm', dot = false, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        colorClasses[color],
        className
      )}
    >
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', dotColorClasses[color])} />}
      {children}
    </span>
  );
}

export function BillStatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, BadgeColor> = {
    pending: 'yellow',
    partial: 'blue',
    paid: 'green',
    overdue: 'red',
    cancelled: 'gray',
  };

  const labelMap: Record<string, string> = {
    pending: 'Pending',
    partial: 'Partial',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled',
  };

  return (
    <Badge color={colorMap[status] ?? 'gray'} dot>
      {labelMap[status] ?? status}
    </Badge>
  );
}
