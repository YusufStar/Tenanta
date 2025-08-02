import { createClient, RedisClientType } from 'redis';
import { logger } from '@tenanta/logging';

let redisClient: RedisClientType;

export async function setupRedis(): Promise<void> {
  try {
    const redisUrl = process.env.REDIS_URL;
    const redisDb = parseInt(process.env.REDIS_DB || '0');
    const redisPassword = process.env.REDIS_PASSWORD;

    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

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
    redisClient.on('error', err => {
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

export function getRedisClient(): RedisClientType {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call setupRedis() first.');
  }
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
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
