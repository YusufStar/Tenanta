import { getDatabasePool } from '../config/database';
import { getRedisClient } from '../config/redis';
import { logger } from '@tenanta/logging';
import { Tenant, CreateTenantRequest, UpdateTenantRequest } from '../types';

export class TenantService {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly CACHE_PREFIX = 'tenant:';

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

      await client.query('COMMIT');

      const tenant = result.rows[0];
      
      // Clear cache
      await this.clearTenantCache(tenant.id);

      logger.info('Tenant created successfully', { tenantId: tenant.id });
      return tenant;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create tenant:', error);
      throw error;
    } finally {
      client.release();
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

      logger.info('Tenant updated successfully', { tenantId: id });
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

      // Check if tenant exists
      const existingTenant = await client.query(
        'SELECT id FROM public.tenants WHERE id = $1',
        [id]
      );

      if (existingTenant.rows.length === 0) {
        return false;
      }

      // Soft delete - set is_active to false
      await client.query(
        'UPDATE public.tenants SET is_active = false, updated_at = NOW() WHERE id = $1',
        [id]
      );

      await client.query('COMMIT');

      // Clear cache
      await this.clearTenantCache(id);

      logger.info('Tenant deleted successfully', { tenantId: id });
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to delete tenant:', error);
      throw error;
    } finally {
      client.release();
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