import { getDatabasePool } from '../config/database';
import { getRedisClient, getTenantRedisClient } from '../config/redis';
import { logger } from '../shared/logger';
import { Tenant, CreateTenantRequest, UpdateTenantRequest } from '../types';
import { DatabaseService } from './databaseService';

export class TenantService {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly CACHE_PREFIX = 'tenant:';

  /**
   * Get tenant-specific database client
   */
  static async getTenantDatabaseClient(tenantId: string): Promise<any> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new Error(`Tenant with ID ${tenantId} not found`);
    }

    // Get client from tenant's own database
    const client = await DatabaseService.getTenantDatabaseClient(tenantId);
    
    logger.info(`✅ Database client connected for tenant "${tenant.name}"`, {
      tenantId,
      tenantName: tenant.name,
      databaseName: `tenant_${tenantId.replace(/-/g, '_')}`,
      operation: 'getTenantDatabaseClient'
    });

    return client;
  }

  /**
   * Get tenant-specific Redis client
   */
  static async getTenantRedisClient(tenantId: string): Promise<any> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new Error(`Tenant with ID ${tenantId} not found`);
    }

    const redisClient = await getTenantRedisClient(tenantId);
    
    logger.info(`✅ Redis client connected for tenant "${tenant.name}"`, {
      tenantId,
      tenantName: tenant.name,
      operation: 'getTenantRedisClient'
    });

    return redisClient;
  }

  /**
   * Test tenant database connection
   */
  static async testTenantConnection(tenantId: string): Promise<{
    postgresql: boolean;
    redis: boolean;
    tenant: Tenant;
  }> {
    const tenant = await this.getTenantById(tenantId);
    if (!tenant) {
      throw new Error(`Tenant with ID ${tenantId} not found`);
    }

    let postgresqlStatus = false;
    let redisStatus = false;

    try {
      // Test PostgreSQL connection to tenant's own database
      const dbClient = await this.getTenantDatabaseClient(tenantId);
      await dbClient.query('SELECT 1');
      await dbClient.release();
      postgresqlStatus = true;

      logger.info(`✅ PostgreSQL connection test successful for tenant "${tenant.name}"`, {
        tenantId,
        tenantName: tenant.name,
        databaseName: `tenant_${tenantId.replace(/-/g, '_')}`
      });
    } catch (error) {
      logger.error(`❌ PostgreSQL connection test failed for tenant "${tenant.name}":`, error);
    }

    try {
      // Test Redis connection
      const redisClient = await this.getTenantRedisClient(tenantId);
      await redisClient.ping();
      redisStatus = true;

      logger.info(`✅ Redis connection test successful for tenant "${tenant.name}"`, {
        tenantId,
        tenantName: tenant.name
      });
    } catch (error) {
      logger.error(`❌ Redis connection test failed for tenant "${tenant.name}":`, error);
    }

    return {
      postgresql: postgresqlStatus,
      redis: redisStatus,
      tenant
    };
  }

  static async createTenant(data: CreateTenantRequest): Promise<Tenant> {
    const pool = getDatabasePool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if tenant with same slug already exists
      const existingTenant = await client.query(
        'SELECT id FROM public.tenants WHERE slug = $1',
        [data.slug]
      );

      if (existingTenant.rows.length > 0) {
        throw new Error('Tenant with this slug already exists');
      }

      // Create tenant
      const result = await client.query(
        `INSERT INTO public.tenants (name, slug, schema_name, is_active) 
         VALUES ($1, $2, $3, true) 
         RETURNING 
           id,
           name,
           slug,
           schema_name as "schemaName",
           created_at as "createdAt",
           updated_at as "updatedAt",
           is_active as "isActive"`,
        [data.name, data.slug, data.schemaName]
      );

      const tenant = result.rows[0];

      // Create separate PostgreSQL database for the tenant
      logger.info(`Creating PostgreSQL database for tenant: ${tenant.name} (${tenant.slug})`, {
        tenantId: tenant.id,
        operation: 'createTenantDatabase'
      });

      await DatabaseService.createTenantDatabase(tenant.id, tenant.name);

      // Create tables in the tenant's own database
      await this.createTenantTables(tenant.id, tenant.name);

      // Create Redis database for the tenant
      logger.info(`Setting up Redis database for tenant: ${tenant.name} (${tenant.slug})`, {
        tenantId: tenant.id,
        operation: 'createTenantRedis'
      });

      await this.setupTenantRedis(tenant.id, tenant.name);

      await client.query('COMMIT');

      // Clear cache
      await this.clearTenantCache(tenant.id);

      logger.info(`✅ Tenant "${tenant.name}" created successfully with database and Redis setup`, {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        databaseName: `tenant_${tenant.id.replace(/-/g, '_')}`,
        operation: 'createTenant'
      });

      return tenant;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`❌ Failed to create tenant "${data.name}":`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create tables in tenant's own database
   */
  private static async createTenantTables(tenantId: string, tenantName: string): Promise<void> {
    let tenantClient;

    try {
      // Get client from tenant's own database
      tenantClient = await DatabaseService.getTenantDatabaseClient(tenantId);

      // Create users table
      const createUsersTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          username VARCHAR(100) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          is_active BOOLEAN DEFAULT true,
          email_verified BOOLEAN DEFAULT false,
          last_login TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      await tenantClient.query(createUsersTableSQL);

      // Create sessions table with foreign key to users
      const createSessionsTableSQL = `
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          session_token VARCHAR(255) UNIQUE NOT NULL,
          device_info JSONB,
          ip_address INET,
          user_agent TEXT,
          is_active BOOLEAN DEFAULT true,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      await tenantClient.query(createSessionsTableSQL);

      // Create indexes for users table
      await tenantClient.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
      await tenantClient.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      await tenantClient.query(`CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)`);
      await tenantClient.query(`CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified)`);

      // Create indexes for sessions table
      await tenantClient.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`);
      await tenantClient.query(`CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token)`);
      await tenantClient.query(`CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active)`);
      await tenantClient.query(`CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at)`);

      // Create updated_at triggers for both tables
      const createUsersTriggerSQL = `
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at 
          BEFORE UPDATE ON users
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `;

      const createSessionsTriggerSQL = `
        DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
        CREATE TRIGGER update_sessions_updated_at 
          BEFORE UPDATE ON sessions
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `;

      await tenantClient.query(createUsersTriggerSQL);
      await tenantClient.query(createSessionsTriggerSQL);

      logger.info(`✅ Tables created successfully in tenant database for "${tenantName}"`, {
        tenantId,
        tenantName,
        databaseName: `tenant_${tenantId.replace(/-/g, '_')}`,
        tables: ['users', 'sessions'],
        relationships: ['sessions.user_id -> users.id'],
        operation: 'createTenantTables'
      });

    } catch (error) {
      logger.error(`❌ Failed to create tables in tenant database for "${tenantName}":`, error);
      throw error;
    } finally {
      if (tenantClient) {
        tenantClient.release();
      }
    }
  }

  private static async setupTenantRedis(tenantId: string, tenantName: string): Promise<void> {
    try {
      // Get tenant-specific Redis client
      const tenantRedis = await getTenantRedisClient(tenantId);

      // Test the connection
      await tenantRedis.ping();

      // Initialize tenant-specific Redis keys
      await tenantRedis.set(`tenant:${tenantId}:info`, JSON.stringify({
        name: tenantName,
        createdAt: new Date().toISOString(),
        status: 'active'
      }));

      // Set up default Redis keys for the tenant
      await tenantRedis.set(`tenant:${tenantId}:users:count`, '0');
      await tenantRedis.set(`tenant:${tenantId}:cache:version`, '1.0');

      logger.info(`✅ Redis database setup completed for tenant "${tenantName}"`, {
        tenantId,
        tenantName,
        operation: 'setupTenantRedis'
      });

    } catch (error) {
      logger.error(`❌ Failed to setup Redis database for tenant "${tenantName}":`, error);
      throw error;
    }
  }

  static async getTenantById(id: string): Promise<Tenant | null> {
    const redis = getRedisClient();
    const cacheKey = `${this.CACHE_PREFIX}${id}`;

    try {
      // Try to get from cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Get from database
      const pool = getDatabasePool();
      const result = await pool.query(
        `SELECT 
           id,
           name,
           slug,
           schema_name as "schemaName",
           created_at as "createdAt",
           updated_at as "updatedAt",
           is_active as "isActive"
         FROM public.tenants WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const tenant = result.rows[0];

      // Cache the result
      await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(tenant));

      return tenant;
    } catch (error) {
      logger.error('Failed to get tenant by ID:', error);
      throw error;
    }
  }

  static async getTenantBySlug(slug: string): Promise<Tenant | null> {
    const pool = getDatabasePool();
    
    try {
      const result = await pool.query(
        `SELECT 
           id,
           name,
           slug,
           schema_name as "schemaName",
           created_at as "createdAt",
           updated_at as "updatedAt",
           is_active as "isActive"
         FROM public.tenants WHERE slug = $1`,
        [slug]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Failed to get tenant by slug:', error);
      throw error;
    }
  }

  static async updateTenant(id: string, data: UpdateTenantRequest): Promise<Tenant | null> {
    const pool = getDatabasePool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if tenant exists
      const existingTenant = await client.query(
        'SELECT * FROM public.tenants WHERE id = $1',
        [id]
      );

      if (existingTenant.rows.length === 0) {
        return null;
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex}`);
        values.push(data.name);
        paramIndex++;
      }

      if (data.slug !== undefined) {
        // Check if slug is already taken by another tenant
        const slugCheck = await client.query(
          'SELECT id FROM public.tenants WHERE slug = $1 AND id != $2',
          [data.slug, id]
        );

        if (slugCheck.rows.length > 0) {
          throw new Error('Slug is already taken by another tenant');
        }

        updateFields.push(`slug = $${paramIndex}`);
        values.push(data.slug);
        paramIndex++;
      }

      if (data.schemaName !== undefined) {
        updateFields.push(`schema_name = $${paramIndex}`);
        values.push(data.schemaName);
        paramIndex++;
      }

      if (data.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        values.push(data.isActive);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return existingTenant.rows[0];
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(id);

      const result = await client.query(
        `UPDATE public.tenants 
         SET ${updateFields.join(', ')} 
         WHERE id = $${paramIndex} 
         RETURNING 
           id,
           name,
           slug,
           schema_name as "schemaName",
           created_at as "createdAt",
           updated_at as "updatedAt",
           is_active as "isActive"`,
        values
      );

      await client.query('COMMIT');

      const tenant = result.rows[0];

      // Clear cache
      await this.clearTenantCache(id);

      logger.info(`✅ Tenant "${tenant.name}" updated successfully`, { tenantId: id });
      return tenant;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update tenant:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteTenant(id: string): Promise<boolean> {
    const pool = getDatabasePool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get tenant details before deletion
      const tenantResult = await client.query(
        'SELECT name, slug, schema_name FROM public.tenants WHERE id = $1',
        [id]
      );

      if (tenantResult.rows.length === 0) {
        return false;
      }

      const tenant = tenantResult.rows[0];

      logger.info(`Starting deletion process for tenant: ${tenant.name} (${tenant.slug})`, {
        tenantId: id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        schemaName: tenant.schema_name,
        operation: 'deleteTenant'
      });

      // Delete PostgreSQL database
      logger.info(`Deleting PostgreSQL database for tenant "${tenant.name}"`, {
        tenantId: id,
        tenantName: tenant.name,
        operation: 'deleteTenantDatabase'
      });

      await DatabaseService.deleteTenantDatabase(id, tenant.name);

      // Delete Redis database
      logger.info(`Cleaning up Redis database for tenant "${tenant.name}"`, {
        tenantId: id,
        tenantName: tenant.name,
        operation: 'deleteTenantRedis'
      });

      await this.cleanupTenantRedis(id, tenant.name);

      // Soft delete - set is_active to false
      await client.query(
        'UPDATE public.tenants SET is_active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );

      await client.query('COMMIT');

      // Clear cache
      await this.clearTenantCache(id);

      logger.info(`✅ Tenant "${tenant.name}" deleted successfully with database and Redis cleanup`, {
        tenantId: id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        schemaName: tenant.schema_name,
        operation: 'deleteTenant'
      });

      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error(`❌ Failed to delete tenant:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  private static async cleanupTenantRedis(tenantId: string, tenantName: string): Promise<void> {
    try {
      // Get tenant-specific Redis client
      const tenantRedis = await getTenantRedisClient(tenantId);

      // Clear all keys for this tenant
      const keys = await tenantRedis.keys(`tenant:${tenantId}:*`);
      if (keys.length > 0) {
        await tenantRedis.del(...keys);
      }

      // Clear the entire database
      await tenantRedis.flushDb();

      logger.info(`✅ Redis database cleaned up successfully for tenant "${tenantName}"`, {
        tenantId,
        tenantName,
        operation: 'cleanupTenantRedis'
      });

    } catch (error) {
      logger.error(`❌ Failed to cleanup Redis database for tenant "${tenantName}":`, error);
      throw error;
    }
  }

  static async listTenants(page: number = 1, limit: number = 10): Promise<{
    tenants: Tenant[];
    total: number;
  }> {
    const pool = getDatabasePool();
    const offset = (page - 1) * limit;

    try {
      // Get total count
      const countResult = await pool.query('SELECT COUNT(*) FROM public.tenants WHERE is_active = true');
      const total = parseInt(countResult.rows[0].count);

      // Get tenants
      const result = await pool.query(
        `SELECT 
           id,
           name,
           slug,
           schema_name as "schemaName",
           created_at as "createdAt",
           updated_at as "updatedAt",
           is_active as "isActive"
         FROM public.tenants 
         WHERE is_active = true 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return {
        tenants: result.rows,
        total,
      };
    } catch (error) {
      logger.error('Failed to list tenants:', error);
      throw error;
    }
  }

  private static async clearTenantCache(tenantId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const cacheKey = `${this.CACHE_PREFIX}${tenantId}`;
      await redis.del(cacheKey);
    } catch (error) {
      logger.warn('Failed to clear tenant cache:', error);
    }
  }
} 