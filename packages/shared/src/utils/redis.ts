// =============================================================================
// Redis Utilities for Tenanta Multi-Tenant Platform
// =============================================================================

import Redis from 'ioredis';

export interface RedisConfig {
  url: string;
  db: number;
  prefix: string;
  password?: string;
  maxRetriesPerRequest?: number;
  retryDelayOnFailover?: number;
  enableReadyCheck?: boolean;
  maxLoadingTimeout?: number;
}

export interface RedisKeyOptions {
  prefix?: string;
  ttl?: number;
  namespace?: string;
}

export class RedisManager {
  private client: Redis;
  private prefix: string;
  private db: number;

  constructor(config: RedisConfig) {
    this.prefix = config.prefix;
    this.db = config.db;

    this.client = new Redis({
      host: new URL(config.url).hostname,
      port: parseInt(new URL(config.url).port),
      password: config.password,
      db: config.db,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      retryDelayOnFailover: config.retryDelayOnFailover || 100,
      enableReadyCheck: config.enableReadyCheck !== false,
      maxLoadingTimeout: config.maxLoadingTimeout || 10000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log(`Redis connected to database ${this.db}`);
    });

    this.client.on('error', (error) => {
      console.error('Redis connection error:', error);
    });

    this.client.on('ready', () => {
      console.log(`Redis ready on database ${this.db}`);
    });
  }

  /**
   * Generate a key with prefix
   */
  private getKey(key: string, options?: RedisKeyOptions): string {
    const prefix = options?.prefix || this.prefix;
    const namespace = options?.namespace ? `${options.namespace}:` : '';
    return `${prefix}${namespace}${key}`;
  }

  /**
   * Set a key with TTL
   */
  async set(key: string, value: string | Buffer | number, options?: RedisKeyOptions): Promise<'OK'> {
    const fullKey = this.getKey(key, options);
    const ttl = options?.ttl;
    
    if (ttl) {
      return this.client.setex(fullKey, ttl, value);
    }
    return this.client.set(fullKey, value);
  }

  /**
   * Get a key value
   */
  async get(key: string, options?: RedisKeyOptions): Promise<string | null> {
    const fullKey = this.getKey(key, options);
    return this.client.get(fullKey);
  }

  /**
   * Delete a key
   */
  async del(key: string, options?: RedisKeyOptions): Promise<number> {
    const fullKey = this.getKey(key, options);
    return this.client.del(fullKey);
  }

  /**
   * Check if key exists
   */
  async exists(key: string, options?: RedisKeyOptions): Promise<number> {
    const fullKey = this.getKey(key, options);
    return this.client.exists(fullKey);
  }

  /**
   * Set key expiration
   */
  async expire(key: string, seconds: number, options?: RedisKeyOptions): Promise<number> {
    const fullKey = this.getKey(key, options);
    return this.client.expire(fullKey, seconds);
  }

  /**
   * Get key TTL
   */
  async ttl(key: string, options?: RedisKeyOptions): Promise<number> {
    const fullKey = this.getKey(key, options);
    return this.client.ttl(fullKey);
  }

  /**
   * Increment a key
   */
  async incr(key: string, options?: RedisKeyOptions): Promise<number> {
    const fullKey = this.getKey(key, options);
    return this.client.incr(fullKey);
  }

  /**
   * Decrement a key
   */
  async decr(key: string, options?: RedisKeyOptions): Promise<number> {
    const fullKey = this.getKey(key, options);
    return this.client.decr(fullKey);
  }

  /**
   * Set hash field
   */
  async hset(key: string, field: string, value: string, options?: RedisKeyOptions): Promise<number> {
    const fullKey = this.getKey(key, options);
    return this.client.hset(fullKey, field, value);
  }

  /**
   * Get hash field
   */
  async hget(key: string, field: string, options?: RedisKeyOptions): Promise<string | null> {
    const fullKey = this.getKey(key, options);
    return this.client.hget(fullKey, field);
  }

  /**
   * Get all hash fields
   */
  async hgetall(key: string, options?: RedisKeyOptions): Promise<Record<string, string>> {
    const fullKey = this.getKey(key, options);
    return this.client.hgetall(fullKey);
  }

  /**
   * Delete hash field
   */
  async hdel(key: string, field: string, options?: RedisKeyOptions): Promise<number> {
    const fullKey = this.getKey(key, options);
    return this.client.hdel(fullKey, field);
  }

  /**
   * Push to list
   */
  async lpush(key: string, value: string, options?: RedisKeyOptions): Promise<number> {
    const fullKey = this.getKey(key, options);
    return this.client.lpush(fullKey, value);
  }

  /**
   * Pop from list
   */
  async rpop(key: string, options?: RedisKeyOptions): Promise<string | null> {
    const fullKey = this.getKey(key, options);
    return this.client.rpop(fullKey);
  }

  /**
   * Add to set
   */
  async sadd(key: string, member: string, options?: RedisKeyOptions): Promise<number> {
    const fullKey = this.getKey(key, options);
    return this.client.sadd(fullKey, member);
  }

  /**
   * Check if member exists in set
   */
  async sismember(key: string, member: string, options?: RedisKeyOptions): Promise<number> {
    const fullKey = this.getKey(key, options);
    return this.client.sismember(fullKey, member);
  }

  /**
   * Get all set members
   */
  async smembers(key: string, options?: RedisKeyOptions): Promise<string[]> {
    const fullKey = this.getKey(key, options);
    return this.client.smembers(fullKey);
  }

  /**
   * Remove from set
   */
  async srem(key: string, member: string, options?: RedisKeyOptions): Promise<number> {
    const fullKey = this.getKey(key, options);
    return this.client.srem(fullKey, member);
  }

  /**
   * Add to sorted set
   */
  async zadd(key: string, score: number, member: string, options?: RedisKeyOptions): Promise<number> {
    const fullKey = this.getKey(key, options);
    return this.client.zadd(fullKey, score, member);
  }

  /**
   * Get sorted set range
   */
  async zrange(key: string, start: number, stop: number, options?: RedisKeyOptions): Promise<string[]> {
    const fullKey = this.getKey(key, options);
    return this.client.zrange(fullKey, start, stop);
  }

  /**
   * Get sorted set score
   */
  async zscore(key: string, member: string, options?: RedisKeyOptions): Promise<number | null> {
    const fullKey = this.getKey(key, options);
    return this.client.zscore(fullKey, member);
  }

  /**
   * Publish to channel
   */
  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  /**
   * Subscribe to channel
   */
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const subscriber = this.client.duplicate();
    await subscriber.subscribe(channel);
    
    subscriber.on('message', (chan, message) => {
      if (chan === channel) {
        callback(message);
      }
    });
  }

  /**
   * Get database info
   */
  async info(): Promise<string> {
    return this.client.info();
  }

  /**
   * Get database size
   */
  async dbsize(): Promise<number> {
    return this.client.dbsize();
  }

  /**
   * Flush current database
   */
  async flushdb(): Promise<'OK'> {
    return this.client.flushdb();
  }

  /**
   * Close connection
   */
  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  /**
   * Get client instance
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Get current database number
   */
  getDatabase(): number {
    return this.db;
  }

  /**
   * Get current prefix
   */
  getPrefix(): string {
    return this.prefix;
  }
}

/**
 * Create Redis manager instance
 */
export function createRedisManager(config: RedisConfig): RedisManager {
  return new RedisManager(config);
}

/**
 * Create Redis manager for specific service
 */
export function createServiceRedisManager(
  serviceName: string,
  baseConfig: Omit<RedisConfig, 'db' | 'prefix'>
): RedisManager {
  const dbMap: Record<string, number> = {
    'database-api': 0,
    'client-api': 1,
    'admin-api': 2,
  };

  const prefixMap: Record<string, string> = {
    'database-api': 'tenanta:database-api:',
    'client-api': 'tenanta:client-api:',
    'admin-api': 'tenanta:admin-api:',
  };

  return new RedisManager({
    ...baseConfig,
    db: dbMap[serviceName] || 0,
    prefix: prefixMap[serviceName] || 'tenanta:unknown:',
  });
}

export default RedisManager; 