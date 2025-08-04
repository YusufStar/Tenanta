import { Request, Response, NextFunction } from 'express';
import { SchemaService } from '../services/schemaService';
import { createSuccessResponse, createErrorResponse } from '../utils/response';
import { logger } from '@tenanta/logging';
import { CreateSchemaRequest, UpdateSchemaRequest } from '../types';

export class SchemaController {
  /**
   * GET /api/v1/schemas/:tenantId
   * Get all schemas for a tenant
   */
  public getTenantSchemas = async (
    req: Request<{ tenantId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { tenantId } = req.params;
      
      logger.info('Getting tenant schemas', { tenantId });

      const schemas = await SchemaService.getTenantSchemas(tenantId);

      logger.info('Tenant schemas retrieved successfully', { 
        tenantId,
        schemasCount: schemas.length
      });

      const response = createSuccessResponse(schemas, 'Tenant schemas retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error getting tenant schemas:', error);
      next(error);
    }
  };

  /**
   * GET /api/v1/schemas/:tenantId/overview
   * Get schema overview with tables and relationships
   */
  public getSchemaOverview = async (
    req: Request<{ tenantId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { tenantId } = req.params;
      
      logger.info('Getting schema overview', { tenantId });

      const overview = await SchemaService.getSchemaOverview(tenantId);

      logger.info('Schema overview retrieved successfully', { 
        tenantId,
        totalTables: overview.totalTables,
        totalRows: overview.totalRows,
        relationshipsCount: overview.relationships.length
      });

      const response = createSuccessResponse(overview, 'Schema overview retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error getting schema overview:', error);
      next(error);
    }
  };

  /**
   * GET /api/v1/schemas/:tenantId/tables/:tableName
   * Get detailed table information
   */
  public getTableDetails = async (
    req: Request<{ tenantId: string; tableName: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { tenantId, tableName } = req.params;
      
      logger.info('Getting table details', { tenantId, tableName });

      const tableDetails = await SchemaService.getTableDetails(tenantId, tableName);

      logger.info('Table details retrieved successfully', { 
        tenantId,
        tableName,
        columnsCount: tableDetails.columns.length,
        foreignKeysCount: tableDetails.foreignKeys.length
      });

      const response = createSuccessResponse(tableDetails, 'Table details retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error getting table details:', error);
      next(error);
    }
  };

  /**
   * POST /api/v1/schemas/:tenantId
   * Create a new schema definition
   */
  public createSchema = async (
    req: Request<{ tenantId: string }, {}, CreateSchemaRequest>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { tenantId } = req.params;
      const schemaData = req.body;
      
      logger.info('Creating schema', { tenantId, schemaName: schemaData.name });

      const schema = await SchemaService.createSchema(tenantId, schemaData);

      logger.info('Schema created successfully', { 
        tenantId,
        schemaId: schema.id,
        schemaName: schema.name
      });

      const response = createSuccessResponse(schema, `Schema "${schema.name}" created successfully`);
      res.status(201).json(response);
    } catch (error) {
      logger.error('Error creating schema:', error);
      next(error);
    }
  };

  /**
   * PUT /api/v1/schemas/:schemaId
   * Update an existing schema
   */
  public updateSchema = async (
    req: Request<{ schemaId: string }, {}, UpdateSchemaRequest>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { schemaId } = req.params;
      const updateData = req.body;
      
      logger.info('Updating schema', { schemaId, updateData });

      const schema = await SchemaService.updateSchema(schemaId, updateData);

      if (!schema) {
        const errorResponse = createErrorResponse(
          'Schema not found',
          'SCHEMA_NOT_FOUND'
        );
        res.status(404).json(errorResponse);
        return;
      }

      logger.info('Schema updated successfully', { 
        schemaId,
        schemaName: schema.name,
        version: schema.version
      });

      const response = createSuccessResponse(schema, `Schema "${schema.name}" updated successfully`);
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error updating schema:', error);
      next(error);
    }
  };

  /**
   * DELETE /api/v1/schemas/:schemaId
   * Delete a schema (soft delete)
   */
  public deleteSchema = async (
    req: Request<{ schemaId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { schemaId } = req.params;
      
      logger.info('Deleting schema', { schemaId });

      // Get schema details first for logging
      const schema = await SchemaService.getSchemaById(schemaId);
      
      if (!schema) {
        const errorResponse = createErrorResponse(
          'Schema not found',
          'SCHEMA_NOT_FOUND'
        );
        res.status(404).json(errorResponse);
        return;
      }

      const deleted = await SchemaService.deleteSchema(schemaId);

      if (!deleted) {
        const errorResponse = createErrorResponse(
          'Schema not found or already deleted',
          'SCHEMA_NOT_FOUND'
        );
        res.status(404).json(errorResponse);
        return;
      }

      logger.info('Schema deleted successfully', { 
        schemaId,
        schemaName: schema.name
      });

      const response = createSuccessResponse(null, `Schema "${schema.name}" deleted successfully`);
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error deleting schema:', error);
      next(error);
    }
  };

  /**
   * GET /api/v1/schemas/schema/:schemaId
   * Get schema by ID
   */
  public getSchemaById = async (
    req: Request<{ schemaId: string }>,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { schemaId } = req.params;
      
      logger.info('Getting schema by ID', { schemaId });

      const schema = await SchemaService.getSchemaById(schemaId);

      if (!schema) {
        const errorResponse = createErrorResponse(
          'Schema not found',
          'SCHEMA_NOT_FOUND'
        );
        res.status(404).json(errorResponse);
        return;
      }

      logger.info('Schema retrieved successfully', { 
        schemaId,
        schemaName: schema.name
      });

      const response = createSuccessResponse(schema, 'Schema retrieved successfully');
      res.status(200).json(response);
    } catch (error) {
      logger.error('Error getting schema by ID:', error);
      next(error);
    }
  };
}
