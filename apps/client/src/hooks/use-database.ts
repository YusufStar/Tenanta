import { useState, useEffect, useCallback } from 'react';

export interface TableInfo {
  tableName: string;
  tableSchema: string;
  rowCount: number;
  size: string;
  lastModified: Date;
}

export interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  columnDefault?: string;
  characterMaximumLength?: number;
}

export interface TableData {
  columns: ColumnInfo[];
  data: any[];
  totalCount: number;
  page: number;
  limit: number;
}

export interface DatabaseHealth {
  status: 'healthy' | 'warning' | 'critical';
  activeConnections: number;
  totalConnections: number;
  databaseSize: string;
  uptime: string;
}

interface UseDatabaseOptions {
  tenantId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useDatabase(options: UseDatabaseOptions = {}) {
  const { tenantId, autoRefresh = false, refreshInterval = 30000 } = options;
  
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [health, setHealth] = useState<DatabaseHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tenant tables
  const fetchTables = useCallback(async () => {
    if (!tenantId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/v1/database/tenants/${tenantId}/tables`);
      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }
      
      const result = await response.json();
      setTables(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tables');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Fetch table data
  const fetchTableData = useCallback(async (
    tableName: string, 
    page: number = 1, 
    limit: number = 50,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ) => {
    if (!tenantId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortOrder
      });
      
      if (sortBy) {
        params.append('sortBy', sortBy);
      }
      
      const response = await fetch(
        `/api/v1/database/tenants/${tenantId}/tables/${tableName}/data?${params}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch table data');
      }
      
      const result = await response.json();
      setTableData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch table data');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  // Fetch database health
  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/v1/database/health');
      if (!response.ok) {
        throw new Error('Failed to fetch database health');
      }
      
      const result = await response.json();
      setHealth(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch database health');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && tenantId) {
      fetchTables();
      fetchHealth();
      
      const interval = setInterval(() => {
        fetchTables();
        fetchHealth();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, tenantId, refreshInterval, fetchTables, fetchHealth]);

  // Initial load
  useEffect(() => {
    if (tenantId) {
      fetchTables();
      fetchHealth();
    }
  }, [tenantId, fetchTables, fetchHealth]);

  return {
    tables,
    selectedTable,
    setSelectedTable,
    tableData,
    health,
    loading,
    error,
    fetchTables,
    fetchTableData,
    fetchHealth,
    refetch: () => {
      if (tenantId) {
        fetchTables();
        fetchHealth();
      }
    }
  };
} 