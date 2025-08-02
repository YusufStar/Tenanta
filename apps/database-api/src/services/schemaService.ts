import { getDatabasePool } from '../config/database';
import { getRedisClient } from '../config/redis';
import { logger } from '@tenanta/logging';
import { Schema, CreateSchemaRequest, UpdateSchemaRequest } from '../types';

export class SchemaService {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly CACHE_PREFIX = 'schema:';

  static async createSchema(tenantId: string, data: CreateSchemaRequest): Promise<Schema> {
    const pool = getDatabasePool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Validate tenant exists and is active
      const tenantResult = await client.query(
        'SELECT id FROM tenants WHERE id = $1 AND status = $2',
        [tenantId, 'active']
      );

      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant not found or inactive');
      }

      // Check if schema name already exists for this tenant
      const existingSchema = await client.query(
        'SELECT id FROM schemas WHERE tenant_id = $1 AND name = $2',
        [tenantId, data.name]
      );

      if (existingSchema.rows.length > 0) {
        throw new Error('Schema with this name already exists for this tenant');
      }

      // Validate schema name format
      if (!/^[a-z][a-z0-9_]*$/.test(data.name)) {
        throw new Error('Schema name must start with a letter and contain only lowercase letters, numbers, and underscores');
      }

      // Create schema in PostgreSQL
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${data.name}"`);

      // Create schema record
      const result = await client.query(
        `INSERT INTO schemas (tenant_id, name, description, version, status) 
         VALUES ($1, $2, $3, 1, 'active') 
         RETURNING *`,
        [tenantId, data.name, data.description]
      );

      await client.query('COMMIT');

      const schema = result.rows[0];

      // Clear cache
      await this.clearSchemaCache(schema.id);

      logger.info('Schema created successfully', { 
        schemaId: schema.id, 
        tenantId, 
        schemaName: data.name 
      });

      return schema;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create schema:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getSchemaById(id: string): Promise<Schema | null> {
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
        'SELECT * FROM schemas WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const schema = result.rows[0];

      // Cache the result
      await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(schema));

      return schema;
    } catch (error) {
      logger.error('Failed to get schema by ID:', error);
      throw error;
    }
  }

  static async getSchemasByTenant(tenantId: string): Promise<Schema[]> {
    const pool = getDatabasePool();
    
    try {
      const result = await pool.query(
        'SELECT * FROM schemas WHERE tenant_id = $1 ORDER BY created_at DESC',
        [tenantId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get schemas by tenant:', error);
      throw error;
    }
  }

  static async updateSchema(id: string, data: UpdateSchemaRequest): Promise<Schema | null> {
    const pool = getDatabasePool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if schema exists
      const existingSchema = await client.query(
        'SELECT * FROM schemas WHERE id = $1',
        [id]
      );

      if (existingSchema.rows.length === 0) {
        return null;
      }

      const schema = existingSchema.rows[0];

      // Build update query dynamically
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        // Validate schema name format
        if (!/^[a-z][a-z0-9_]*$/.test(data.name)) {
          throw new Error('Schema name must start with a letter and contain only lowercase letters, numbers, and underscores');
        }

        // Check if new name already exists for this tenant
        const nameCheck = await client.query(
          'SELECT id FROM schemas WHERE tenant_id = $1 AND name = $2 AND id != $3',
          [schema.tenant_id, data.name, id]
        );

        if (nameCheck.rows.length > 0) {
          throw new Error('Schema name already exists for this tenant');
        }

        // Rename schema in PostgreSQL
        await client.query(`ALTER SCHEMA "${schema.name}" RENAME TO "${data.name}"`);

        updateFields.push(`name = $${paramIndex}`);
        values.push(data.name);
        paramIndex++;
      }

      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        values.push(data.description);
        paramIndex++;
      }

      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        values.push(data.status);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return schema;
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(id);

      const result = await client.query(
        `UPDATE schemas 
         SET ${updateFields.join(', ')} 
         WHERE id = $${paramIndex} 
         RETURNING *`,
        values
      );

      await client.query('COMMIT');

      const updatedSchema = result.rows[0];

      // Clear cache
      await this.clearSchemaCache(id);

      logger.info('Schema updated successfully', { schemaId: id });
      return updatedSchema;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update schema:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteSchema(id: string): Promise<boolean> {
    const pool = getDatabasePool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if schema exists
      const existingSchema = await client.query(
        'SELECT * FROM schemas WHERE id = $1',
        [id]
      );

      if (existingSchema.rows.length === 0) {
        return false;
      }

      const schema = existingSchema.rows[0];

      // Check if schema has tables
      const tablesResult = await client.query(
        `SELECT COUNT(*) FROM information_schema.tables 
         WHERE table_schema = $1`,
        [schema.name]
      );

      const tableCount = parseInt(tablesResult.rows[0].count);
      if (tableCount > 0) {
        throw new Error(`Cannot delete schema: ${tableCount} tables exist in this schema`);
      }

      // Drop schema from PostgreSQL
      await client.query(`DROP SCHEMA IF EXISTS "${schema.name}" CASCADE`);

      // Soft delete - update status to inactive
      await client.query(
        'UPDATE schemas SET status = $1, updated_at = NOW() WHERE id = $2',
        ['inactive', id]
      );

      await client.query('COMMIT');

      // Clear cache
      await this.clearSchemaCache(id);

      logger.info('Schema deleted successfully', { schemaId: id });
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to delete schema:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async listSchemas(tenantId: string, page: number = 1, limit: number = 10): Promise<{
    schemas: Schema[];
    total: number;
  }> {
    const pool = getDatabasePool();
    const offset = (page - 1) * limit;

    try {
      // Get total count
      const countResult = await pool.query(
        'SELECT COUNT(*) FROM schemas WHERE tenant_id = $1 AND status != $2',
        [tenantId, 'inactive']
      );
      const total = parseInt(countResult.rows[0].count);

      // Get schemas
      const result = await pool.query(
        `SELECT * FROM schemas 
         WHERE tenant_id = $1 AND status != $2 
         ORDER BY created_at DESC 
         LIMIT $3 OFFSET $4`,
        [tenantId, 'inactive', limit, offset]
      );

      return {
        schemas: result.rows,
        total,
      };
    } catch (error) {
      logger.error('Failed to list schemas:', error);
      throw error;
    }
  }

  private static async clearSchemaCache(schemaId: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const cacheKey = `${this.CACHE_PREFIX}${schemaId}`;
      await redis.del(cacheKey);
    } catch (error) {
      logger.warn('Failed to clear schema cache:', error);
    }
  }
} 