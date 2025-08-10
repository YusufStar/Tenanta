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

    logger.info(`📊 Fetching system logs`, {
      tenantId: tenantId || 'all',
      limit,
      offset,
      level: level || 'all',
      cacheKey: cacheKey.substring(0, 50) + '...',
      operation: 'getSystemLogs'
    });

    try {
      // Try to get from cache first
      logger.info(`🔍 Checking cache for system logs`, {
        tenantId: tenantId || 'all',
        cacheKey: cacheKey.substring(0, 50) + '...'
      });

      const cached = await redis.get(cacheKey);
      if (cached) {
        const cachedLogs = JSON.parse(cached);
        logger.info(`✅ System logs found in cache`, {
          tenantId: tenantId || 'all',
          logsCount: cachedLogs.length,
          source: 'cache'
        });
        return cachedLogs;
      }

      logger.info(`ℹ️ Cache miss, fetching from database`, {
        tenantId: tenantId || 'all'
      });

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
        logger.info(`🎯 Filtering by tenant ID`, {
          tenantId,
          paramIndex: paramIndex - 1
        });
      }

      if (level) {
        query += ` AND level = $${paramIndex}`;
        params.push(level);
        paramIndex++;
        logger.info(`📊 Filtering by log level`, {
          level,
          paramIndex: paramIndex - 1
        });
      }

      query += ` ORDER BY timestamp ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      logger.info(`📝 Executing system logs query`, {
        tenantId: tenantId || 'all',
        finalParamsCount: params.length,
        limit,
        offset
      });

      const result = await pool.query(query, params);
      const logs = result.rows.map(row => ({
        ...row,
        timestamp: row.timestamp.toISOString(),
        metadata: row.metadata || {}
      }));

      logger.info(`✅ System logs fetched from database`, {
        tenantId: tenantId || 'all',
        logsCount: logs.length,
        source: 'database'
      });

      // Cache the result
      logger.info(`💾 Caching system logs result`, {
        tenantId: tenantId || 'all',
        logsCount: logs.length,
        ttl: this.CACHE_TTL
      });

      await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(logs));

      logger.info(`🏁 System logs retrieval completed`, {
        tenantId: tenantId || 'all',
        logsCount: logs.length,
        cached: true
      });

      return logs;
    } catch (error) {
      logger.error(`❌ Failed to get system logs:`, {
        tenantId: tenantId || 'all',
        error: error instanceof Error ? error.message : 'Unknown error',
        limit,
        offset,
        level
      });
      throw error;
    }
  }

   static async createSystemLog(data: CreateLogRequest): Promise<LogEntry> {
    const pool = getDatabasePool();
    
    logger.info(`📝 Creating new system log entry`, {
      tenantId: data.tenantId || 'system',
      level: data.level,
      source: data.source || 'unknown',
      messageLength: data.message.length,
      hasMetadata: !!data.metadata,
      operation: 'createSystemLog'
    });
    
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
      
      logger.info(`✅ System log entry created successfully`, {
        logId: logEntry.id,
        tenantId: data.tenantId || 'system',
        level: data.level,
        source: data.source || 'unknown',
        timestamp: logEntry.timestamp
      });
      
      // Clear cache
      logger.info(`🧹 Clearing log cache after new entry creation`, {
        logId: logEntry.id,
        operation: 'clearLogCache'
      });

      await this.clearLogCache();
      
      logger.info(`🏁 System log creation process completed`, { 
        logId: logEntry.id, 
        level: data.level,
        tenantId: data.tenantId || 'system'
      });

      return logEntry;
    } catch (error) {
      logger.error(`❌ Failed to create system log:`, {
        tenantId: data.tenantId || 'system',
        level: data.level,
        source: data.source || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        messageLength: data.message.length
      });
      throw error;
    }
  }

  private static async clearLogCache(): Promise<void> {
    logger.info(`🧹 Starting log cache cleanup`, {
      operation: 'clearLogCache',
      cachePrefix: this.CACHE_PREFIX
    });

    try {
      const redis = getRedisClient();
      
      logger.info(`🔍 Searching for cache keys to clear`, {
        pattern: `${this.CACHE_PREFIX}*`
      });

      const keys = await redis.keys(`${this.CACHE_PREFIX}*`);
      
      logger.info(`📋 Found ${keys.length} cache keys to delete`, {
        keysCount: keys.length,
        keys: keys.slice(0, 5) // Log first 5 keys for debugging
      });

      if (keys.length > 0) {
        await redis.del(...keys);
        logger.info(`✅ Successfully deleted ${keys.length} cache keys`, {
          deletedKeysCount: keys.length
        });
      } else {
        logger.info(`ℹ️ No cache keys found to delete`, {
          pattern: `${this.CACHE_PREFIX}*`
        });
      }

      logger.info(`🏁 Log cache cleanup completed`, {
        deletedKeys: keys.length
      });

    } catch (error) {
      logger.warn(`⚠️ Failed to clear log cache:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'clearLogCache'
      });
    }
  }
} 