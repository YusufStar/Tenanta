import { getDatabasePool } from '../config/database';
import { getRedisClient } from '../config/redis';
import { logger } from '@tenanta/logging';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface CreateLogRequest {
  tenantId?: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  source?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  id: string;
  timestamp: string;
  metricName: string;
  metricValue: number;
  metricUnit?: string;
  thresholdValue?: number;
  status: 'healthy' | 'warning' | 'critical';
  metadata?: Record<string, any>;
}

export class LogService {
  private static readonly CACHE_TTL = 60; // 1 minute for logs
  private static readonly CACHE_PREFIX = 'logs:';

  static async createSystemLog(data: CreateLogRequest): Promise<LogEntry> {
    const pool = getDatabasePool();
    
    try {
      const result = await pool.query(
        `INSERT INTO public.system_logs (tenant_id, level, message, source, metadata) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING 
           id,
           timestamp,
           level,
           message,
           source,
           metadata`,
        [data.tenantId, data.level, data.message, data.source, JSON.stringify(data.metadata || {})]
      );

      const logEntry = result.rows[0];
      
      // Clear cache
      await this.clearLogCache();
      
      logger.info('System log created', { logId: logEntry.id, level: data.level });
      return logEntry;
    } catch (error) {
      logger.error('Failed to create system log:', error);
      throw error;
    }
  }

  static async createApplicationLog(tenantId: string, data: CreateLogRequest): Promise<LogEntry> {
    const pool = getDatabasePool();
    
    try {
      const result = await pool.query(
        `INSERT INTO tenant_1.application_logs (level, message, source, metadata) 
         VALUES ($1, $2, $3, $4) 
         RETURNING 
           id,
           timestamp,
           level,
           message,
           source,
           metadata`,
        [data.level, data.message, data.source, JSON.stringify(data.metadata || {})]
      );

      const logEntry = result.rows[0];
      
      // Clear cache
      await this.clearLogCache();
      
      logger.info('Application log created', { logId: logEntry.id, tenantId, level: data.level });
      return logEntry;
    } catch (error) {
      logger.error('Failed to create application log:', error);
      throw error;
    }
  }

  static async getSystemLogs(
    tenantId?: string,
    limit: number = 100,
    offset: number = 0,
    level?: string
  ): Promise<LogEntry[]> {
    const redis = getRedisClient();
    const cacheKey = `${this.CACHE_PREFIX}system:${tenantId || 'all'}:${limit}:${offset}:${level || 'all'}`;

    try {
      // Try to get from cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const pool = getDatabasePool();
      let query = `
        SELECT 
          id,
          timestamp,
          level,
          message,
          source,
          metadata
        FROM public.system_logs
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;

      if (tenantId) {
        query += ` AND tenant_id = $${paramIndex}`;
        params.push(tenantId);
        paramIndex++;
      }

      if (level) {
        query += ` AND level = $${paramIndex}`;
        params.push(level);
        paramIndex++;
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      const logs = result.rows.map(row => ({
        ...row,
        timestamp: row.timestamp.toISOString(),
        metadata: row.metadata || {}
      }));

      // Cache the result
      await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(logs));

      return logs;
    } catch (error) {
      logger.error('Failed to get system logs:', error);
      throw error;
    }
  }

  static async getApplicationLogs(
    limit: number = 100,
    offset: number = 0,
    level?: string
  ): Promise<LogEntry[]> {
    const redis = getRedisClient();
    const cacheKey = `${this.CACHE_PREFIX}application:${limit}:${offset}:${level || 'all'}`;

    try {
      // Try to get from cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const pool = getDatabasePool();
      let query = `
        SELECT 
          id,
          timestamp,
          level,
          message,
          source,
          metadata
        FROM tenant_1.application_logs
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;

      if (level) {
        query += ` AND level = $${paramIndex}`;
        params.push(level);
        paramIndex++;
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      const logs = result.rows.map(row => ({
        ...row,
        timestamp: row.timestamp.toISOString(),
        metadata: row.metadata || {}
      }));

      // Cache the result
      await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(logs));

      return logs;
    } catch (error) {
      logger.error('Failed to get application logs:', error);
      throw error;
    }
  }

  static async getPerformanceMetrics(
    tenantId?: string,
    limit: number = 60,
    metricName?: string
  ): Promise<PerformanceMetric[]> {
    const pool = getDatabasePool();
    
    try {
      let query = `
        SELECT 
          id,
          timestamp,
          metric_name as "metricName",
          metric_value as "metricValue",
          metric_unit as "metricUnit",
          threshold_value as "thresholdValue",
          status,
          metadata
        FROM public.performance_metrics
        WHERE 1=1
      `;
      
      const params: any[] = [];
      let paramIndex = 1;

      if (tenantId) {
        query += ` AND tenant_id = $${paramIndex}`;
        params.push(tenantId);
        paramIndex++;
      }

      if (metricName) {
        query += ` AND metric_name = $${paramIndex}`;
        params.push(metricName);
        paramIndex++;
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await pool.query(query, params);
      return result.rows.map(row => ({
        ...row,
        timestamp: row.timestamp.toISOString(),
        metadata: row.metadata || {}
      }));
    } catch (error) {
      logger.error('Failed to get performance metrics:', error);
      throw error;
    }
  }

  static async createPerformanceMetric(data: {
    tenantId?: string;
    metricName: string;
    metricValue: number;
    metricUnit?: string;
    thresholdValue?: number;
    status: 'healthy' | 'warning' | 'critical';
    metadata?: Record<string, any>;
  }): Promise<PerformanceMetric> {
    const pool = getDatabasePool();
    
    try {
      const result = await pool.query(
        `INSERT INTO public.performance_metrics (tenant_id, metric_name, metric_value, metric_unit, threshold_value, status, metadata) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING 
           id,
           timestamp,
           metric_name as "metricName",
           metric_value as "metricValue",
           metric_unit as "metricUnit",
           threshold_value as "thresholdValue",
           status,
           metadata`,
        [
          data.tenantId,
          data.metricName,
          data.metricValue,
          data.metricUnit,
          data.thresholdValue,
          data.status,
          JSON.stringify(data.metadata || {})
        ]
      );

      const metric = result.rows[0];
      return {
        ...metric,
        timestamp: metric.timestamp.toISOString(),
        metadata: metric.metadata || {}
      };
    } catch (error) {
      logger.error('Failed to create performance metric:', error);
      throw error;
    }
  }

  static async getLogStats(tenantId?: string): Promise<{
    total: number;
    byLevel: Record<string, number>;
    recentActivity: number;
  }> {
    const pool = getDatabasePool();
    
    try {
      let whereClause = '';
      const params: any[] = [];
      
      if (tenantId) {
        whereClause = 'WHERE tenant_id = $1';
        params.push(tenantId);
      }

      // Get total count
      const totalResult = await pool.query(
        `SELECT COUNT(*) FROM public.system_logs ${whereClause}`,
        params
      );
      const total = parseInt(totalResult.rows[0].count);

      // Get count by level
      const levelResult = await pool.query(
        `SELECT level, COUNT(*) as count 
         FROM public.system_logs ${whereClause}
         GROUP BY level`,
        params
      );
      
      const byLevel: Record<string, number> = {};
      levelResult.rows.forEach(row => {
        byLevel[row.level] = parseInt(row.count);
      });

      // Get recent activity (last 24 hours)
      const recentParams = [...params];
      const recentWhereClause = whereClause 
        ? `${whereClause} AND timestamp >= NOW() - INTERVAL '24 hours'`
        : 'WHERE timestamp >= NOW() - INTERVAL \'24 hours\'';
      
      const recentResult = await pool.query(
        `SELECT COUNT(*) FROM public.system_logs ${recentWhereClause}`,
        recentParams
      );
      const recentActivity = parseInt(recentResult.rows[0].count);

      return {
        total,
        byLevel,
        recentActivity
      };
    } catch (error) {
      logger.error('Failed to get log stats:', error);
      throw error;
    }
  }

  private static async clearLogCache(): Promise<void> {
    try {
      const redis = getRedisClient();
      const keys = await redis.keys(`${this.CACHE_PREFIX}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.warn('Failed to clear log cache:', error);
    }
  }
} 