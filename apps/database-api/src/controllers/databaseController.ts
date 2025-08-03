import { Request, Response } from 'express';
import { logger } from '@tenanta/logging';
import { DatabaseService } from '../services/databaseService';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

export class DatabaseController {
  // Get all tables for a tenant
  static async getTenantTables(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      
      if (!tenantId) {
        return res.status(400).json(createErrorResponse('Tenant ID is required'));
      }
      
      logger.info('Getting tenant tables', { tenantId });
      
      const tables = await DatabaseService.getTenantTables(tenantId);
      
      logger.info('Successfully retrieved tenant tables', { 
        tenantId, 
        tableCount: tables.length 
      });
      
      const response = createSuccessResponse(tables, 'Tenant tables retrieved successfully');
      return res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting tenant tables', { 
        tenantId: req.params.tenantId, 
        error: errorMessage 
      });
      const response = createErrorResponse('Failed to get tenant tables');
      return res.status(500).json(response);
    }
  }

  // Get table structure (columns)
  static async getTableColumns(req: Request, res: Response) {
    try {
      const { tenantId, tableName } = req.params;
      
      if (!tenantId || !tableName) {
        return res.status(400).json(createErrorResponse('Tenant ID and table name are required'));
      }
      
      logger.info('Getting table columns', { tenantId, tableName });
      
      const columns = await DatabaseService.getTableColumns(tenantId, tableName);
      
      logger.info('Successfully retrieved table columns', { 
        tenantId, 
        tableName, 
        columnCount: columns.length 
      });
      
      const response = createSuccessResponse(columns, 'Table columns retrieved successfully');
      return res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting table columns', { 
        tenantId: req.params.tenantId, 
        tableName: req.params.tableName, 
        error: errorMessage 
      });
      const response = createErrorResponse('Failed to get table columns');
      return res.status(500).json(response);
    }
  }

  // Get table data with pagination
  static async getTableData(req: Request, res: Response) {
    try {
      const { tenantId, tableName } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const sortBy = req.query.sortBy as string;
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'asc';
      
      if (!tenantId || !tableName) {
        return res.status(400).json(createErrorResponse('Tenant ID and table name are required'));
      }
      
      logger.info('Getting table data', { 
        tenantId, 
        tableName, 
        page, 
        limit, 
        sortBy, 
        sortOrder 
      });
      
      const tableData = await DatabaseService.getTableData(
        tenantId, 
        tableName, 
        page, 
        limit, 
        sortBy, 
        sortOrder
      );
      
      logger.info('Successfully retrieved table data', { 
        tenantId, 
        tableName, 
        rowCount: tableData.data.length,
        totalCount: tableData.totalCount
      });
      
      const response = createSuccessResponse(tableData, 'Table data retrieved successfully');
      return res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting table data', { 
        tenantId: req.params.tenantId, 
        tableName: req.params.tableName, 
        error: errorMessage 
      });
      const response = createErrorResponse('Failed to get table data');
      return res.status(500).json(response);
    }
  }

  // Get database health status
  static async getDatabaseHealth(req: Request, res: Response) {
    try {
      logger.info('Getting database health status');
      
      const health = await DatabaseService.getDatabaseHealth();
      
      logger.info('Successfully retrieved database health', { 
        status: health.status,
        activeConnections: health.activeConnections,
        totalConnections: health.totalConnections
      });
      
      const response = createSuccessResponse(health, 'Database health retrieved successfully');
      return res.status(200).json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error getting database health', { error: errorMessage });
      const response = createErrorResponse('Failed to get database health');
      return res.status(500).json(response);
    }
  }
} 