import apiClient from './client';
import type { AuditLogEntry, ApiResponse } from '../types';

interface AuditPage {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export const auditApi = {
  list: async (entityType: string, entityId: string, page = 1): Promise<AuditPage> => {
    const { data } = await apiClient.get<ApiResponse<AuditPage>>('/audit-logs', {
      params: { entity_type: entityType, entity_id: entityId, page, limit: 20 },
    });
    if (!data.success || !data.data) throw new Error(data.error ?? 'Failed');
    return data.data;
  },
};
