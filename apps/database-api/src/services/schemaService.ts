import { logger } from '@tenanta/logging';
import { getDatabasePool } from '../config/database';
import { Schema, CreateSchemaRequest, UpdateSchemaRequest } from '../types';

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
  isNullable: string;
  columnDefault?: string;
  characterMaximumLength?: number;
  isPrimaryKey: boolean;
  isUnique: boolean;
}

export interface ForeignKeyInfo {
  constraintName: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  onDelete: string;
  onUpdate: string;
}

export interface SchemaOverview {
  tenantId: string;
  schemaName: string;
  tables: TableInfo[];
  relationships: ForeignKeyInfo[];
  totalTables: number;
  totalRows: number;
  lastModified: Date;
}

export class SchemaService {
  /**
   * Get all schemas for a tenant
   */
  static async getTenantSchemas(tenantId: string): Promise<Schema[]> {
    const pool = getDatabasePool();
    
    try {
      const result = await pool.query(
        `SELECT 
           id,
           tenant_id as "tenantId",
           name,
           description,
           version,
           definition,
           is_active as "isActive",
           created_at as "createdAt",
           updated_at as "updatedAt"
         FROM public.schemas 
         WHERE tenant_id = $1 AND is_active = true
         ORDER BY created_at DESC`,
        [tenantId]
      );

      return result.rows;
    } catch (error) {
      logger.error('Failed to get tenant schemas:', error);
      throw error;
    }
  }

  /**
   * Get schema overview with tables and relationships
   */
  static async getSchemaOverview(tenantId: string): Promise<SchemaOverview> {
    const pool = getDatabasePool();
    let client;
    
    try {
      client = await pool.connect();

      // Get tenant schema name
      const tenantQuery = 'SELECT schema_name FROM public.tenants WHERE id = $1';
      const tenantResult = await client.query(tenantQuery, [tenantId]);
      
      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant not found');
      }
      
      const schemaName = tenantResult.rows[0].schema_name;

      // Get all tables in the tenant's schema with their columns
      const tablesWithColumnsQuery = `
        SELECT 
          t.table_name as "tableName",
          t.table_schema as "tableSchema",
          COALESCE(s.n_tup_ins + s.n_tup_upd + s.n_tup_del, 0) as "rowCount",
          COALESCE(pg_size_pretty(pg_total_relation_size(t.table_schema||'.'||t.table_name)), '0 bytes') as "size",
          COALESCE(s.last_vacuum, CURRENT_TIMESTAMP) as "lastModified",
          json_agg(
            json_build_object(
              'title', c.column_name,
              'type', CASE 
                WHEN c.data_type = 'character varying' THEN 'varchar'
                WHEN c.data_type = 'timestamp with time zone' THEN 'timestamptz'
                WHEN c.data_type = 'timestamp without time zone' THEN 'timestamp'
                WHEN c.data_type = 'character' THEN 'char'
                WHEN c.data_type = 'double precision' THEN 'float8'
                WHEN c.data_type = 'real' THEN 'float4'
                ELSE c.data_type
              END,
              'isNullable', c.is_nullable = 'YES',
              'isPrimaryKey', COALESCE(pk.is_primary, false),
              'columnDefault', c.column_default
            ) ORDER BY c.ordinal_position
          ) as "columns"
        FROM information_schema.tables t
        LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name AND s.schemaname = t.table_schema
        LEFT JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
        LEFT JOIN (
          SELECT 
            kcu.table_schema,
            kcu.table_name,
            kcu.column_name,
            true as is_primary
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name 
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk ON pk.table_schema = c.table_schema 
            AND pk.table_name = c.table_name 
            AND pk.column_name = c.column_name
        WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE'
        GROUP BY t.table_name, t.table_schema, s.n_tup_ins, s.n_tup_upd, s.n_tup_del, s.last_vacuum
        ORDER BY t.table_name
      `;
      
      const tablesResult = await client.query(tablesWithColumnsQuery, [schemaName]);
      const tables = tablesResult.rows;

      // Get foreign key relationships
      const relationshipsQuery = `
        SELECT 
          tc.constraint_name as "constraintName",
          tc.table_name as "fromTable",
          kcu.column_name as "fromColumn",
          ccu.table_name as "toTable",
          ccu.column_name as "toColumn",
          rc.delete_rule as "onDelete",
          rc.update_rule as "onUpdate"
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints rc 
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_schema = $1
        ORDER BY tc.table_name, tc.constraint_name
      `;
      
      const relationshipsResult = await client.query(relationshipsQuery, [schemaName]);
      const relationships = relationshipsResult.rows;

      // Calculate totals
      const totalTables = tables.length;
      const totalRows = tables.reduce((sum, table) => sum + parseInt(table.rowCount || '0'), 0);
      const lastModified = tables.length > 0 
        ? new Date(Math.max(...tables.map(t => new Date(t.lastModified).getTime())))
        : new Date();

      return {
        tenantId,
        schemaName,
        tables,
        relationships,
        totalTables,
        totalRows,
        lastModified
      };

    } catch (error) {
      logger.error('Failed to get schema overview:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Get detailed table information with columns and constraints
   */
  static async getTableDetails(tenantId: string, tableName: string): Promise<{
    table: TableInfo;
    columns: ColumnInfo[];
    foreignKeys: ForeignKeyInfo[];
  }> {
    const pool = getDatabasePool();
    let client;
    
    try {
      client = await pool.connect();

      // Get tenant schema name
      const tenantQuery = 'SELECT schema_name FROM public.tenants WHERE id = $1';
      const tenantResult = await client.query(tenantQuery, [tenantId]);
      
      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant not found');
      }
      
      const schemaName = tenantResult.rows[0].schema_name;

      // Get table info
      const tableQuery = `
        SELECT 
          t.table_name as "tableName",
          t.table_schema as "tableSchema",
          COALESCE(s.n_tup_ins + s.n_tup_upd + s.n_tup_del, 0) as "rowCount",
          COALESCE(pg_size_pretty(pg_total_relation_size(t.table_schema||'.'||t.table_name)), '0 bytes') as "size",
          COALESCE(s.last_vacuum, CURRENT_TIMESTAMP) as "lastModified"
        FROM information_schema.tables t
        LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name AND s.schemaname = t.table_schema
        WHERE t.table_schema = $1 AND t.table_name = $2 AND t.table_type = 'BASE TABLE'
      `;
      
      const tableResult = await client.query(tableQuery, [schemaName, tableName]);
      
      if (tableResult.rows.length === 0) {
        throw new Error('Table not found');
      }

      const table = tableResult.rows[0];

      // Get columns with constraints
      const columnsQuery = `
        SELECT 
          c.column_name as "columnName",
          c.data_type as "dataType",
          c.is_nullable as "isNullable",
          c.column_default as "columnDefault",
          c.character_maximum_length as "characterMaximumLength",
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as "isPrimaryKey",
          CASE WHEN u.column_name IS NOT NULL THEN true ELSE false END as "isUnique"
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku 
            ON tc.constraint_name = ku.constraint_name 
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY' 
            AND tc.table_schema = $1 
            AND tc.table_name = $2
        ) pk ON pk.column_name = c.column_name
        LEFT JOIN (
          SELECT ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku 
            ON tc.constraint_name = ku.constraint_name 
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'UNIQUE' 
            AND tc.table_schema = $1 
            AND tc.table_name = $2
        ) u ON u.column_name = c.column_name
        WHERE c.table_schema = $1 AND c.table_name = $2
        ORDER BY c.ordinal_position
      `;
      
      const columnsResult = await client.query(columnsQuery, [schemaName, tableName]);
      const columns = columnsResult.rows;

      // Get foreign keys for this table
      const foreignKeysQuery = `
        SELECT 
          tc.constraint_name as "constraintName",
          tc.table_name as "fromTable",
          kcu.column_name as "fromColumn",
          ccu.table_name as "toTable",
          ccu.column_name as "toColumn",
          rc.delete_rule as "onDelete",
          rc.update_rule as "onUpdate"
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name 
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu 
          ON ccu.constraint_name = tc.constraint_name
        JOIN information_schema.referential_constraints rc 
          ON tc.constraint_name = rc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND tc.table_schema = $1 
          AND tc.table_name = $2
        ORDER BY tc.constraint_name
      `;
      
      const foreignKeysResult = await client.query(foreignKeysQuery, [schemaName, tableName]);
      const foreignKeys = foreignKeysResult.rows;

      return {
        table,
        columns,
        foreignKeys
      };

    } catch (error) {
      logger.error('Failed to get table details:', error);
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Create a new schema definition
   */
  static async createSchema(tenantId: string, data: CreateSchemaRequest): Promise<Schema> {
    const pool = getDatabasePool();
    
    try {
      const result = await pool.query(
        `INSERT INTO public.schemas (tenant_id, name, description, definition)
         VALUES ($1, $2, $3, $4)
         RETURNING 
           id,
           tenant_id as "tenantId",
           name,
           description,
           version,
           definition,
           is_active as "isActive",
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [tenantId, data.name, data.description, JSON.stringify(data.definition)]
      );

      const schema = result.rows[0];

      logger.info('Schema created successfully', { 
        tenantId, 
        schemaId: schema.id,
        schemaName: schema.name 
      });

      return schema;
    } catch (error) {
      logger.error('Failed to create schema:', error);
      throw error;
    }
  }

  /**
   * Update an existing schema
   */
  static async updateSchema(schemaId: string, data: UpdateSchemaRequest): Promise<Schema | null> {
    const pool = getDatabasePool();
    
    try {
      // Check if schema exists
      const existingSchema = await pool.query(
        'SELECT id FROM public.schemas WHERE id = $1 AND is_active = true',
        [schemaId]
      );

      if (existingSchema.rows.length === 0) {
        return null;
      }

      // Build update fields
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex}`);
        values.push(data.name);
        paramIndex++;
      }

      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        values.push(data.description);
        paramIndex++;
      }

      if (data.definition !== undefined) {
        updateFields.push(`definition = $${paramIndex}`);
        values.push(JSON.stringify(data.definition));
        paramIndex++;
      }

      if (data.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        values.push(data.isActive);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        return existingSchema.rows[0];
      }

      updateFields.push(`updated_at = NOW()`);
      updateFields.push(`version = version + 1`);
      values.push(schemaId);

      const result = await pool.query(
        `UPDATE public.schemas 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING 
           id,
           tenant_id as "tenantId",
           name,
           description,
           version,
           definition,
           is_active as "isActive",
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        values
      );

      const schema = result.rows[0];

      logger.info('Schema updated successfully', { 
        schemaId,
        schemaName: schema.name 
      });

      return schema;
    } catch (error) {
      logger.error('Failed to update schema:', error);
      throw error;
    }
  }

  /**
   * Delete a schema (soft delete)
   */
  static async deleteSchema(schemaId: string): Promise<boolean> {
    const pool = getDatabasePool();
    
    try {
      const result = await pool.query(
        'UPDATE public.schemas SET is_active = false, updated_at = NOW() WHERE id = $1 AND is_active = true',
        [schemaId]
      );

      if (result.rowCount === 0) {
        return false;
      }

      logger.info('Schema deleted successfully', { schemaId });
      return true;
    } catch (error) {
      logger.error('Failed to delete schema:', error);
      throw error;
    }
  }

  /**
   * Get schema by ID
   */
  static async getSchemaById(schemaId: string): Promise<Schema | null> {
    const pool = getDatabasePool();
    
    try {
      const result = await pool.query(
        `SELECT 
           id,
           tenant_id as "tenantId",
           name,
           description,
           version,
           definition,
           is_active as "isActive",
           created_at as "createdAt",
           updated_at as "updatedAt"
         FROM public.schemas 
         WHERE id = $1 AND is_active = true`,
        [schemaId]
      );

      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('Failed to get schema by ID:', error);
      throw error;
    }
  }
}
