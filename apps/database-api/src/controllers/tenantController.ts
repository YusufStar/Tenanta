import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../services/tenantService';
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
      next(error);
    }
  };
} 