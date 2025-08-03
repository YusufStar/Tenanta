import { useState, useEffect } from 'react';

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

export function useSystemLogs(options: UseLogsOptions = {}) {
  const {
    limit = 100,
    offset = 0,
    level,
    tenantId,
    autoRefresh = false,
    refreshInterval = 5000
  } = options;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(level && { level }),
        ...(tenantId && { tenantId })
      });

      const response = await fetch(`/api/v1/logs/system?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setLogs(data.data.logs || []);
      } else {
        throw new Error(data.message || 'Failed to fetch logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching system logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    if (autoRefresh) {
      const interval = setInterval(fetchLogs, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [limit, offset, level, tenantId, autoRefresh, refreshInterval]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs
  };
}

export function useApplicationLogs(options: UseLogsOptions = {}) {
  const {
    limit = 100,
    offset = 0,
    level,
    autoRefresh = false,
    refreshInterval = 5000
  } = options;

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        ...(level && { level })
      });

      const response = await fetch(`/api/v1/logs/application?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setLogs(data.data.logs || []);
      } else {
        throw new Error(data.message || 'Failed to fetch logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching application logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    if (autoRefresh) {
      const interval = setInterval(fetchLogs, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [limit, offset, level, autoRefresh, refreshInterval]);

  return {
    logs,
    loading,
    error,
    refetch: fetchLogs
  };
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

  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        ...(tenantId && { tenantId }),
        ...(metricName && { metricName })
      });

      const response = await fetch(`/api/v1/logs/metrics?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setMetrics(data.data.metrics || []);
      } else {
        throw new Error(data.message || 'Failed to fetch metrics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching performance metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [tenantId, limit, metricName, autoRefresh, refreshInterval]);

  return {
    metrics,
    loading,
    error,
    refetch: fetchMetrics
  };
}

export function useLogStats(options: { tenantId?: string } = {}) {
  const { tenantId } = options;
  const [stats, setStats] = useState<{
    total: number;
    byLevel: Record<string, number>;
    recentActivity: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (tenantId) {
        params.append('tenantId', tenantId);
      }

      const response = await fetch(`/api/v1/logs/stats?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch log stats: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setStats(data.data.stats);
      } else {
        throw new Error(data.message || 'Failed to fetch log stats');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching log stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [tenantId]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
} 