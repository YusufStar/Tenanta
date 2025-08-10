import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenantService';
import { LogService } from '../services/logService';
import { createSuccessResponse, createErrorResponse, createPaginatedResponse } from '../utils/response';
import { logger } from '../shared/logger';
import { PaginationQuery, CreateTenantRequest } from '../types';
import { DatabaseService } from '../services/databaseService';
import { getDatabasePool } from '../config/database';

export class TenantController {
  private tenantService: typeof TenantService;

  constructor() {
    this.tenantService = TenantService;
  }

  /**
   * GET /api/v1/tenants
   * Get all tenants with pagination
   */
  public getAllTenants = async (
    req: Request<{}, {}, {}, PaginationQuery>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      logger.info('Getting all tenants', { page, limit });

      const result = await this.tenantService.listTenants(
        parseInt(page.toString()),
        parseInt(limit.toString())
      );

      const response = createPaginatedResponse(
        result.tenants,
        parseInt(page.toString()),
        parseInt(limit.toString()),
        result.total,
        'Tenants retrieved successfully'
      );

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error getting all tenants:', error);
      next(error);
    }
  };

  /**
   * GET /api/v1/tenants/:id/dashboard
   * Get rich dashboard data for a tenant (database metrics, history, logs, connection info)
   */
  public getTenantDashboard = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const { id: tenantId } = req.params;
    try {
      // 1) Ensure tenant exists
      const tenant = await this.tenantService.getTenantById(tenantId);
      if (!tenant) {
        const errorResponse = createErrorResponse('Tenant not found', 'TENANT_NOT_FOUND');
        res.status(404).json(errorResponse);
        return;
      }

      // 2) Build connection strings
      const databaseUrl = process.env.DATABASE_URL || '';
      const url = new URL(databaseUrl);
      const tenantDbName = `tenant_${tenantId.replace(/-/g, '_')}`;
      url.pathname = `/${tenantDbName}`;
      const fullConnStr = url.toString();
      // Mask password in connection string for display
      const maskedUrl = new URL(fullConnStr);
      if (maskedUrl.password) maskedUrl.password = '********';
      const maskedConnStr = maskedUrl.toString();

      // 3) Collect DB metrics from tenant DB
      const tenantClient = await DatabaseService.getTenantDatabaseClient(tenantId);
      let dbMetrics: any = {};
      try {
        // Execute sequential queries to avoid concurrency on same client
        const sizeRes = await tenantClient.query(
          `SELECT 
             pg_database_size(current_database()) AS size_bytes,
             pg_size_pretty(pg_database_size(current_database())) AS size_pretty`
        );
        const tablesCountRes = await tenantClient.query(
          `SELECT COUNT(*)::int AS total_tables
           FROM information_schema.tables 
           WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
        );
        const totalRowsRes = await tenantClient.query(
          `SELECT COALESCE(SUM(n_live_tup),0)::bigint AS total_rows FROM pg_stat_user_tables`
        );
        const topTablesRes = await tenantClient.query(
          `SELECT relname AS table_name,
                  pg_total_relation_size(relid) AS size_bytes,
                  pg_size_pretty(pg_total_relation_size(relid)) AS size_pretty
           FROM pg_catalog.pg_statio_user_tables
           ORDER BY pg_total_relation_size(relid) DESC
           LIMIT 5`
        );
        const activeConnsRes = await tenantClient.query(
          `SELECT COUNT(*)::int AS connections FROM pg_stat_activity WHERE datname = current_database()`
        );
        const versionRes = await tenantClient.query(`SELECT version(), NOW() AS current_time, current_database() AS dbname`);

        dbMetrics = {
          sizeBytes: Number(sizeRes.rows?.[0]?.size_bytes || 0),
          sizePretty: sizeRes.rows?.[0]?.size_pretty || '0 bytes',
          totalTables: Number(tablesCountRes.rows?.[0]?.total_tables || 0),
          totalRows: Number(totalRowsRes.rows?.[0]?.total_rows || 0),
          activeConnections: Number(activeConnsRes.rows?.[0]?.connections || 0),
          version: versionRes.rows?.[0]?.version || '',
          currentTime: versionRes.rows?.[0]?.current_time || new Date().toISOString(),
          dbName: versionRes.rows?.[0]?.dbname || tenantDbName,
          topTables: (topTablesRes.rows || []).map((r: any) => ({
            tableName: r.table_name,
            sizeBytes: Number(r.size_bytes || 0),
            sizePretty: r.size_pretty,
          }))
        };
      } finally {
        tenantClient.release();
      }

      // 4) Query history metrics and recent queries from main DB
      const mainPool = getDatabasePool();
      const mainClient = await mainPool.connect();
      let historySummary: any = { latest: [], metrics7d: { series: [], totals: { total: 0, success: 0, failure: 0 } } };
      try {
        const latestRes = await mainClient.query(
          `SELECT id, query_text, execution_timestamp, execution_time_ms, rows_affected, success
           FROM public.sql_query_history
           WHERE tenant_id = $1
           ORDER BY execution_timestamp DESC
           LIMIT 5`,
          [tenantId]
        );

        const metricsRes = await mainClient.query(
          `SELECT date_trunc('day', execution_timestamp) AS day,
                  COUNT(*)::int AS total,
                  COUNT(*) FILTER (WHERE success) ::int AS success,
                  COUNT(*) FILTER (WHERE NOT success) ::int AS failure
           FROM public.sql_query_history
           WHERE tenant_id = $1 AND execution_timestamp >= NOW() - interval '7 days'
           GROUP BY 1
           ORDER BY 1`,
          [tenantId]
        );

        // Totals across 7 days
        const totals = metricsRes.rows.reduce((acc: any, r: any) => {
          acc.total += Number(r.total || 0);
          acc.success += Number(r.success || 0);
          acc.failure += Number(r.failure || 0);
          return acc;
        }, { total: 0, success: 0, failure: 0 });

        historySummary = {
          latest: latestRes.rows || [],
          metrics7d: {
            series: metricsRes.rows.map((r: any) => ({
              day: (r.day instanceof Date) ? r.day.toISOString() : r.day,
              total: Number(r.total || 0),
              success: Number(r.success || 0),
              failure: Number(r.failure || 0),
            })),
            totals
          }
        };
      } finally {
        mainClient.release();
      }

      // 5) Recent logs (system logs) for the tenant
      const logs = await LogService.getSystemLogs(tenantId, 10, 0);

      // 6) Connection checks (postgres/redis)
      let connection = { postgresql: false, redis: false };
      try {
        const status = await this.tenantService.testTenantConnection(tenantId);
        connection = { postgresql: status.postgresql, redis: status.redis };
      } catch (e) {
        logger.warn('Connection test failed for tenant dashboard', { tenantId });
      }

      const response = createSuccessResponse({
        tenant,
        connection,
        connectionStrings: {
          postgres: fullConnStr,
          masked: maskedConnStr,
        },
        database: dbMetrics,
        history: historySummary,
        logs
      }, 'Tenant dashboard data retrieved successfully');

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error getting tenant dashboard:', error);
      next(error);
    }
  };

  /**
   * GET /api/v1/tenants/:id
   * Get tenant by ID
   */
  public getTenantById = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      logger.info('Getting tenant by ID', { tenantId: id });

      const tenant = await this.tenantService.getTenantById(id);

      if (!tenant) {
        // Log system log for tenant not found
        await LogService.createSystemLog({
          level: 'warning',
          message: `Tenant not found with ID: ${id}`,
          source: 'TenantController',
          metadata: { tenantId: id, operation: 'getTenantById' }
        });

        const errorResponse = createErrorResponse(
          'Tenant not found',
          'TENANT_NOT_FOUND'
        );
        res.status(404).json(errorResponse);
        return;
      }

      const response = createSuccessResponse(tenant, 'Tenant retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error getting tenant by ID:', error);
      
      // Log system log for error
      await LogService.createSystemLog({
        level: 'error',
        message: `Error retrieving tenant with ID: ${req.params.id}`,
        source: 'TenantController',
        metadata: { 
          tenantId: req.params.id, 
          operation: 'getTenantById',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      next(error);
    }
  };

  /**
   * POST /api/v1/tenants
   * Create a new tenant
   */
  public createTenant = async (
    req: Request<{}, {}, CreateTenantRequest>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantData = req.body;

      logger.info(`Starting tenant creation process for: ${tenantData.name}`, { 
        tenantName: tenantData.name,
        tenantSlug: tenantData.slug,
        schemaName: tenantData.schemaName,
        operation: 'createTenant'
      });

      const tenant = await this.tenantService.createTenant(tenantData);

      // Log system log for successful tenant creation
      await LogService.createSystemLog({
        tenantId: tenant.id,
        level: 'success',
        message: `Tenant "${tenant.name}" created successfully with database and Redis setup`,
        source: 'TenantController',
        metadata: { 
          tenantId: tenant.id, 
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
          schemaName: tenant.schemaName,
          operation: 'createTenant',
          details: {
            postgresqlSchema: `${tenant.schemaName} schema created and ready for connection`,
            redisDatabase: `Redis database setup completed for tenant ${tenant.name}`,
            userModel: `Default users table created in ${tenant.schemaName}.users`
          }
        }
      });

      const response = createSuccessResponse(tenant, `Tenant "${tenant.name}" created successfully with database and Redis setup`);
      res.status(201).json(response);
    } catch (error) {
      logger.error(`Error creating tenant "${req.body.name}":`, error);
      
      // Log system log for error
      await LogService.createSystemLog({
        level: 'error',
        message: `Failed to create tenant "${req.body.name}"`,
        source: 'TenantController',
        metadata: { 
          tenantName: req.body.name,
          tenantSlug: req.body.slug,
          schemaName: req.body.schemaName,
          operation: 'createTenant',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      next(error);
    }
  };

  /**
   * DELETE /api/v1/tenants/:id
   * Delete tenant by ID (soft delete)
   */
  public deleteTenant = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      logger.info(`Starting tenant deletion process for ID: ${id}`);

      const deleted = await this.tenantService.deleteTenant(id);

      if (!deleted) {
        // Log system log for tenant not found
        await LogService.createSystemLog({
          level: 'warning',
          message: `Tenant not found for deletion with ID: ${id}`,
          source: 'TenantController',
          metadata: { tenantId: id, operation: 'deleteTenant' }
        });

        const errorResponse = createErrorResponse(
          'Tenant not found',
          'TENANT_NOT_FOUND'
        );
        res.status(404).json(errorResponse);
        return;
      }

      // Log system log for successful tenant deletion
      await LogService.createSystemLog({
        level: 'success',
        message: `Tenant "${id}" deleted successfully with database and Redis cleanup`,
        source: 'TenantController',
        metadata: { 
          tenantId: id, 
          operation: 'deleteTenant',
          details: {
            postgresqlSchema: 'Schema dropped and cleaned up',
            redisDatabase: 'Redis database flushed and cleaned up',
            tenantData: 'Tenant marked as inactive'
          }
        }
      });

      const response = createSuccessResponse(null, 'Tenant deleted successfully with database and Redis cleanup');
      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error deleting tenant with ID: ${req.params.id}:`, error);
      
      // Log system log for error
      await LogService.createSystemLog({
        level: 'error',
        message: `Error deleting tenant with ID: ${req.params.id}`,
        source: 'TenantController',
        metadata: { 
          tenantId: req.params.id, 
          operation: 'deleteTenant',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      next(error);
    }
  };
} 