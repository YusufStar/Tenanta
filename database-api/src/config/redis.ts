import { createClient } from 'redis';
import { logger } from '../shared/logger';

let redisClient: any;
const tenantRedisClients = new Map<string, any>();

export async function setupRedis(): Promise<void> {
  try {
    const redisUrl = process.env.REDIS_URL;
    const redisDb = parseInt(process.env.REDIS_DB || '0');
    const redisPassword = process.env.REDIS_PASSWORD;

    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

    // Main Redis client for system operations
    redisClient = createClient({
      url: redisUrl,
      database: redisDb,
      password: redisPassword || '',
      socket: {
        connectTimeout: 10000,
        reconnectStrategy: retries => {
          if (retries > 10) {
            return new Error('Redis connection retries exceeded');
          }
          return 1000;
        },
      },
    });

    // Error handling
    redisClient.on('error', (err: any) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Redis connection established successfully');
    });

    redisClient.on('ready', () => {
      logger.info(`✅ Redis ready on database ${redisDb}`);
    });

    redisClient.on('end', () => {
      logger.info('Redis connection ended');
    });

    // Connect to Redis
    await redisClient.connect();

    // Test the connection
    await redisClient.ping();

    logger.info(`✅ Redis connected successfully to database ${redisDb}`);
  } catch (error) {
    logger.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
}

export function getRedisClient(): any {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call setupRedis() first.');
  }
  return redisClient;
}

/**
 * Get Redis client for specific tenant
 * Each tenant gets its own Redis database for isolation
 */
export async function getTenantRedisClient(tenantId: string): Promise<any> {
  // Check if we already have a client for this tenant
  if (tenantRedisClients.has(tenantId)) {
    return tenantRedisClients.get(tenantId)!;
  }

  try {
    const redisUrl = process.env.REDIS_URL;
    const redisPassword = process.env.REDIS_PASSWORD;

    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

    // Calculate tenant-specific database number
    // We'll use a simple hash of tenantId to determine database number
    const tenantDbNumber = getTenantDatabaseNumber(tenantId);

    const tenantClient = createClient({
      url: redisUrl,
      database: tenantDbNumber,
      password: redisPassword || '',
      socket: {
        connectTimeout: 10000,
        reconnectStrategy: retries => {
          if (retries > 10) {
            return new Error('Redis connection retries exceeded');
          }
          return 1000;
        },
      },
    });

    // Error handling for tenant client
    tenantClient.on('error', (err: any) => {
      logger.error(`Redis Client Error for tenant ${tenantId}:`, err);
    });

    // Connect to Redis
    await tenantClient.connect();

    // Test the connection
    await tenantClient.ping();

    // Store the client for reuse
    tenantRedisClients.set(tenantId, tenantClient);

    logger.info(`✅ Tenant Redis client connected for tenant ${tenantId} on database ${tenantDbNumber}`);
    return tenantClient;
  } catch (error) {
    logger.error(`❌ Failed to connect to Redis for tenant ${tenantId}:`, error);
    throw error;
  }
}

/**
 * Calculate Redis database number for tenant
 * Uses a simple hash function to distribute tenants across Redis databases
 */
function getTenantDatabaseNumber(tenantId: string): number {
  // Simple hash function to convert tenantId to a number
  let hash = 0;
  for (let i = 0; i < tenantId.length; i++) {
    const char = tenantId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Map to Redis database number (0-15, as Redis typically has 16 databases)
  const dbNumber = Math.abs(hash) % 16;
  
  // Skip database 0 as it's used for system operations
  return dbNumber === 0 ? 1 : dbNumber;
}

/**
 * Close all tenant Redis clients
 */
export async function closeTenantRedisClients(): Promise<void> {
  const closePromises = Array.from(tenantRedisClients.values()).map(client => 
    client.quit().catch((err: any) => logger.error('Error closing tenant Redis client:', err))
  );
  
  await Promise.all(closePromises);
  tenantRedisClients.clear();
  logger.info('All tenant Redis clients closed');
}

export async function closeRedis(): Promise<void> {
  await closeTenantRedisClients();
  
  if (redisClient) {
    await redisClient.quit();
    logger.info('Main Redis connection closed');
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeRedis();
  process.exit(0);
});
