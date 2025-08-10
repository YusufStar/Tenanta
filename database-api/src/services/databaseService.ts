import { logger } from '../shared/logger';
import { LogService } from './logService';
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

    logger.info(`🔄 Starting SQL query execution for tenant ${tenantId}`, {
      tenantId,
      queryType: this.getQueryType(query),
      queryLength: query.length,
      userAgent: metadata?.userAgent,
      ipAddress: metadata?.ipAddress,
      sessionId: metadata?.sessionId
    });

    try {
      // Validate query first
      const validation = this.validateQuery(query);
      if (!validation.isValid) {
        logger.warn(`❌ Query validation failed for tenant ${tenantId}`, {
          tenantId,
          error: validation.error,
          query: query.substring(0, 100) + (query.length > 100 ? '...' : '')
        });
        throw new Error(validation.error);
      }

      logger.info(`✅ Query validation passed for tenant ${tenantId}`, {
        tenantId,
        queryType: this.getQueryType(query)
      });

      // Get tenant database connection
      logger.info(`🔗 Establishing database connection for tenant ${tenantId}`, { tenantId });
      client = await this.getTenantDatabaseClient(tenantId);
      logger.info(`✅ Database connection established for tenant ${tenantId}`, { tenantId });
      
      // Execute the query
      logger.info(`⚡ Executing SQL query for tenant ${tenantId}`, {
        tenantId,
        queryType: this.getQueryType(query),
        query: query.substring(0, 200) + (query.length > 200 ? '...' : '')
      });

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
        queryType: this.getQueryType(query),
        executionTime,
        rowsAffected: queryResult.rowsAffected,
        columnsCount: queryResult.columns.length,
        dataRowsCount: queryResult.data?.length || 0,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : '')
      });

      // Save to database logs for dashboard (async, don't wait for it)
      LogService.createSystemLog({
        tenantId,
        level: 'success',
        message: `SQL query executed successfully: ${this.getQueryType(query)} query returned ${queryResult.rowsAffected} rows in ${executionTime}ms`,
        source: 'DatabaseService',
        metadata: {
          queryType: this.getQueryType(query),
          executionTime,
          rowsAffected: queryResult.rowsAffected,
          columnsCount: queryResult.columns.length,
          queryLength: query.length
        }
      }).catch(error => {
        logger.error(`❌ Failed to save database log for successful query, tenant ${tenantId}:`, error);
      });

      // Save to history (async, don't wait for it)
      logger.info(`💾 Saving query to history for tenant ${tenantId}`, { tenantId });
      this.saveQueryToHistory(tenantId, query, queryResult, metadata).catch(error => {
        logger.error(`❌ Failed to save query to history for tenant ${tenantId}:`, error);
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
        queryType: this.getQueryType(query),
        error: errorResult.error,
        executionTime,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
        userAgent: metadata?.userAgent,
        ipAddress: metadata?.ipAddress
      });

      // Save to database logs for dashboard (async, don't wait for it)
      LogService.createSystemLog({
        tenantId,
        level: 'error',
        message: `SQL query execution failed: ${this.getQueryType(query)} query failed after ${executionTime}ms - ${errorResult.error}`,
        source: 'DatabaseService',
        metadata: {
          queryType: this.getQueryType(query),
          executionTime,
          error: errorResult.error,
          queryLength: query.length,
          userAgent: metadata?.userAgent,
          ipAddress: metadata?.ipAddress
        }
      }).catch(error => {
        logger.error(`❌ Failed to save database log for failed query, tenant ${tenantId}:`, error);
      });

      // Save to history (async, don't wait for it)
      this.saveQueryToHistory(tenantId, query, errorResult, metadata).catch(error => {
        logger.error(`❌ Failed to save query history for failed query, tenant ${tenantId}:`, error);
      });

      return errorResult;
    } finally {
      if (client) {
        logger.info(`🔌 Releasing database connection for tenant ${tenantId}`, { tenantId });
        client.release();
      }
    }
  }

  /**
   * Get the type of SQL query
   */
  private static getQueryType(query: string): string {
    const trimmedQuery = query.trim().toUpperCase();
    
    if (trimmedQuery.startsWith('SELECT')) return 'SELECT';
    if (trimmedQuery.startsWith('INSERT')) return 'INSERT';
    if (trimmedQuery.startsWith('UPDATE')) return 'UPDATE';
    if (trimmedQuery.startsWith('DELETE')) return 'DELETE';
    if (trimmedQuery.startsWith('CREATE')) return 'CREATE';
    if (trimmedQuery.startsWith('ALTER')) return 'ALTER';
    if (trimmedQuery.startsWith('DROP')) return 'DROP';
    if (trimmedQuery.startsWith('TRUNCATE')) return 'TRUNCATE';
    if (trimmedQuery.startsWith('WITH')) return 'CTE';
    
    return 'OTHER';
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

    logger.info(`💾 Starting to save query history for tenant ${tenantId}`, {
      tenantId,
      queryLength: query.length,
      success: result.success,
      executionTime: result.executionTime,
      rowsAffected: result.rowsAffected
    });

    try {
      client = await mainPool.connect();
      
      // Create hash of the query for deduplication
      const queryHash = crypto.createHash('sha256').update(query.trim()).digest('hex');
      
      logger.info(`🔐 Generated query hash for tenant ${tenantId}`, {
        tenantId,
        queryHash: queryHash.substring(0, 12) + '...',
        queryType: this.getQueryType(query)
      });
      
      // Prepare result preview (first 5 rows)
      const resultPreview = result.data?.slice(0, 5) || [];
      
      const insertQuery = `
        INSERT INTO public.sql_query_history (
          tenant_id, query_text, query_hash, execution_time_ms, 
          rows_affected, success, error_message, result_columns, 
          result_preview, user_agent, ip_address, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
      
      logger.info(`📝 Inserting query history record for tenant ${tenantId}`, {
        tenantId,
        columnsCount: result.columns?.length || 0,
        previewRowsCount: resultPreview.length,
        hasUserAgent: !!metadata?.userAgent,
        hasIpAddress: !!metadata?.ipAddress,
        hasSessionId: !!metadata?.sessionId
      });
      
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

      logger.info(`✅ Query history saved successfully for tenant ${tenantId}`, {
        tenantId,
        queryHash: queryHash.substring(0, 12) + '...',
        success: result.success,
        executionTime: result.executionTime,
        queryType: this.getQueryType(query)
      });

    } catch (error) {
      logger.error(`❌ Failed to save query history for tenant ${tenantId}:`, {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
        queryType: this.getQueryType(query),
        executionTime: result.executionTime
      });
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

    logger.info(`📊 Fetching query history for tenant ${tenantId}`, {
      tenantId,
      limit: options.limit || 50,
      offset: options.offset || 0,
      successOnly: options.successOnly,
      hasDateRange: !!(options.fromDate || options.toDate)
    });

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
        logger.info(`🎯 Filtering by success status: ${successOnly} for tenant ${tenantId}`, { tenantId, successOnly });
      }
      
      if (fromDate) {
        conditions.push(`execution_timestamp >= $${params.length + 1}`);
        params.push(fromDate);
        logger.info(`📅 Filtering from date: ${fromDate.toISOString()} for tenant ${tenantId}`, { tenantId, fromDate });
      }
      
      if (toDate) {
        conditions.push(`execution_timestamp <= $${params.length + 1}`);
        params.push(toDate);
        logger.info(`📅 Filtering to date: ${toDate.toISOString()} for tenant ${tenantId}`, { tenantId, toDate });
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      logger.info(`🔢 Getting total count of query history for tenant ${tenantId}`, { tenantId });
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM public.sql_query_history 
        ${whereClause}
      `;
      
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      logger.info(`📈 Found ${total} total history records for tenant ${tenantId}`, { tenantId, total });

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

      logger.info(`✅ Retrieved ${historyResult.rows.length} query history records for tenant ${tenantId}`, {
        tenantId,
        retrievedCount: historyResult.rows.length,
        total,
        limit,
        offset
      });

      return {
        history: historyResult.rows,
        total
      };

    } catch (error) {
      logger.error(`❌ Failed to get query history for tenant ${tenantId}:`, {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
        options
      });
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