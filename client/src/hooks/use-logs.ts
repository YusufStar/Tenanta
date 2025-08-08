import { useQuery } from '@tanstack/react-query';
import { api, handleApiResponse, handleApiError } from '@/lib/api';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  id: string;
  timestamp: string;
  metricName: string;
  metricValue: number;
  metricUnit?: string;
  thresholdValue?: number;
  status: 'healthy' | 'warning' | 'critical';
  metadata?: Record<string, any>;
}

interface UseLogsOptions {
  limit?: number;
  offset?: number;
  level?: string;
  tenantId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// API functions
const fetchSystemLogs = async (options: {
  limit: number;
  offset: number;
  level?: string;
  tenantId?: string;
}): Promise<{ logs: LogEntry[] }> => {
  try {
    const params = new URLSearchParams({
      limit: options.limit.toString(),
      offset: options.offset.toString(),
      ...(options.level && { level: options.level }),
      ...(options.tenantId && { tenantId: options.tenantId })
    });

    const response = await api.get(`/logs/system?${params}`);
    const data = handleApiResponse<{ logs: LogEntry[] }>(response);
    
    return { logs: data.logs || [] };
  } catch (error: any) {
    throw handleApiError(error);
  }
};

const fetchApplicationLogs = async (options: {
  limit: number;
  offset: number;
  level?: string;
}): Promise<{ logs: LogEntry[] }> => {
  try {
    const params = new URLSearchParams({
      limit: options.limit.toString(),
      offset: options.offset.toString(),
      ...(options.level && { level: options.level })
    });

    const response = await api.get(`/logs/application?${params}`);
    const data = handleApiResponse<{ logs: LogEntry[] }>(response);
    
    return { logs: data.logs || [] };
  } catch (error: any) {
    throw handleApiError(error);
  }
};

const fetchPerformanceMetrics = async (options: {
  tenantId?: string;
  limit: number;
  metricName?: string;
}): Promise<{ metrics: PerformanceMetric[] }> => {
  try {
    const params = new URLSearchParams({
      limit: options.limit.toString(),
      ...(options.tenantId && { tenantId: options.tenantId }),
      ...(options.metricName && { metricName: options.metricName })
    });

    const response = await api.get(`/logs/metrics?${params}`);
    const data = handleApiResponse<{ metrics: PerformanceMetric[] }>(response);
    
    return { metrics: data.metrics || [] };
  } catch (error: any) {
    throw handleApiError(error);
  }
};

const fetchLogStats = async (options: { tenantId?: string }): Promise<{
  stats: {
    total: number;
    byLevel: Record<string, number>;
    recentActivity: number;
  };
}> => {
  try {
    const params = new URLSearchParams();
    if (options.tenantId) {
      params.append('tenantId', options.tenantId);
    }

    const response = await api.get(`/logs/stats?${params}`);
    const data = handleApiResponse<{
      stats: {
        total: number;
        byLevel: Record<string, number>;
        recentActivity: number;
      };
    }>(response);
    
    return { stats: data.stats };
  } catch (error: any) {
    throw handleApiError(error);
  }
};

// React Query hooks
export function useSystemLogs(options: UseLogsOptions = {}) {
  const {
    limit = 100,
    offset = 0,
    level,
    tenantId,
    autoRefresh = false,
    refreshInterval = 5000
  } = options;

  return useQuery({
    queryKey: ['system-logs', limit, offset, level, tenantId],
    queryFn: () => fetchSystemLogs({ limit, offset, level, tenantId }),
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 10000, // Consider data fresh for 10 seconds
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
  });
}

export function useApplicationLogs(options: UseLogsOptions = {}) {
  const {
    limit = 100,
    offset = 0,
    level,
    autoRefresh = false,
    refreshInterval = 5000
  } = options;

  return useQuery({
    queryKey: ['application-logs', limit, offset, level],
    queryFn: () => fetchApplicationLogs({ limit, offset, level }),
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 10000, // Consider data fresh for 10 seconds
    gcTime: 2 * 60 * 1000, // Keep in cache for 2 minutes
  });
}

export function usePerformanceMetrics(options: {
  tenantId?: string;
  limit?: number;
  metricName?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
} = {}) {
  const {
    tenantId,
    limit = 60,
    metricName,
    autoRefresh = false,
    refreshInterval = 10000
  } = options;

  return useQuery({
    queryKey: ['performance-metrics', tenantId, limit, metricName],
    queryFn: () => fetchPerformanceMetrics({ tenantId, limit, metricName }),
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

export function useLogStats(options: { tenantId?: string } = {}) {
  const { tenantId } = options;

  return useQuery({
    queryKey: ['log-stats', tenantId],
    queryFn: () => fetchLogStats({ tenantId }),
    staleTime: 60000, // Consider data fresh for 1 minute
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
} 