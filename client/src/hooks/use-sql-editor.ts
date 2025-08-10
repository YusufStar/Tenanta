import { useMutation, useQuery } from '@tanstack/react-query';
import { api, handleApiResponse, handleApiError } from '@/lib/api';

// Types
export interface QueryResult {
  success: boolean;
  data?: any[];
  columns?: string[];
  rowsAffected: number;
  executionTime: number;
  error?: string;
}

export interface ExecuteQueryRequest {
  query: string;
}

export interface QueryValidation {
  isValid: boolean;
  error?: string;
}

export interface DatabaseStatus {
  status: string;
  currentTime: string;
  version: string;
  tenantId: string;
}

export interface QueryHistoryItem {
  id: string;
  query_text: string;
  execution_timestamp: string;
  execution_time_ms: number;
  rows_affected: number;
  success: boolean;
  error_message?: string;
  result_columns: string[];
  created_at: string;
}

export interface QueryHistoryResponse {
  data: QueryHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// API functions
const executeQuery = async (tenantId: string, request: ExecuteQueryRequest): Promise<QueryResult> => {
  try {
    const response = await api.post(`/database/${tenantId}/execute`, request);
    return handleApiResponse<QueryResult>(response);
  } catch (error) {
    throw handleApiError(error);
  }
};

const validateQuery = async (request: { query: string }): Promise<QueryValidation> => {
  try {
    const response = await api.post('/database/validate', request);
    return handleApiResponse<QueryValidation>(response);
  } catch (error) {
    throw handleApiError(error);
  }
};

const getDatabaseStatus = async (tenantId: string): Promise<DatabaseStatus> => {
  try {
    const response = await api.get(`/database/${tenantId}/status`);
    return handleApiResponse<DatabaseStatus>(response);
  } catch (error) {
    throw handleApiError(error);
  }
};

const getQueryHistory = async (
  tenantId: string,
  options: {
    page?: number;
    limit?: number;
    successOnly?: boolean;
    fromDate?: string;
    toDate?: string;
  } = {}
): Promise<QueryHistoryResponse> => {
  try {
    const params = new URLSearchParams();
    
    if (options.page) params.append('page', options.page.toString());
    if (options.limit) params.append('limit', options.limit.toString());
    if (options.successOnly !== undefined) params.append('successOnly', options.successOnly.toString());
    if (options.fromDate) params.append('fromDate', options.fromDate);
    if (options.toDate) params.append('toDate', options.toDate);

    const response = await api.get(`/database/${tenantId}/history?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Hooks
export const useExecuteQuery = (tenantId: string) => {
  return useMutation({
    mutationFn: (request: ExecuteQueryRequest) => executeQuery(tenantId, request),
    onSuccess: (data) => {
      console.log('✅ Query executed successfully:', data);
    },
    onError: (error) => {
      console.error('❌ Query execution failed:', error);
    },
  });
};

export const useValidateQuery = () => {
  return useMutation({
    mutationFn: validateQuery,
    onSuccess: (data) => {
      console.log('✅ Query validated successfully:', data);
    },
    onError: (error) => {
      console.error('❌ Query validation failed:', error);
    },
  });
};

export const useDatabaseStatus = (tenantId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['database-status', tenantId],
    queryFn: () => getDatabaseStatus(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 1,
  });
};

export const useQueryHistory = (
  tenantId: string,
  options: {
    page?: number;
    limit?: number;
    successOnly?: boolean;
    fromDate?: string;
    toDate?: string;
  } = {},
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['query-history', tenantId, options],
    queryFn: () => getQueryHistory(tenantId, options),
    enabled: enabled && !!tenantId,
    refetchInterval: 1000,
    retry: 1,
  });
};
