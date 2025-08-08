import { getDatabasePool } from '../config/database';
import { getRedisClient } from '../config/redis';
import { logger } from '../shared/logger';

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


export class LogService {
  private static readonly CACHE_TTL = 60; // 1 minute for logs
  private static readonly CACHE_PREFIX = 'logs:';

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

      query += ` ORDER BY timestamp ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
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