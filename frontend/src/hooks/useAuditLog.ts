import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../api/audit';

export function useAuditLog(entityType: string, entityId: string, page = 1) {
  return useQuery({
    queryKey: ['audit', entityType, entityId, page],
    queryFn: () => auditApi.list(entityType, entityId, page),
    enabled: !!entityId,
  });
}
