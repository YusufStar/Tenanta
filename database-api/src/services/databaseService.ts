import { logger } from '../shared/logger';
import { getDatabasePool } from '../config/database';
import { Pool } from 'pg';

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
} 