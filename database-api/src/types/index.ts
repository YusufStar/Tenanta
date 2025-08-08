// Database types
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  poolSize: number;
}

export interface RedisConfig {
  url: string;
  database: number;
  password: string;
  prefix: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string | undefined;
  timestamp: string;
  path?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string | undefined;
}

// Tenant types
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  schemaName: string;
  createdAt: Date;
  updatedAt: Date;
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

// Schema types
export interface Schema {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  version: number;
  definition: any; // JSONB
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSchemaRequest {
  name: string;
  description?: string;
  definition: any; // JSONB
}

export interface UpdateSchemaRequest {
  name?: string;
  description?: string;
  definition?: any; // JSONB
  isActive?: boolean;
}

// Table types
export interface Table {
  id: string;
  schemaId: string;
  name: string;
  description?: string;
  columns: Column[];
  indexes: Index[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  primaryKey?: boolean;
  unique?: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface Index {
  name: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface CreateTableRequest {
  name: string;
  description?: string;
  columns: Column[];
  indexes?: Index[];
}

export interface UpdateTableRequest {
  name?: string;
  description?: string;
  columns?: Column[];
  indexes?: Index[];
}

// WebSocket types
export interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp: string;
}

export interface WebSocketConnection {
  id: string;
  tenantId?: string;
  connectedAt: Date;
}

// Error types
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

export interface PaginationQuery {
  page?: string | number;
  limit?: string | number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Cache types
export interface CacheConfig {
  ttl: number;
  prefix: string;
}

export interface CacheData<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
} 