import { Request, Response } from 'express';
import { LogService, CreateLogRequest } from '../services/logService';
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

  static async getApplicationLogs(req: Request, res: Response) {
    try {
      const { limit = 100, offset = 0, level } = req.query;
      
      const logs = await LogService.getApplicationLogs(
        parseInt(limit as string),
        parseInt(offset as string),
        level as string
      );

      logger.info('Application logs retrieved', { 
        count: logs.length,
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
      logger.error('Failed to get application logs:', error);
      const response = createErrorResponse('Failed to retrieve application logs');
      return res.status(500).json(response);
    }
  }

  static async createSystemLog(req: Request, res: Response) {
    try {
      const logData: CreateLogRequest = req.body;
      
      // Validate required fields
      if (!logData.level || !logData.message) {
        const response = createErrorResponse('Level and message are required');
        return res.status(400).json(response);
      }

      // Validate level
      const validLevels = ['info', 'warning', 'error', 'success'];
      if (!validLevels.includes(logData.level)) {
        const response = createErrorResponse('Invalid log level');
        return res.status(400).json(response);
      }

      const log = await LogService.createSystemLog(logData);

      logger.info('System log created', { logId: log.id, level: logData.level });

      const response = createSuccessResponse({ log });
      return res.status(201).json(response);
    } catch (error) {
      logger.error('Failed to create system log:', error);
      const response = createErrorResponse('Failed to create system log');
      return res.status(500).json(response);
    }
  }

  static async createApplicationLog(req: Request, res: Response) {
    try {
      const { tenantId } = req.params;
      const logData: CreateLogRequest = req.body;
      
      // Validate required fields
      if (!logData.level || !logData.message) {
        const response = createErrorResponse('Level and message are required');
        return res.status(400).json(response);
      }

      // Validate level
      const validLevels = ['info', 'warning', 'error', 'success'];
      if (!validLevels.includes(logData.level)) {
        const response = createErrorResponse('Invalid log level');
        return res.status(400).json(response);
      }

      const log = await LogService.createApplicationLog(tenantId!, logData);

      logger.info('Application log created', { logId: log.id, tenantId, level: logData.level });

      const response = createSuccessResponse({ log });
      return res.status(201).json(response);
    } catch (error) {
      logger.error('Failed to create application log:', error);
      const response = createErrorResponse('Failed to create application log');
      return res.status(500).json(response);
    }
  }

  static async getPerformanceMetrics(req: Request, res: Response) {
    try {
      const { tenantId, limit = 60, metricName } = req.query;
      
      const metrics = await LogService.getPerformanceMetrics(
        tenantId as string,
        parseInt(limit as string),
        metricName as string
      );

      logger.info('Performance metrics retrieved', { 
        count: metrics.length, 
        tenantId: tenantId as string,
        metricName: metricName as string 
      });

      const response = createSuccessResponse({
        metrics,
        pagination: {
          limit: parseInt(limit as string),
          count: metrics.length
        }
      });

      return res.json(response);
    } catch (error) {
      logger.error('Failed to get performance metrics:', error);
      const response = createErrorResponse('Failed to retrieve performance metrics');
      return res.status(500).json(response);
    }
  }

  static async createPerformanceMetric(req: Request, res: Response) {
    try {
      const metricData = req.body;
      
      // Validate required fields
      if (!metricData.metricName || metricData.metricValue === undefined) {
        const response = createErrorResponse('Metric name and value are required');
        return res.status(400).json(response);
      }

      // Validate status
      const validStatuses = ['healthy', 'warning', 'critical'];
      if (metricData.status && !validStatuses.includes(metricData.status)) {
        const response = createErrorResponse('Invalid status');
        return res.status(400).json(response);
      }

      const metric = await LogService.createPerformanceMetric(metricData);

      logger.info('Performance metric created', { metricId: metric.id, metricName: metricData.metricName });

      const response = createSuccessResponse({ metric });
      return res.status(201).json(response);
    } catch (error) {
      logger.error('Failed to create performance metric:', error);
      const response = createErrorResponse('Failed to create performance metric');
      return res.status(500).json(response);
    }
  }

  static async getLogStats(req: Request, res: Response) {
    try {
      const { tenantId } = req.query;
      
      const stats = await LogService.getLogStats(tenantId as string);

      logger.info('Log stats retrieved', { tenantId: tenantId as string });

      const response = createSuccessResponse({ stats });
      return res.json(response);
    } catch (error) {
      logger.error('Failed to get log stats:', error);
      const response = createErrorResponse('Failed to retrieve log stats');
      return res.status(500).json(response);
    }
  }
} 