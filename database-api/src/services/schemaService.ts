import { logger } from '../shared/logger';
import { LogService } from './logService';
import { getDatabasePool } from '../config/database';
import { Schema, CreateSchemaRequest, UpdateSchemaRequest } from '../types';
import { DatabaseService } from './databaseService';

export interface TableInfo {
  tableName: string;
  tableSchema: string;
  rowCount: number;
  size: string;
  lastModified: Date;
  columns?: ColumnInfo[];
}

export interface ColumnInfo {
  title: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  columnDefault?: string | null;
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
  savedCode?: string;
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
   * This method prioritizes saved DBML schema over database structure
   */
  static async getSchemaOverview(tenantId: string): Promise<SchemaOverview> {
    const pool = getDatabasePool();
    let client;
    let tenantClient;
    
    try {
      client = await pool.connect();

      // Get tenant information
      const tenantQuery = 'SELECT name FROM public.tenants WHERE id = $1';
      const tenantResult = await client.query(tenantQuery, [tenantId]);
      
      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant not found');
      }
      
      const tenantName = tenantResult.rows[0].name;

      // First, try to get saved schema from public.schemas table
      const savedSchemaQuery = `
        SELECT definition FROM public.schemas 
        WHERE tenant_id = $1 AND is_active = true 
        ORDER BY version DESC LIMIT 1
      `;
      
      const savedSchemaResult = await client.query(savedSchemaQuery, [tenantId]);
      
      if (savedSchemaResult.rows.length > 0 && savedSchemaResult.rows[0].definition?.code) {
        // Parse DBML code to extract tables and relationships
        const dbmlCode = savedSchemaResult.rows[0].definition.code;
        logger.info(`Using saved DBML for tenant ${tenantId}, parsing schema`);
        
        const parsedSchema = this.parseDBMLToSchema(dbmlCode, tenantName);
        return {
          tenantId,
          schemaName: tenantName,
          tables: parsedSchema.tables,
          relationships: parsedSchema.relationships,
          totalTables: parsedSchema.tables.length,
          totalRows: parsedSchema.tables.reduce((sum: number, table: TableInfo) => sum + (table.rowCount || 0), 0),
          lastModified: new Date(),
          savedCode: dbmlCode
        };
      }

      // Fallback: Get actual database structure if no saved schema
      logger.info(`No saved DBML found for tenant ${tenantId}, reading from tenant database structure`);

      // Get tenant database client
      tenantClient = await DatabaseService.getTenantDatabaseClient(tenantId);

      // Get all tables in the tenant's database
      const tablesWithColumnsQuery = `
        SELECT 
          t.table_name as "tableName",
          'public' as "tableSchema",
          COALESCE(s.n_tup_ins + s.n_tup_upd + s.n_tup_del, 0) as "rowCount",
          COALESCE(pg_size_pretty(pg_total_relation_size(('public.' || t.table_name)::regclass)), '0 bytes') as "size",
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
        LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
        LEFT JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = t.table_schema
        LEFT JOIN (
          SELECT 
            kcu.table_name,
            kcu.column_name,
            true as is_primary
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name 
            AND tc.table_schema = kcu.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk ON pk.table_name = c.table_name 
            AND pk.column_name = c.column_name
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        GROUP BY t.table_name, s.n_tup_ins, s.n_tup_upd, s.n_tup_del, s.last_vacuum
        ORDER BY t.table_name
      `;
      
      const tablesResult = await tenantClient.query(tablesWithColumnsQuery);
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
          AND tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_name
      `;
      
      const relationshipsResult = await tenantClient.query(relationshipsQuery);
      const relationships = relationshipsResult.rows;

      // Calculate totals
      const totalTables = tables.length;
      const totalRows = tables.reduce((sum, table) => sum + parseInt(table.rowCount || '0'), 0);
      const lastModified = tables.length > 0 
        ? new Date(Math.max(...tables.map(t => new Date(t.lastModified).getTime())))
        : new Date();

      return {
        tenantId,
        schemaName: tenantName,
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
      if (tenantClient) {
        tenantClient.release();
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
    let tenantClient;
    
    try {
      client = await pool.connect();

      // Get tenant information
      const tenantQuery = 'SELECT name FROM public.tenants WHERE id = $1';
      const tenantResult = await client.query(tenantQuery, [tenantId]);
      
      if (tenantResult.rows.length === 0) {
        throw new Error('Tenant not found');
      }

      // Get tenant database client
      tenantClient = await DatabaseService.getTenantDatabaseClient(tenantId);

      // Get table info
      const tableQuery = `
        SELECT 
          t.table_name as "tableName",
          'public' as "tableSchema",
          COALESCE(s.n_tup_ins + s.n_tup_upd + s.n_tup_del, 0) as "rowCount",
          COALESCE(pg_size_pretty(pg_total_relation_size(t.table_name)), '0 bytes') as "size",
          COALESCE(s.last_vacuum, CURRENT_TIMESTAMP) as "lastModified"
        FROM information_schema.tables t
        LEFT JOIN pg_stat_user_tables s ON s.relname = t.table_name
        WHERE t.table_schema = 'public' AND t.table_name = $1 AND t.table_type = 'BASE TABLE'
      `;
      
      const tableResult = await tenantClient.query(tableQuery, [tableName]);
      
      if (tableResult.rows.length === 0) {
        throw new Error('Table not found');
      }

      const table = tableResult.rows[0];

      // Get columns with constraints
      const columnsQuery = `
        SELECT 
          c.column_name as "title",
          c.data_type as "type",
          c.is_nullable = 'YES' as "isNullable",
          c.column_default as "columnDefault",
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as "isPrimaryKey"
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT ku.column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage ku 
            ON tc.constraint_name = ku.constraint_name 
            AND tc.table_schema = ku.table_schema
          WHERE tc.constraint_type = 'PRIMARY KEY' 
            AND tc.table_schema = 'public' 
            AND tc.table_name = $1
        ) pk ON pk.column_name = c.column_name
        WHERE c.table_schema = 'public' AND c.table_name = $1
        ORDER BY c.ordinal_position
      `;
      
      const columnsResult = await tenantClient.query(columnsQuery, [tableName]);
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
          AND tc.table_schema = 'public' 
          AND tc.table_name = $1
        ORDER BY tc.constraint_name
      `;
      
      const foreignKeysResult = await tenantClient.query(foreignKeysQuery, [tableName]);
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
      if (tenantClient) {
        tenantClient.release();
      }
    }
  }

  /**
   * Update or create tenant schema definition
   * This is the main function that updates both JSON metadata and actual PostgreSQL schema
   */
  static async updateTenantSchema(tenantId: string, data: {
    name: string;
    description?: string;
    definition: any;
  }): Promise<Schema> {
    const pool = getDatabasePool();
    
    logger.info(`🚀 Starting tenant schema update process for tenant ${tenantId}`, {
      tenantId,
      schemaName: data.name,
      hasDescription: !!data.description,
      hasDefinition: !!data.definition,
      hasDbmlCode: !!(data.definition?.code)
    });
    
    try {
      // First, update the JSON schema definition in public.schemas
      let schema: Schema;
      
      logger.info(`🔍 Checking for existing schema for tenant ${tenantId}`, { tenantId });
      
      // Check if tenant has an existing schema
      const existingSchema = await pool.query(
        'SELECT id FROM public.schemas WHERE tenant_id = $1 AND is_active = true LIMIT 1',
        [tenantId]
      );

      if (existingSchema.rows.length > 0) {
        // Update existing schema
        const schemaId = existingSchema.rows[0].id;
        
        logger.info(`🔄 Updating existing schema for tenant ${tenantId}`, {
          tenantId,
          schemaId,
          schemaName: data.name
        });
        
        const result = await pool.query(
          `UPDATE public.schemas 
           SET name = $1, description = $2, definition = $3, updated_at = NOW(), version = version + 1
           WHERE id = $4 AND is_active = true
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
          [data.name, data.description, JSON.stringify(data.definition), schemaId]
        );

        schema = result.rows[0];
        logger.info(`✅ Tenant schema JSON updated successfully`, { 
          tenantId,
          schemaId: schema.id,
          schemaName: schema.name,
          version: schema.version,
          previousVersion: schema.version - 1
        });
      } else {
        // Create new schema for tenant
        logger.info(`📝 Creating new schema for tenant ${tenantId}`, {
          tenantId,
          schemaName: data.name
        });
        
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

        schema = result.rows[0];
        logger.info(`✅ Tenant schema JSON created successfully`, { 
          tenantId, 
          schemaId: schema.id,
          schemaName: schema.name,
          version: schema.version
        });
      }

      // Now recreate the actual PostgreSQL schema from DBML
      if (data.definition && data.definition.code) {
        logger.info(`🔨 Starting PostgreSQL schema recreation from DBML for tenant ${tenantId}`, {
          tenantId,
          schemaId: schema.id,
          codeLength: data.definition.code.length,
          estimatedTables: (data.definition.code.match(/Table\s+\w+\s*\{/g) || []).length,
          estimatedRelationships: (data.definition.code.match(/Ref:\s*\w+\.\w+\s*>\s*\w+\.\w+/g) || []).length
        });
        
        await this.recreateTenantSchema(tenantId, data.definition.code);
        
        logger.info(`🎉 PostgreSQL schema recreation completed successfully for tenant ${tenantId}`, {
          tenantId,
          schemaId: schema.id,
          schemaName: schema.name,
          version: schema.version
        });
      } else {
        logger.warn(`⚠️ No DBML code found in definition, skipping PostgreSQL schema recreation for tenant ${tenantId}`, {
          tenantId,
          schemaId: schema.id,
          hasDefinition: !!data.definition,
          definitionKeys: data.definition ? Object.keys(data.definition) : []
        });
      }

      logger.info(`🏁 Tenant schema update process completed successfully for tenant ${tenantId}`, {
        tenantId,
        schemaId: schema.id,
        schemaName: schema.name,
        version: schema.version,
        finalStatus: 'success'
      });

      // Save to database logs for dashboard
      LogService.createSystemLog({
        tenantId,
        level: 'success',
        message: `Schema "${schema.name}" updated successfully (version ${schema.version}) with ${(data.definition.code?.match(/Table\s+\w+\s*\{/g) || []).length} tables`,
        source: 'SchemaController',
        metadata: {
          tenantId,
          schemaId: schema.id,
          schemaName: schema.name,
          version: schema.version,
          tablesCount: (data.definition.code?.match(/Table\s+\w+\s*\{/g) || []).length,
          relationshipsCount: (data.definition.code?.match(/Ref:\s*\w+\.\w+\s*>\s*\w+\.\w+/g) || []).length,
          operation: 'updateSchema'
        }
      }).catch(error => {
        logger.error('Failed to save schema update log:', error);
      });

      return schema;
    } catch (error) {
      logger.error(`❌ Failed to update tenant schema for tenant ${tenantId}:`, {
        tenantId,
        schemaName: data.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        hasDbmlCode: !!(data.definition?.code)
      });

      // Save to database logs for dashboard
      LogService.createSystemLog({
        tenantId,
        level: 'error',
        message: `Failed to update schema "${data.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: 'SchemaController',
        metadata: {
          tenantId,
          schemaName: data.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          hasDbmlCode: !!(data.definition?.code),
          operation: 'updateSchema'
        }
      }).catch(logError => {
        logger.error('Failed to save schema update error log:', logError);
      });

      throw error;
    }
  }

  /**
   * Create a new schema
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

  /**
   * Parse DBML code to extract tables and relationships for visualization
   */
  static parseDBMLToSchema(dbmlCode: string, schemaName: string): { tables: TableInfo[], relationships: ForeignKeyInfo[] } {
    const tables: TableInfo[] = [];
    const relationships: ForeignKeyInfo[] = [];

    try {
      // Parse Table definitions
      const tableMatches = dbmlCode.match(/Table\s+(\w+)\s*\{([^}]+)\}/g);
      
      if (tableMatches) {
        tableMatches.forEach((tableMatch: string) => {
          const tableNameMatch = tableMatch.match(/Table\s+(\w+)\s*\{/);
          if (!tableNameMatch) return;
          
          const tableName = tableNameMatch[1];
          const tableContent = tableMatch.match(/\{([^}]+)\}/)?.[1] || '';
          
          // Parse columns from table content
          const columns: ColumnInfo[] = [];
          const columnLines = tableContent.split('\n').filter((line: string) => line.trim());
          
          columnLines.forEach((line: string) => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('//')) {
              // Parse column: id int [pk]
              const columnMatch = trimmedLine.match(/(\w+)\s+(\w+)(?:\s*\[([^\]]+)\])?/);
              if (columnMatch) {
                const [, columnName, dataType, attributes] = columnMatch;
                const isPrimaryKey = attributes?.includes('pk') || false;
                
                columns.push({
                  title: columnName || 'unknown',
                  type: dataType || 'text',
                  isNullable: !attributes?.includes('not null'),
                  isPrimaryKey,
                  columnDefault: null
                });
              }
            }
          });

          tables.push({
            tableName: tableName || 'unknown',
            tableSchema: schemaName,
            rowCount: 0,
            size: '0 bytes',
            lastModified: new Date(),
            columns
          });
        });
      }

      // Parse Ref definitions for relationships
      const refMatches = dbmlCode.match(/Ref:\s*(\w+)\.(\w+)\s*>\s*(\w+)\.(\w+)/g);
      
      if (refMatches) {
        refMatches.forEach((refMatch: string, index: number) => {
          const refParts = refMatch.match(/Ref:\s*(\w+)\.(\w+)\s*>\s*(\w+)\.(\w+)/);
          if (refParts && refParts.length >= 5) {
            const [, fromTable, fromColumn, toTable, toColumn] = refParts;
            
            if (fromTable && fromColumn && toTable && toColumn) {
              relationships.push({
                constraintName: `fk_${fromTable}_${fromColumn}_${index}`,
                fromTable,
                fromColumn,
                toTable,
                toColumn,
                onDelete: 'NO ACTION',
                onUpdate: 'NO ACTION'
              });
            }
          }
        });
      }

      logger.info(`Parsed DBML: ${tables.length} tables, ${relationships.length} relationships`);
      
    } catch (error) {
      logger.error('Failed to parse DBML:', error);
    }

    return { tables, relationships };
  }

  /**
   * Parse DBML code to SQL DDL statements for actual database creation
   */
  static parseDBMLToSQL(dbmlCode: string, schemaName: string): { 
    createTables: string[], 
    createConstraints: string[] 
  } {
    const createTables: string[] = [];
    const createConstraints: string[] = [];

    try {
      // Data type mapping from DBML to PostgreSQL
      const typeMapping: Record<string, string> = {
        'int': 'INTEGER',
        'integer': 'INTEGER',
        'bigint': 'BIGINT',
        'smallint': 'SMALLINT',
        'varchar': 'VARCHAR(255)',
        'char': 'CHAR',
        'text': 'TEXT',
        'longtext': 'TEXT',
        'timestamp': 'TIMESTAMP WITH TIME ZONE',
        'datetime': 'TIMESTAMP WITH TIME ZONE',
        'date': 'DATE',
        'time': 'TIME',
        'boolean': 'BOOLEAN',
        'bool': 'BOOLEAN',
        'decimal': 'DECIMAL',
        'numeric': 'NUMERIC',
        'float': 'REAL',
        'double': 'DOUBLE PRECISION',
        'json': 'JSONB',
        'jsonb': 'JSONB',
        'uuid': 'UUID',
        'serial': 'SERIAL',
        'bigserial': 'BIGSERIAL'
      };

      // Parse tables from DBML
      const tableMatches = dbmlCode.match(/Table\s+(\w+)\s*\{([^}]+)\}/g);
      
      if (tableMatches) {
        tableMatches.forEach((tableMatch) => {
          const tableNameMatch = tableMatch.match(/Table\s+(\w+)\s*\{/);
          if (!tableNameMatch) return;
          
          const tableName = tableNameMatch[1];
          const tableContent = tableMatch.match(/\{([^}]+)\}/)?.[1] || '';
          
          // Parse columns from table content
          const columns: string[] = [];
          const columnLines = tableContent.split('\n').filter(line => line.trim());
          
          columnLines.forEach(line => {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('//')) {
              // Parse column: id int [pk, increment]
              const columnMatch = trimmedLine.match(/(\w+)\s+(\w+)(?:\((\d+)\))?(?:\s*\[([^\]]+)\])?/);
              if (columnMatch) {
                const [, columnName, dataType, length, attributes] = columnMatch;
                
                // Map data type
                const typeKey = dataType?.toLowerCase() || '';
                let sqlType = typeMapping[typeKey] || dataType?.toUpperCase() || 'TEXT';
                
                // Handle length for varchar
                if (dataType?.toLowerCase() === 'varchar' && length) {
                  sqlType = `VARCHAR(${length})`;
                }
                
                let columnDef = `${columnName} ${sqlType}`;
                
                // Parse attributes
                if (attributes) {
                  const attrs = attributes.split(',').map(attr => attr.trim());
                  
                  // Handle constraints
                  if (attrs.includes('pk') || attrs.includes('primary')) {
                    columnDef += ' PRIMARY KEY';
                  }
                  
                  if (attrs.includes('not null')) {
                    columnDef += ' NOT NULL';
                  }
                  
                  if (attrs.includes('unique')) {
                    columnDef += ' UNIQUE';
                  }
                  
                  if (attrs.includes('increment') || attrs.includes('auto_increment')) {
                    if (sqlType === 'INTEGER') {
                      columnDef = columnDef.replace('INTEGER', 'SERIAL');
                    } else if (sqlType === 'BIGINT') {
                      columnDef = columnDef.replace('BIGINT', 'BIGSERIAL');
                    }
                  }
                  
                  // Handle default values
                  const defaultMatch = attributes.match(/default:\s*([^,\]]+)/);
                  if (defaultMatch) {
                    const defaultValue = defaultMatch[1]?.trim();
                    if (defaultValue === 'now()' || defaultValue === 'NOW()') {
                      columnDef += ' DEFAULT NOW()';
                    } else if (defaultValue === "'uuid_generate_v4()'" || defaultValue === 'uuid_generate_v4()') {
                      columnDef += ' DEFAULT uuid_generate_v4()';
                    } else if (defaultValue?.startsWith("'") && defaultValue.endsWith("'")) {
                      columnDef += ` DEFAULT ${defaultValue}`;
                    } else if (!isNaN(Number(defaultValue))) {
                      columnDef += ` DEFAULT ${defaultValue}`;
                    } else {
                      columnDef += ` DEFAULT '${defaultValue}'`;
                    }
                  } else {
                    // Add UUID default for id columns only if no default is already specified
                    if (columnName === 'id' && sqlType === 'UUID') {
                      columnDef += ' DEFAULT uuid_generate_v4()';
                    }
                    
                    // Add timestamp defaults only if no default is already specified
                    if (columnName === 'created_at' && sqlType.includes('TIMESTAMP')) {
                      columnDef += ' DEFAULT NOW()';
                    }
                    if (columnName === 'updated_at' && sqlType.includes('TIMESTAMP')) {
                      columnDef += ' DEFAULT NOW()';
                    }
                  }
                }
                
                columns.push(columnDef);
              }
            }
          });

          if (columns.length > 0) {
            const createTableSQL = `
              CREATE TABLE IF NOT EXISTS ${schemaName}.${tableName} (
                ${columns.join(',\n                ')}
              );
            `;
            createTables.push(createTableSQL);
            
            // Add updated_at trigger if table has updated_at column
            if (columns.some(col => col.includes('updated_at'))) {
              const triggerSQL = `
                DROP TRIGGER IF EXISTS update_${tableName}_updated_at ON ${schemaName}.${tableName};
                CREATE TRIGGER update_${tableName}_updated_at 
                  BEFORE UPDATE ON ${schemaName}.${tableName}
                  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
              `;
              createConstraints.push(triggerSQL);
            }
          }
        });
      }

      // Parse relationships for foreign keys
      const refMatches = dbmlCode.match(/Ref:\s*(\w+)\.(\w+)\s*>\s*(\w+)\.(\w+)/g);
      
      if (refMatches) {
        refMatches.forEach((refMatch, index) => {
          const refParts = refMatch.match(/Ref:\s*(\w+)\.(\w+)\s*>\s*(\w+)\.(\w+)/);
          if (refParts && refParts.length >= 5) {
            const [, fromTable, fromColumn, toTable, toColumn] = refParts;
            
            // Skip if involving system tables
            if (fromTable === 'users' || fromTable === 'sessions' || 
                toTable === 'users' || toTable === 'sessions') {
              return;
            }
            
            if (fromTable && fromColumn && toTable && toColumn) {
              const constraintSQL = `
                ALTER TABLE ${schemaName}.${fromTable} 
                ADD CONSTRAINT fk_${fromTable}_${fromColumn}_${index}
                FOREIGN KEY (${fromColumn}) 
                REFERENCES ${schemaName}.${toTable}(${toColumn}) 
                ON DELETE CASCADE ON UPDATE CASCADE;
              `;
              createConstraints.push(constraintSQL);
            }
          }
        });
      }

      logger.info(`Parsed DBML to SQL: ${createTables.length} tables, ${createConstraints.length} constraints`);
      
    } catch (error) {
      logger.error('Failed to parse DBML to SQL:', error);
    }

    return { createTables, createConstraints };
  }

  /**
   * Recreate tenant schema with new tables from DBML
   * This is the core function that creates actual PostgreSQL tables in tenant's own database
   */
  static async recreateTenantSchema(tenantId: string, dbmlCode: string): Promise<void> {
    let tenantClient;
    
    logger.info(`🔧 Starting schema recreation for tenant ${tenantId}`, {
      tenantId,
      dbmlCodeLength: dbmlCode.length,
      estimatedTables: (dbmlCode.match(/Table\s+\w+\s*\{/g) || []).length,
      estimatedRelationships: (dbmlCode.match(/Ref:\s*\w+\.\w+\s*>\s*\w+\.\w+/g) || []).length
    });
    
    try {
      // Get tenant database client
      logger.info(`🔗 Connecting to tenant database for schema recreation, tenant ${tenantId}`, { tenantId });
      tenantClient = await DatabaseService.getTenantDatabaseClient(tenantId);
      await tenantClient.query('BEGIN');
      
      logger.info(`✅ Connected to tenant database, starting schema recreation for tenant ${tenantId}`, { tenantId });

      // Drop all existing tables and recreate from schema definition
      logger.info(`🧹 Dropping all existing tables for complete recreation, tenant ${tenantId}`, { tenantId });
      
      const dropTablesQuery = `
        DO $$ 
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (
                SELECT tablename 
                FROM pg_tables 
                WHERE schemaname = 'public' 
            ) 
            LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
            END LOOP;
        END $$;
      `;
      
      await tenantClient.query(dropTablesQuery);
      logger.info(`✅ Dropped all existing tables in tenant database for complete recreation, tenant ${tenantId}`, { tenantId });

      // Parse DBML to SQL
      logger.info(`🔍 Parsing DBML code to SQL statements for tenant ${tenantId}`, { 
        tenantId,
        dbmlCodeLength: dbmlCode.length 
      });
      
      const { createTables, createConstraints } = this.parseDBMLToSQL(dbmlCode, 'public');

      logger.info(`📊 DBML parsing completed for tenant ${tenantId}`, {
        tenantId,
        tablesCount: createTables.length,
        constraintsCount: createConstraints.length
      });

      // Create tables
      logger.info(`🏗️ Creating ${createTables.length} tables for tenant ${tenantId}`, {
        tenantId,
        tablesCount: createTables.length
      });
      
      for (let i = 0; i < createTables.length; i++) {
        const createTableSQL = createTables[i];
        
        if (!createTableSQL) {
          logger.warn(`⚠️ Skipping undefined table SQL at index ${i} for tenant ${tenantId}`, {
            tenantId,
            tableIndex: i + 1
          });
          continue;
        }
        
        // Extract table name for logging
        const tableNameMatch = createTableSQL.match(/CREATE TABLE IF NOT EXISTS public\.(\w+)/);
        const tableName = tableNameMatch ? tableNameMatch[1] : `table_${i + 1}`;
        
        logger.info(`🔨 Creating table ${tableName} (${i + 1}/${createTables.length}) for tenant ${tenantId}`, {
          tenantId,
          tableName,
          tableIndex: i + 1,
          totalTables: createTables.length
        });
        
        await tenantClient.query(createTableSQL);
        
        logger.info(`✅ Table ${tableName} created successfully for tenant ${tenantId}`, {
          tenantId,
          tableName
        });
      }
      
      logger.info(`🎉 Created ${createTables.length} tables successfully for tenant ${tenantId}`, {
        tenantId,
        tablesCount: createTables.length
      });

      // Create constraints and triggers
      logger.info(`🔗 Processing ${createConstraints.length} constraints for tenant ${tenantId}`, {
        tenantId,
        constraintsCount: createConstraints.length
      });
      
      for (let i = 0; i < createConstraints.length; i++) {
        const constraintSQL = createConstraints[i];
        
        if (!constraintSQL) {
          logger.warn(`⚠️ Skipping undefined constraint SQL at index ${i} for tenant ${tenantId}`, {
            tenantId,
            constraintIndex: i + 1
          });
          continue;
        }
        
        logger.info(`🔧 Creating constraint ${i + 1}/${createConstraints.length} for tenant ${tenantId}`, {
          tenantId,
          constraintIndex: i + 1,
          totalConstraints: createConstraints.length
        });
        
        try {
          await tenantClient.query(constraintSQL);
          
          logger.info(`✅ Constraint ${i + 1} created successfully for tenant ${tenantId}`, {
            tenantId,
            constraintIndex: i + 1
          });
        } catch (constraintError) {
          // Log but don't fail on constraint errors (they might already exist)
          logger.warn(`⚠️ Failed to create constraint ${i + 1} for tenant ${tenantId}`, {
            tenantId,
            constraintIndex: i + 1,
            error: constraintError instanceof Error ? constraintError.message : 'Unknown constraint error'
          });
        }
      }
      
      logger.info(`✅ Processed ${createConstraints.length} constraints for tenant ${tenantId}`, {
        tenantId,
        constraintsCount: createConstraints.length
      });

      await tenantClient.query('COMMIT');
      
      logger.info(`🏁 Successfully recreated schema for tenant ${tenantId} in their own database`, {
        tenantId,
        tablesCreated: createTables.length,
        constraintsProcessed: createConstraints.length,
        finalStatus: 'success'
      });

      // Save to database logs for dashboard
      LogService.createSystemLog({
        tenantId,
        level: 'success',
        message: `Database schema recreated successfully with ${createTables.length} tables and ${createConstraints.length} constraints`,
        source: 'SchemaController',
        metadata: {
          tenantId,
          tablesCreated: createTables.length,
          constraintsProcessed: createConstraints.length,
          operation: 'recreateTenantSchema'
        }
      }).catch(error => {
        logger.error('Failed to save schema recreation log:', error);
      });
      
    } catch (error) {
      if (tenantClient) {
        await tenantClient.query('ROLLBACK');
        logger.error(`🔄 Rolled back transaction due to error for tenant ${tenantId}`, { tenantId });
      }
      
      logger.error(`❌ Failed to recreate tenant schema for ${tenantId}:`, {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error',
        dbmlCodeLength: dbmlCode.length
      });

      // Save to database logs for dashboard
      LogService.createSystemLog({
        tenantId,
        level: 'error',
        message: `Failed to recreate database schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        source: 'SchemaController',
        metadata: {
          tenantId,
          error: error instanceof Error ? error.message : 'Unknown error',
          dbmlCodeLength: dbmlCode.length,
          operation: 'recreateTenantSchema'
        }
      }).catch(logError => {
        logger.error('Failed to save schema recreation error log:', logError);
      });

      throw error;
    } finally {
      if (tenantClient) {
        tenantClient.release();
        logger.info(`🔌 Released tenant database connection for tenant ${tenantId}`, { tenantId });
      }
    }
  }
}
