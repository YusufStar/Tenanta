import { useQuery } from '@tanstack/react-query';
import { api, handleApiError } from '@/lib/api';

export interface TenantDashboardData {
  tenant: {
    id: string;
    name: string;
    slug: string;
    schemaName: string;
    createdAt: string;
    updatedAt: string;
    isActive: boolean;
  };
  connection: { postgresql: boolean; redis: boolean };
  connectionStrings: { postgres: string; masked: string };
  database: {
    sizeBytes: number;
    sizePretty: string;
    totalTables: number;
    totalRows: number;
    activeConnections: number;
    version: string;
    currentTime: string;
    dbName: string;
    topTables: { tableName: string; sizeBytes: number; sizePretty: string }[];
  };
  history: {
    latest: Array<{
      id: string;
      query_text: string;
      execution_timestamp: string;
      execution_time_ms: number;
      rows_affected: number;
      success: boolean;
    }>;
    metrics7d: {
      series: Array<{ day: string; total: number; success: number; failure: number }>;
      totals: { total: number; success: number; failure: number };
    };
  };
  logs: Array<{
    id: string;
    timestamp: string;
    level: 'info' | 'warning' | 'error' | 'success';
    message: string;
    source?: string;
    metadata?: Record<string, any>;
  }>;
}

export const getTenantDashboard = async (tenantId: string): Promise<TenantDashboardData> => {
  const res = await api.get(`/tenants/${tenantId}/dashboard`);
  if (res.data?.success) return res.data.data as TenantDashboardData;
  throw handleApiError({ response: res } as any);
};

export function useTenantDashboard(tenantId?: string) {
  return useQuery({
    queryKey: ['tenant-dashboard', tenantId],
    queryFn: () => getTenantDashboard(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 30_000,
  });
}
