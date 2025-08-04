import { Request, Response } from 'express';
import { LogService } from '../services/logService';
import { logger } from '@tenanta/logging';
import { createSuccessResponse, createErrorResponse } from '../utils/response';

export class LogController {
  static async getSystemLogs(req: Request, res: Response) {
    try {
      const { tenantId, limit = 100, offset = 0, level } = req.query;
      
      const logs = await LogService.getSystemLogs(
        tenantId as string,
        parseInt(limit as string),
        parseInt(offset as string),
        level as string
      );

      logger.info('System logs retrieved', { 
        count: logs.length, 
        tenantId: tenantId as string,
        level: level as string 
      });

      const response = createSuccessResponse({
        logs,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          count: logs.length
        }
      });

      return res.json(response);
    } catch (error) {
      logger.error('Failed to get system logs:', error);
      const response = createErrorResponse('Failed to retrieve system logs');
      return res.status(500).json(response);
    }
  }












} 