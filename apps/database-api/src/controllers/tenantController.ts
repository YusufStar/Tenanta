import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenantService';
import { LogService } from '../services/logService';
import { createSuccessResponse, createErrorResponse, createPaginatedResponse } from '../utils/response';
import { logger } from '@tenanta/logging';
import { PaginationQuery } from '../types';

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

      // Log system log for successful tenant retrieval
      await LogService.createSystemLog({
        tenantId: tenant.id,
        level: 'info',
        message: `Tenant retrieved successfully: ${tenant.name} (${tenant.slug})`,
        source: 'TenantController',
        metadata: { 
          tenantId: tenant.id, 
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
          operation: 'getTenantById'
        }
      });

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
} 