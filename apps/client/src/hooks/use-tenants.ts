import { useState, useEffect } from 'react';

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

export function useTenants(options: UseTenantsOptions = {}) {
  const {
    page = 1,
    limit = 10,
    autoRefresh = false,
    refreshInterval = 10000
  } = options;

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`/api/v1/tenants?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tenants: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setTenants(Array.isArray(data.data) ? data.data : []);
        setPagination(data.pagination || null);
      } else {
        throw new Error(data.message || 'Failed to fetch tenants');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();

    if (autoRefresh) {
      const interval = setInterval(fetchTenants, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [page, limit, autoRefresh, refreshInterval]);

  return {
    tenants,
    pagination,
    loading,
    error,
    refetch: fetchTenants
  };
}

export function useTenantById(tenantId: string) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/tenants/${tenantId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setTenant(null);
          setLoading(false);
          return;
        }
        throw new Error(`Failed to fetch tenant: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setTenant(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch tenant');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching tenant:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [tenantId]);

  return {
    tenant,
    loading,
    error,
    refetch: fetchTenant
  };
}

export function useTenantConnectionTest(tenantId: string) {
  const [connectionStatus, setConnectionStatus] = useState<TenantConnectionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async () => {
    if (!tenantId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/v1/tenants/${tenantId}?action=connection-test`);
      
      if (!response.ok) {
        throw new Error(`Failed to test connection: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        setConnectionStatus(data.data);
      } else {
        throw new Error(data.message || 'Failed to test connection');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error testing connection:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    connectionStatus,
    loading,
    error,
    testConnection
  };
}

export function useCreateTenant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTenant, setCreatedTenant] = useState<Tenant | null>(null);

  const createTenant = async (tenantData: CreateTenantRequest) => {
    try {
      setLoading(true);
      setError(null);
      setCreatedTenant(null);

      const response = await fetch('/api/v1/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tenantData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create tenant');
      }

      if (data.success && data.data) {
        setCreatedTenant(data.data);
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to create tenant');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error creating tenant:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createTenant,
    loading,
    error,
    createdTenant,
    reset: () => {
      setError(null);
      setCreatedTenant(null);
    }
  };
}

export function useUpdateTenant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedTenant, setUpdatedTenant] = useState<Tenant | null>(null);

  const updateTenant = async (tenantId: string, tenantData: UpdateTenantRequest) => {
    try {
      setLoading(true);
      setError(null);
      setUpdatedTenant(null);

      const response = await fetch(`/api/v1/tenants/${tenantId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tenantData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update tenant');
      }

      if (data.success && data.data) {
        setUpdatedTenant(data.data);
        return data.data;
      } else {
        throw new Error(data.message || 'Failed to update tenant');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error updating tenant:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    updateTenant,
    loading,
    error,
    updatedTenant,
    reset: () => {
      setError(null);
      setUpdatedTenant(null);
    }
  };
}

export function useDeleteTenant() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletedTenantId, setDeletedTenantId] = useState<string | null>(null);

  const deleteTenant = async (tenantId: string) => {
    try {
      setLoading(true);
      setError(null);
      setDeletedTenantId(null);

      const response = await fetch(`/api/v1/tenants/${tenantId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete tenant');
      }

      if (data.success) {
        setDeletedTenantId(tenantId);
        return true;
      } else {
        throw new Error(data.message || 'Failed to delete tenant');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Error deleting tenant:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    deleteTenant,
    loading,
    error,
    deletedTenantId,
    reset: () => {
      setError(null);
      setDeletedTenantId(null);
    }
  };
} 