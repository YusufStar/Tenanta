import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, handleApiResponse, handleApiError } from '@/lib/api';

export interface SchemaColumn {
  title: string;
  type: string;
}

export interface ReactFlowRelationship {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

// API Response interfaces
export interface ApiTable {
  tableName: string;
  tableSchema: string;
  rowCount: number;
  size: string;
  lastModified: string;
  columns: SchemaColumn[];
  // ReactFlow node properties (added during formatting)
  id?: string;
  position?: { x: number; y: number };
  type?: string;
  data?: {
    label: string;
    schema: SchemaColumn[];
  };
  dragHandle?: string;
}

export interface ApiRelationship {
  constraintName: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  onDelete: string;
  onUpdate: string;
  // ReactFlow edge properties (added during formatting)
  id?: string;
  source?: string;
  target?: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  label?: string;
}

export interface SchemaOverview {
  tenantId: string;
  schemaName: string;
  tables: ApiTable[];
  relationships: ApiRelationship[];
  totalTables: number;
  totalRows: number;
  lastModified: string;
  savedCode?: string; // The saved DBML code if available
}

export interface Schema {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  version: number;
  definition: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchemaRequest {
  name: string;
  description?: string;
  definition: any;
}

export interface UpdateSchemaRequest {
  name?: string;
  description?: string;
  definition?: any;
  isActive?: boolean;
}

export interface TableDetails {
  table: {
    tableName: string;
    tableSchema: string;
    rowCount: number;
    size: string;
    lastModified: string;
  };
  columns: {
    columnName: string;
    dataType: string;
    isNullable: string;
    columnDefault?: string;
    characterMaximumLength?: number;
    isPrimaryKey: boolean;
    isUnique: boolean;
  }[];
  foreignKeys: {
    constraintName: string;
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
    onDelete: string;
    onUpdate: string;
  }[];
}

interface UseSchemasOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// API functions
const fetchTenantSchemas = async (tenantId: string): Promise<Schema[]> => {
  try {
    const response = await api.get(`/schemas/${tenantId}`);
    return handleApiResponse(response);
  } catch (error) {
    throw handleApiError(error);
  }
};

const fetchSchemaOverview = async (tenantId: string): Promise<SchemaOverview> => {
  try {
    const response = await api.get(`/schemas/${tenantId}/overview`);
    return handleApiResponse(response);
  } catch (error) {
    throw handleApiError(error);
  }
};

const fetchTableDetails = async (tenantId: string, tableName: string): Promise<TableDetails> => {
  try {
    const response = await api.get(`/schemas/${tenantId}/tables/${tableName}`);
    return handleApiResponse(response);
  } catch (error) {
    throw handleApiError(error);
  }
};

const fetchSchemaById = async (schemaId: string): Promise<Schema> => {
  try {
    const response = await api.get(`/schemas/schema/${schemaId}`);
    return handleApiResponse(response);
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new Error('Schema not found');
    }
    throw handleApiError(error);
  }
};

const createSchema = async (tenantId: string, schemaData: CreateSchemaRequest): Promise<Schema> => {
  try {
    const response = await api.post(`/schemas/${tenantId}`, schemaData);
    return handleApiResponse(response);
  } catch (error) {
    throw handleApiError(error);
  }
};

const updateSchema = async (schemaId: string, updateData: UpdateSchemaRequest): Promise<Schema> => {
  try {
    const response = await api.put(`/schemas/schema/${schemaId}`, updateData);
    return handleApiResponse(response);
  } catch (error) {
    throw handleApiError(error);
  }
};

const updateTenantSchema = async (tenantId: string, schemaData: {
  schemaCode: string;
  name: string;
  description: string;
}): Promise<Schema> => {
  try {
    const response = await api.put(`/schemas/${tenantId}/update`, schemaData);
    return handleApiResponse(response);
  } catch (error) {
    throw handleApiError(error);
  }
};

const deleteSchema = async (schemaId: string): Promise<boolean> => {
  try {
    const response = await api.delete(`/schemas/schema/${schemaId}`);
    return handleApiResponse(response);
  } catch (error) {
    throw handleApiError(error);
  }
};

// React Query hooks
export function useTenantSchemas(tenantId: string, options: UseSchemasOptions = {}) {
  const {
    autoRefresh = false,
    refreshInterval = 10000
  } = options;

  return useQuery({
    queryKey: ['schemas', tenantId],
    queryFn: () => fetchTenantSchemas(tenantId),
    enabled: !!tenantId,
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

export function useSchemaOverview(tenantId: string, options: UseSchemasOptions = {}) {
  const {
    autoRefresh = false,
    refreshInterval = 15000
  } = options;

  return useQuery({
    queryKey: ['schema-overview', tenantId],
    queryFn: () => fetchSchemaOverview(tenantId),
    enabled: !!tenantId,
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 60000, // Consider data fresh for 1 minute
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

export function useTableDetails(tenantId: string, tableName: string) {
  return useQuery({
    queryKey: ['table-details', tenantId, tableName],
    queryFn: () => fetchTableDetails(tenantId, tableName),
    enabled: !!tenantId && !!tableName,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

export function useSchemaById(schemaId: string) {
  return useQuery({
    queryKey: ['schema', schemaId],
    queryFn: () => fetchSchemaById(schemaId),
    enabled: !!schemaId,
    staleTime: 60000, // Consider data fresh for 1 minute
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

export function useCreateSchema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, schemaData }: { tenantId: string; schemaData: CreateSchemaRequest }) => 
      createSchema(tenantId, schemaData),
    onSuccess: (_, { tenantId }) => {
      // Invalidate and refetch schemas list for this tenant
      queryClient.invalidateQueries({ queryKey: ['schemas', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['schema-overview', tenantId] });
    },
  });
}

export function useUpdateSchema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ schemaId, updateData }: { schemaId: string; updateData: UpdateSchemaRequest }) => 
      updateSchema(schemaId, updateData),
    onSuccess: (updatedSchema) => {
      // Update the specific schema in cache
      queryClient.setQueryData(['schema', updatedSchema.id], updatedSchema);
      // Invalidate schemas list for this tenant
      queryClient.invalidateQueries({ queryKey: ['schemas', updatedSchema.tenantId] });
      queryClient.invalidateQueries({ queryKey: ['schema-overview', updatedSchema.tenantId] });
    },
  });
}

export function useUpdateTenantSchema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, schemaData }: { 
      tenantId: string; 
      schemaData: {
        schemaCode: string;
        name: string;
        description: string;
      }
    }) => updateTenantSchema(tenantId, schemaData),
    onSuccess: (updatedSchema, { tenantId }) => {
      // Update the specific schema in cache
      if (updatedSchema.id) {
        queryClient.setQueryData(['schema', updatedSchema.id], updatedSchema);
      }
      // Invalidate schemas list and overview for this tenant
      queryClient.invalidateQueries({ queryKey: ['schemas', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['schema-overview', tenantId] });
      // Invalidate the schema code cache as well
      queryClient.invalidateQueries({ queryKey: ['tenant-schema-code', tenantId] });
    },
  });
}

export function useDeleteSchema() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSchema,
    onSuccess: (_, deletedSchemaId) => {
      // Remove the specific schema from cache
      queryClient.removeQueries({ queryKey: ['schema', deletedSchemaId] });
      // Invalidate all schemas queries (we don't know the tenantId here)
      queryClient.invalidateQueries({ queryKey: ['schemas'] });
      queryClient.invalidateQueries({ queryKey: ['schema-overview'] });
    },
  });
}
