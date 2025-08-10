import { logger } from '../shared/logger';
import { getDatabasePool } from '../config/database';
import { Pool } from 'pg';
import crypto from 'crypto';

export class DatabaseService {
  private static tenantPools: Map<string, Pool> = new Map();

  static async initialize() {
    getDatabasePool(); // Initialize main connection pool
    logger.info('✅ DatabaseService initialized successfully');
  }

  /**
   * Create a new database for a tenant
   */
  static async createTenantDatabase(tenantId: string, tenantName: string): Promise<void> {
    const mainPool = getDatabasePool();
    let client;

    try {
      client = await mainPool.connect();
      
      // Create database name (sanitized)
      const dbName = `tenant_${tenantId.replace(/-/g, '_')}`;
      
      // Check if database already exists
      const existingDb = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [dbName]
      );

      if (existingDb.rows.length > 0) {
        logger.warn(`Database ${dbName} already exists for tenant ${tenantName}`);
        return;
      }

      // Create the database
      await client.query(`CREATE DATABASE "${dbName}"`);
      
      logger.info(`✅ Created database "${dbName}" for tenant "${tenantName}"`, {
        tenantId,
        tenantName,
        databaseName: dbName
      });

      // Initialize the tenant database with required extensions and functions
      await this.initializeTenantDatabase(tenantId, dbName);

    } catch (error) {
      logger.error(`❌ Failed to create database for tenant ${tenantName}:`, error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Initialize a tenant database with required extensions and functions
   */
  private static async initializeTenantDatabase(tenantId: string, dbName: string): Promise<void> {
    const tenantPool = await this.getTenantDatabasePool(tenantId, dbName);
    let client;

    try {
      client = await tenantPool.connect();

      // Enable required extensions
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

      // Create updated_at function
      const createUpdatedAtFunction = `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql';
      `;
      await client.query(createUpdatedAtFunction);

      logger.info(`✅ Initialized tenant database "${dbName}" with extensions and functions`, {
        tenantId,
        databaseName: dbName
      });

    } catch (error) {
      logger.error(`❌ Failed to initialize tenant database ${dbName}:`, error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Get or create a database pool for a specific tenant
   */
  static async getTenantDatabasePool(tenantId: string, dbName?: string): Promise<Pool> {
    // Check if pool already exists
    if (this.tenantPools.has(tenantId)) {
      return this.tenantPools.get(tenantId)!;
    }

    // Create new pool for tenant
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Parse the main database URL and replace database name
    const url = new URL(databaseUrl);
    const tenantDbName = dbName || `tenant_${tenantId.replace(/-/g, '_')}`;
    url.pathname = `/${tenantDbName}`;

    const tenantPool = new Pool({
      connectionString: url.toString(),
      max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
      min: parseInt(process.env.DATABASE_POOL_MIN || '1'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    try {
      const client = await tenantPool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.tenantPools.set(tenantId, tenantPool);
      
      logger.info(`✅ Created database pool for tenant database "${tenantDbName}"`, {
        tenantId,
        databaseName: tenantDbName
      });

      return tenantPool;
    } catch (error) {
      await tenantPool.end();
      logger.error(`❌ Failed to connect to tenant database ${tenantDbName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a tenant database
   */
  static async deleteTenantDatabase(tenantId: string, tenantName: string): Promise<void> {
    const mainPool = getDatabasePool();
    let client;

    try {
      // Close tenant pool if exists
      if (this.tenantPools.has(tenantId)) {
        const tenantPool = this.tenantPools.get(tenantId)!;
        await tenantPool.end();
        this.tenantPools.delete(tenantId);
      }

      client = await mainPool.connect();
      
      const dbName = `tenant_${tenantId.replace(/-/g, '_')}`;
      
      // Terminate all connections to the database
      await client.query(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()
      `, [dbName]);

      // Drop the database
      await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
      
      logger.info(`✅ Deleted database "${dbName}" for tenant "${tenantName}"`, {
        tenantId,
        tenantName,
        databaseName: dbName
      });

    } catch (error) {
      logger.error(`❌ Failed to delete database for tenant ${tenantName}:`, error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Get tenant database connection
   */
  static async getTenantDatabaseClient(tenantId: string) {
    const pool = await this.getTenantDatabasePool(tenantId);
    return pool.connect();
  }

  /**
   * Close all tenant database pools
   */
  static async closeAllTenantPools(): Promise<void> {
    const promises = Array.from(this.tenantPools.entries()).map(async ([tenantId, pool]) => {
      try {
        await pool.end();
        logger.info(`Closed database pool for tenant ${tenantId}`);
      } catch (error) {
        logger.error(`Failed to close pool for tenant ${tenantId}:`, error);
      }
    });

    await Promise.all(promises);
    this.tenantPools.clear();
  }

  /**
   * Execute SQL query for a specific tenant
   */
  static async executeQuery(tenantId: string, query: string, metadata?: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
  }): Promise<{
    success: boolean;
    data?: any[];
    columns?: string[];
    rowsAffected: number;
    executionTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    let client;

    try {
      // Get tenant database connection
      client = await this.getTenantDatabaseClient(tenantId);
      
      // Execute the query
      const result = await client.query(query);
      
      const executionTime = Date.now() - startTime;
      
      const queryResult = {
        success: true,
        data: result.rows,
        columns: result.fields?.map(field => field.name) || [],
        rowsAffected: result.rowCount || 0,
        executionTime
      };

      logger.info(`✅ SQL query executed successfully for tenant ${tenantId}`, {
        tenantId,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        executionTime,
        rowsAffected: queryResult.rowsAffected
      });

      // Save to history (async, don't wait for it)
      this.saveQueryToHistory(tenantId, query, queryResult, metadata).catch(error => {
        logger.error('Failed to save query to history:', error);
      });

      return queryResult;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      const errorResult = {
        success: false,
        rowsAffected: 0,
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };

      logger.error(`❌ SQL query failed for tenant ${tenantId}:`, {
        tenantId,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        error: errorResult.error,
        executionTime
      });

      // Save to history (async, don't wait for it)
      this.saveQueryToHistory(tenantId, query, errorResult, metadata).catch(error => {
        logger.error('Failed to save query to history:', error);
      });

      return errorResult;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Validate SQL query (basic validation)
   */
  static validateQuery(query: string): { isValid: boolean; error?: string } {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery) {
      return { isValid: false, error: 'Query cannot be empty' };
    }

    // Check for potentially dangerous operations
    const dangerousPatterns = [
      /\bDROP\s+DATABASE\b/i,
      /\bDROP\s+SCHEMA\b/i,
      /\bCREATE\s+DATABASE\b/i,
      /\bALTER\s+DATABASE\b/i,
      /\bSHUTDOWN\b/i,
      /\bRESTART\b/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmedQuery)) {
        return { 
          isValid: false, 
          error: 'Query contains potentially dangerous operations that are not allowed' 
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Save SQL query to history
   */
  static async saveQueryToHistory(
    tenantId: string,
    query: string,
    result: {
      success: boolean;
      executionTime: number;
      rowsAffected: number;
      columns?: string[];
      data?: any[];
      error?: string;
    },
    metadata?: {
      userAgent?: string;
      ipAddress?: string;
      sessionId?: string;
    }
  ): Promise<void> {
    const mainPool = getDatabasePool();
    let client;

    try {
      client = await mainPool.connect();
      
      // Create hash of the query for deduplication
      const queryHash = crypto.createHash('sha256').update(query.trim()).digest('hex');
      
      // Prepare result preview (first 5 rows)
      const resultPreview = result.data?.slice(0, 5) || [];
      
      const insertQuery = `
        INSERT INTO public.sql_query_history (
          tenant_id, query_text, query_hash, execution_time_ms, 
          rows_affected, success, error_message, result_columns, 
          result_preview, user_agent, ip_address, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
      
      await client.query(insertQuery, [
        tenantId,
        query.trim(),
        queryHash,
        result.executionTime,
        result.rowsAffected,
        result.success,
        result.error || null,
        JSON.stringify(result.columns || []),
        JSON.stringify(resultPreview),
        metadata?.userAgent || null,
        metadata?.ipAddress || null,
        metadata?.sessionId || null
      ]);

      logger.info(`✅ Query saved to history for tenant ${tenantId}`, {
        tenantId,
        queryHash,
        success: result.success,
        executionTime: result.executionTime
      });

    } catch (error) {
      logger.error(`❌ Failed to save query history for tenant ${tenantId}:`, error);
      // Don't throw error for history saving failure
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Get SQL query history for a tenant
   */
  static async getQueryHistory(
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      successOnly?: boolean;
      fromDate?: Date;
      toDate?: Date;
    } = {}
  ): Promise<{
    history: any[];
    total: number;
  }> {
    const mainPool = getDatabasePool();
    let client;

    try {
      client = await mainPool.connect();
      
      const {
        limit = 50,
        offset = 0,
        successOnly,
        fromDate,
        toDate
      } = options;

      // Build WHERE conditions
      const conditions = ['tenant_id = $1'];
      const params: any[] = [tenantId];
      
      if (successOnly !== undefined) {
        conditions.push(`success = $${params.length + 1}`);
        params.push(successOnly);
      }
      
      if (fromDate) {
        conditions.push(`execution_timestamp >= $${params.length + 1}`);
        params.push(fromDate);
      }
      
      if (toDate) {
        conditions.push(`execution_timestamp <= $${params.length + 1}`);
        params.push(toDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM public.sql_query_history 
        ${whereClause}
      `;
      
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get history records
      const historyQuery = `
        SELECT 
          id,
          query_text,
          execution_timestamp,
          execution_time_ms,
          rows_affected,
          success,
          error_message,
          result_columns,
          created_at
        FROM public.sql_query_history 
        ${whereClause}
        ORDER BY execution_timestamp DESC 
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      
      params.push(limit, offset);
      const historyResult = await client.query(historyQuery, params);

      return {
        history: historyResult.rows,
        total
      };

    } catch (error) {
      logger.error(`❌ Failed to get query history for tenant ${tenantId}:`, error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Clear old query history (cleanup job)
   */
  static async clearOldQueryHistory(daysToKeep: number = 30): Promise<number> {
    const mainPool = getDatabasePool();
    let client;

    try {
      client = await mainPool.connect();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deleteQuery = `
        DELETE FROM public.sql_query_history 
        WHERE execution_timestamp < $1
      `;
      
      const result = await client.query(deleteQuery, [cutoffDate]);
      const deletedCount = result.rowCount || 0;

      logger.info(`✅ Cleared ${deletedCount} old query history records older than ${daysToKeep} days`);
      
      return deletedCount;

    } catch (error) {
      logger.error('❌ Failed to clear old query history:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
} 