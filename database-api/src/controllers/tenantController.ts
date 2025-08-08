import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenantService';
import { LogService } from '../services/logService';
import { createSuccessResponse, createErrorResponse, createPaginatedResponse } from '../utils/response';
import { logger } from '../shared/logger';
import { PaginationQuery, CreateTenantRequest } from '../types';

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