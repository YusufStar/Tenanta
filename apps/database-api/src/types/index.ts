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
  message?: string;
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
}

// Tenant types
export interface Tenant {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTenantRequest {
  name: string;
  domain: string;
}

export interface UpdateTenantRequest {
  name?: string;
  domain?: string;
  status?: 'active' | 'inactive' | 'suspended';
}

// Schema types
export interface Schema {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  version: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSchemaRequest {
  name: string;
  description?: string;
}

export interface UpdateSchemaRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
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

// User types
export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'viewer';
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role?: 'admin' | 'user' | 'viewer';
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: 'admin' | 'user' | 'viewer';
  status?: 'active' | 'inactive';
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
  userId?: string;
  connectedAt: Date;
}

// Error types
export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
}

// Request types
export interface AuthenticatedRequest extends Request {
  user?: User;
  tenant?: Tenant;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
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