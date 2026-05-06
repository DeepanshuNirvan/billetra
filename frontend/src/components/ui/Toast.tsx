import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useUIStore, type Toast as ToastType } from '../../store/uiStore';
import { clsx } from 'clsx';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorClasses = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const iconColorClasses = {
  success: 'text-green-500',
  error: 'text-red-500',
  warning: 'text-yellow-500',
  info: 'text-blue-500',
};

function ToastItem({ toast }: { toast: ToastType }) {
  const { removeToast } = useUIStore();
  const Icon = icons[toast.type];

  return (
    <div
      className={clsx(
        'flex items-start gap-3 rounded-xl border p-4 shadow-lg min-w-[300px] max-w-sm',
        'animate-in slide-in-from-right-5 duration-300',
        colorClasses[toast.type]
      )}
    >
      <Icon className={clsx('h-5 w-5 flex-shrink-0 mt-0.5', iconColorClasses[toast.type])} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{toast.title}</p>
        {toast.message && <p className="text-xs mt-0.5 opacity-80">{toast.message}</p>}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts } = useUIStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
