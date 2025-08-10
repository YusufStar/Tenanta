import { Request, Response } from 'express';
import { DatabaseService } from '../services/databaseService';
import { logger } from '../shared/logger';
import { ApiResponse } from '../utils/response';

interface ExecuteQueryRequest {
  query: string;
}

interface QueryResult {
  success: boolean;
  data?: any[];
  columns?: string[];
  rowsAffected: number;
  executionTime: number;
  error?: string;
}

/**
 * Execute SQL query for a specific tenant
 */
export const executeQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const { query }: ExecuteQueryRequest = req.body;

    // Validate tenant ID
    if (!tenantId) {
      res.status(400).json(
        ApiResponse.error('Tenant ID is required', 'TENANT_ID_REQUIRED')
      );
      return;
    }

    // Validate query
    if (!query || typeof query !== 'string') {
      res.status(400).json(
        ApiResponse.error('Query is required and must be a string', 'INVALID_QUERY')
      );
      return;
    }

    // Basic query validation
    const validation = DatabaseService.validateQuery(query);
    if (!validation.isValid) {
      res.status(400).json(
        ApiResponse.error(validation.error || 'Invalid query', 'QUERY_VALIDATION_FAILED')
      );
      return;
    }

    logger.info(`Executing SQL query for tenant ${tenantId}`, {
      tenantId,
      queryLength: query.length,
      queryPreview: query.substring(0, 100) + (query.length > 100 ? '...' : '')
    });

    // Prepare metadata for history
    const metadata: { userAgent?: string; ipAddress?: string; sessionId?: string } = {};
    const userAgent = req.get('User-Agent');
    if (userAgent) metadata.userAgent = userAgent;
    const ipAddress = req.ip || req.connection.remoteAddress;
    if (ipAddress) metadata.ipAddress = ipAddress;
    const sessionId = req.get('X-Session-ID');
    if (sessionId) metadata.sessionId = sessionId;

    // Execute the query
    const result: QueryResult = await DatabaseService.executeQuery(tenantId, query, metadata);

    if (result.success) {
      res.status(200).json(
        ApiResponse.success(result, 'Query executed successfully')
      );
    } else {
      res.status(400).json(
        ApiResponse.error(result.error || 'Query execution failed', 'QUERY_EXECUTION_FAILED', {
          executionTime: result.executionTime
        })
      );
    }

  } catch (error) {
    logger.error('Failed to execute SQL query:', error);
    res.status(500).json(
      ApiResponse.error('Internal server error', 'INTERNAL_SERVER_ERROR')
    );
  }
};

/**
 * Validate SQL query without executing it
 */
export const validateQuery = async (req: Request, res: Response): Promise<void> => {
  try {
    const { query }: { query: string } = req.body;

    if (!query || typeof query !== 'string') {
      res.status(400).json(
        ApiResponse.error('Query is required and must be a string', 'INVALID_QUERY')
      );
      return;
    }

    const validation = DatabaseService.validateQuery(query);

    res.status(200).json(
      ApiResponse.success(validation, 'Query validation completed')
    );

  } catch (error) {
    logger.error('Failed to validate SQL query:', error);
    res.status(500).json(
      ApiResponse.error('Internal server error', 'INTERNAL_SERVER_ERROR')
    );
  }
};

/**
 * Get tenant database status
 */
export const getDatabaseStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      res.status(400).json(
        ApiResponse.error('Tenant ID is required', 'TENANT_ID_REQUIRED')
      );
      return;
    }

    // Try to get a connection to check if database exists and is accessible
    try {
      const client = await DatabaseService.getTenantDatabaseClient(tenantId);
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      client.release();

      res.status(200).json(
        ApiResponse.success({
          status: 'connected',
          currentTime: result.rows[0].current_time,
          version: result.rows[0].version,
          tenantId
        }, 'Database status retrieved successfully')
      );

    } catch (error) {
      res.status(500).json(
        ApiResponse.error('Database connection failed', 'DATABASE_CONNECTION_FAILED', {
          tenantId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      );
    }

  } catch (error) {
    logger.error('Failed to get database status:', error);
    res.status(500).json(
      ApiResponse.error('Internal server error', 'INTERNAL_SERVER_ERROR')
    );
  }
};

/**
 * Get SQL query history for a tenant
 */
export const getQueryHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenantId } = req.params;
    const { 
      page = '1', 
      limit = '50', 
      successOnly,
      fromDate,
      toDate 
    } = req.query;

    if (!tenantId) {
      res.status(400).json(
        ApiResponse.error('Tenant ID is required', 'TENANT_ID_REQUIRED')
      );
      return;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const options: any = {
      limit: limitNum,
      offset
    };

    if (successOnly !== undefined) {
      options.successOnly = successOnly === 'true';
    }

    if (fromDate) {
      options.fromDate = new Date(fromDate as string);
    }

    if (toDate) {
      options.toDate = new Date(toDate as string);
    }

    const result = await DatabaseService.getQueryHistory(tenantId, options);
    
    res.status(200).json(
      ApiResponse.paginated(
        result.history,
        pageNum,
        limitNum,
        result.total,
        'Query history retrieved successfully'
      )
    );

  } catch (error) {
    logger.error('Failed to get query history:', error);
    res.status(500).json(
      ApiResponse.error('Internal server error', 'INTERNAL_SERVER_ERROR')
    );
  }
};

/**
 * Clear old query history
 */
export const clearOldQueryHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { daysToKeep = '30' } = req.query;
    const days = parseInt(daysToKeep as string);

    if (isNaN(days) || days < 1) {
      res.status(400).json(
        ApiResponse.error('Days to keep must be a positive integer', 'INVALID_DAYS_PARAMETER')
      );
      return;
    }

    const deletedCount = await DatabaseService.clearOldQueryHistory(days);
    
    res.status(200).json(
      ApiResponse.success({
        deletedCount,
        daysToKeep: days
      }, `Cleared ${deletedCount} old query history records`)
    );

  } catch (error) {
    logger.error('Failed to clear old query history:', error);
    res.status(500).json(
      ApiResponse.error('Internal server error', 'INTERNAL_SERVER_ERROR')
    );
  }
};
