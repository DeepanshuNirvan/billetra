import { Clock, User, ChevronRight } from 'lucide-react';
import { useAuditLog } from '../../hooks/useAuditLog';
import { formatDate } from '../../utils/format';

interface Props {
  entityType: string;
  entityId: string;
}

const ACTION_STYLES: Record<string, string> = {
  create: 'bg-green-100 text-green-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
};

export function AuditHistory({ entityType, entityId }: Props) {
  const { data, isLoading } = useAuditLog(entityType, entityId, 1);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const logs = data?.data ?? [];

  if (!logs.length) {
    return <p className="text-sm text-gray-400 text-center py-8">No history available</p>;
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-100" />
      <div className="space-y-4">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-4 relative">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${ACTION_STYLES[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
              <ChevronRight className="h-4 w-4" />
            </div>
            <div className="flex-1 bg-white border border-gray-100 rounded-lg px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${ACTION_STYLES[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                  {log.action}
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(log.createdAt)}
                </span>
              </div>
              {log.userId && (
                <p className="text-xs text-gray-500 mt-1.5 flex items-center gap-1">
                  <User className="h-3 w-3" />
                  User #{log.userId}
                </p>
              )}
              {log.newData && Object.keys(log.newData).length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">View changes</summary>
                  <pre className="mt-1 text-xs bg-gray-50 rounded p-2 overflow-auto max-h-32 text-gray-700">
                    {JSON.stringify(log.newData, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
