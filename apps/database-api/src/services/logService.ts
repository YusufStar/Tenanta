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