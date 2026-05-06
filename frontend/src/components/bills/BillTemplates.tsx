import { BILL_TEMPLATES } from '../../utils/constants';
import { clsx } from 'clsx';
import { CheckCircle } from 'lucide-react';

interface BillTemplatesProps {
  value: string;
  onChange: (template: string) => void;
}

const templateIcons: Record<string, string> = {
  MODERN_MINIMAL: '🎨',
  CLASSIC_GST: '📋',
  RETAIL_COMPACT: '🛒',
  THERMAL: '🖨️',
  CORPORATE: '💼',
};

export function BillTemplates({ value, onChange }: BillTemplatesProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {BILL_TEMPLATES.map((tpl) => (
        <button
          key={tpl.value}
          type="button"
          onClick={() => onChange(tpl.value)}
          className={clsx(
            'relative rounded-xl border-2 p-4 text-left transition-all',
            value === tpl.value
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          )}
        >
          {value === tpl.value && (
            <CheckCircle className="absolute top-2 right-2 h-4 w-4 text-indigo-500" />
          )}
          <div className="text-2xl mb-2">{templateIcons[tpl.value]}</div>
          <p className={clsx('text-sm font-medium', value === tpl.value ? 'text-indigo-700' : 'text-gray-700')}>
            {tpl.label}
          </p>
        </button>
      ))}
    </div>
  );
}
