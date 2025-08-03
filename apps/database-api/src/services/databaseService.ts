import { Pool } from 'pg';
import { logger } from '@tenanta/logging';
import { getDatabasePool } from '../config/database';

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

export class DatabaseService {
  private static pool: Pool;

  static async initialize() {
    this.pool = getDatabasePool();
  }

  // Get all tables for a specific tenant
  static async getTenantTables(tenantId: string): Promise<TableInfo[]> {
    let client;
    try {
      if (!this.pool) {
        throw new Error('Database pool not initialized');
      }
      
      client = await this.pool.connect();
      
      // Get tenant schema name
      const tenantQuery = 'SELECT schema_name FROM public.tenants WHERE id = $1';
      const tenantResult = await client.query(tenantQuery, [tenantId]);
      
      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant not found');
      }
      
      const schemaName = tenantResult.rows[0].schema_name;
      
      // Get all tables in the tenant's schema
      const tablesQuery = `
        SELECT 
          relname as "tableName",
          schemaname as "tableSchema",
          n_tup_ins + n_tup_upd + n_tup_del as "rowCount",
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||relname)) as "size",
          last_vacuum as "lastModified"
        FROM pg_stat_user_tables 
        WHERE schemaname = $1
        ORDER BY relname
      `;
      
      const result = await client.query(tablesQuery, [schemaName]);
      
      return result.rows.map(row => ({
        ...row,
        lastModified: row.lastModified || new Date()
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting tenant tables', { tenantId, error: errorMessage });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Get table structure (columns)
  static async getTableColumns(tenantId: string, tableName: string): Promise<ColumnInfo[]> {
    let client;
    try {
      if (!this.pool) {
        throw new Error('Database pool not initialized');
      }
      
      client = await this.pool.connect();
      
      // Get tenant schema name
      const tenantQuery = 'SELECT schema_name FROM public.tenants WHERE id = $1';
      const tenantResult = await client.query(tenantQuery, [tenantId]);
      
      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant not found');
      }
      
      const schemaName = tenantResult.rows[0].schema_name;
      
      // Get table columns
      const columnsQuery = `
        SELECT 
          column_name as "columnName",
          data_type as "dataType",
          is_nullable as "isNullable",
          column_default as "columnDefault",
          character_maximum_length as "characterMaximumLength"
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `;
      
      const result = await client.query(columnsQuery, [schemaName, tableName]);
      
      return result.rows;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting table columns', { tenantId, tableName, error: errorMessage });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Get table data with pagination
  static async getTableData(
    tenantId: string, 
    tableName: string, 
    page: number = 1, 
    limit: number = 50,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'asc'
  ): Promise<TableData> {
    let client;
    try {
      if (!this.pool) {
        throw new Error('Database pool not initialized');
      }
      
      client = await this.pool.connect();
      
      // Get tenant schema name
      const tenantQuery = 'SELECT schema_name FROM public.tenants WHERE id = $1';
      const tenantResult = await client.query(tenantQuery, [tenantId]);
      
      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant not found');
      }
      
      const schemaName = tenantResult.rows[0].schema_name;
      
      // Get total count
      const countQuery = `SELECT COUNT(*) FROM ${schemaName}.${tableName}`;
      const countResult = await client.query(countQuery);
      const totalCount = parseInt(countResult.rows[0].count);
      
      // Get columns directly to avoid multiple connections
      const columnsQuery = `
        SELECT 
          column_name as "columnName",
          data_type as "dataType",
          is_nullable as "isNullable",
          column_default as "columnDefault",
          character_maximum_length as "characterMaximumLength"
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
        ORDER BY ordinal_position
      `;
      
      const columnsResult = await client.query(columnsQuery, [schemaName, tableName]);
      const columns = columnsResult.rows;
      
      // Build query with pagination and sorting
      const offset = (page - 1) * limit;
      const orderBy = sortBy ? `ORDER BY "${sortBy}" ${sortOrder.toUpperCase()}` : '';
      const dataQuery = `
        SELECT * FROM ${schemaName}.${tableName}
        ${orderBy}
        LIMIT $1 OFFSET $2
      `;
      
      const dataResult = await client.query(dataQuery, [limit, offset]);
      
      return {
        columns,
        data: dataResult.rows,
        totalCount,
        page,
        limit
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting table data', { 
        tenantId, 
        tableName, 
        page, 
        limit, 
        error: errorMessage 
      });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  // Get database health status
  static async getDatabaseHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    activeConnections: number;
    totalConnections: number;
    databaseSize: string;
    uptime: string;
  }> {
    let client;
    try {
      if (!this.pool) {
        throw new Error('Database pool not initialized');
      }
      
      client = await this.pool.connect();
      
      // Get database stats
      const statsQuery = `
        SELECT 
          (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections,
          (SELECT count(*) FROM pg_stat_activity) as active_connections,
          (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size,
          (SELECT extract(epoch from (now() - pg_postmaster_start_time()))) as uptime_seconds
      `;
      
      const result = await client.query(statsQuery);
      
      const stats = result.rows[0];
      const activeConnections = parseInt(stats.active_connections);
      const maxConnections = parseInt(stats.max_connections);
      const connectionPercentage = (activeConnections / maxConnections) * 100;
      
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (connectionPercentage > 80) {
        status = 'critical';
      } else if (connectionPercentage > 60) {
        status = 'warning';
      }
      
      const uptimeHours = Math.floor(parseInt(stats.uptime_seconds) / 3600);
      const uptime = `${uptimeHours}h`;
      
      return {
        status,
        activeConnections,
        totalConnections: maxConnections,
        databaseSize: stats.database_size,
        uptime
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting database health', { error: errorMessage });
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
} 