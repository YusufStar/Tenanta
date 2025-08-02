import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export interface RedisConfig {
  host: string;
  port: number;
  password: string;
  db: number;
  keyPrefix: string;
  maxMemory: string;
  maxMemoryPolicy: string;
  maxClients: number;
}

export const getRedisConfig = (service: string = 'default'): RedisConfig => {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    // Parse REDIS_URL format: redis://:password@host:port/db
    const url = new URL(redisUrl);
    const db = parseInt(url.pathname.slice(1)) || 0;
    
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || process.env.REDIS_PASSWORD || '',
      db: db,
      keyPrefix: process.env[`REDIS_PREFIX_${service.toUpperCase()}`] || `tenanta:${service}:`,
      maxMemory: process.env.REDIS_MAX_MEMORY || '1gb',
      maxMemoryPolicy: process.env.REDIS_MAX_MEMORY_POLICY || 'allkeys-lru',
      maxClients: parseInt(process.env.REDIS_MAX_CLIENTS || '1000')
    };
  }

  // Fallback to individual environment variables
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env[`REDIS_DB_${service.toUpperCase()}`] || process.env.REDIS_DB || '0'),
    keyPrefix: process.env[`REDIS_PREFIX_${service.toUpperCase()}`] || `tenanta:${service}:`,
    maxMemory: process.env.REDIS_MAX_MEMORY || '1gb',
    maxMemoryPolicy: process.env.REDIS_MAX_MEMORY_POLICY || 'allkeys-lru',
    maxClients: parseInt(process.env.REDIS_MAX_CLIENTS || '1000')
  };
};

export const createRedisClient = (service: string = 'default'): Redis => {
  const config = getRedisConfig(service);
  
  return new Redis({
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    keyPrefix: config.keyPrefix,
    lazyConnect: true,
    keepAlive: 30000,
    connectTimeout: 10000
  });
};

// Service-specific Redis clients
export const databaseApiRedis = createRedisClient('database-api');

// Test Redis connection
export const testRedisConnection = async (client: Redis): Promise<boolean> => {
  try {
    await client.ping();
    console.log('✅ Redis connection successful');
    return true;
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    return false;
  }
};

// Redis utility functions
export const redisUtils = {
  async set(key: string, value: string, ttl?: number): Promise<void> {
    const client = databaseApiRedis;
    if (ttl) {
      await client.setex(key, ttl, value);
    } else {
      await client.set(key, value);
    }
  },

  async get(key: string): Promise<string | null> {
    const client = databaseApiRedis;
    return await client.get(key);
  },

  async del(key: string): Promise<number> {
    const client = databaseApiRedis;
    return await client.del(key);
  },

  async exists(key: string): Promise<number> {
    const client = databaseApiRedis;
    return await client.exists(key);
  },

  async expire(key: string, seconds: number): Promise<number> {
    const client = databaseApiRedis;
    return await client.expire(key, seconds);
  },

  async ttl(key: string): Promise<number> {
    const client = databaseApiRedis;
    return await client.ttl(key);
  }
}; 