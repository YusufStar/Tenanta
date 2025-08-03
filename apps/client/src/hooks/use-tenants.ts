import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, handleApiResponse, handleApiError } from '@/lib/api';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface CreateTenantRequest {
  name: string;
  slug: string;
  schemaName: string;
}

export interface UpdateTenantRequest {
  name?: string;
  slug?: string;
  schemaName?: string;
  isActive?: boolean;
}

export interface PaginatedTenantsResponse {
  tenants: Tenant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TenantConnectionStatus {
  postgresql: boolean;
  redis: boolean;
  tenant: Tenant;
}

interface UseTenantsOptions {
  page?: number;
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// API functions
const fetchTenants = async (page: number = 1, limit: number = 10): Promise<PaginatedTenantsResponse> => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });

    const response = await api.get(`/tenants?${params}`);
    const data = handleApiResponse(response);
    
    return {
      tenants: Array.isArray(data) ? data : [],
      pagination: response.data.pagination || { page, limit, total: 0, totalPages: 0 }
    };
  } catch (error) {
    throw handleApiError(error);
  }
};

const fetchTenantById = async (tenantId: string): Promise<Tenant> => {
  try {
    const response = await api.get(`/tenants/${tenantId}`);
    return handleApiResponse(response);
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Tenant not found');
    }
    throw handleApiError(error);
  }
};

const createTenant = async (tenantData: CreateTenantRequest): Promise<Tenant> => {
  try {
    const response = await api.post('/tenants', tenantData);
    return handleApiResponse(response);
  } catch (error) {
    throw handleApiError(error);
  }
};

const deleteTenant = async (tenantId: string): Promise<boolean> => {
  try {
    const response = await api.delete(`/tenants/${tenantId}`);
    return handleApiResponse(response);
  } catch (error) {
    throw handleApiError(error);
  }
};

// React Query hooks
export function useTenants(options: UseTenantsOptions = {}) {
  const {
    page = 1,
    limit = 10,
    autoRefresh = false,
    refreshInterval = 10000
  } = options;

  return useQuery({
    queryKey: ['tenants', page, limit],
    queryFn: () => fetchTenants(page, limit),
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

export function useTenantById(tenantId: string) {
  return useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => fetchTenantById(tenantId),
    enabled: !!tenantId,
    staleTime: 60000, // Consider data fresh for 1 minute
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      // Invalidate and refetch tenants list
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTenant,
    onSuccess: (_, deletedTenantId) => {
      // Remove the specific tenant from cache
      queryClient.removeQueries({ queryKey: ['tenant', deletedTenantId] });
      // Invalidate tenants list
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
} 