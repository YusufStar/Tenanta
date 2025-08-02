# 🔄 Redis Configuration Guide

This document provides detailed information about Redis configuration in the Tenanta platform.

## 📋 Table of Contents

- [Overview](#overview)
- [Multi-Database Architecture](#multi-database-architecture)
- [Key Prefixing Strategy](#key-prefixing-strategy)
- [Access Control Lists (ACL)](#access-control-lists-acl)
- [Configuration Files](#configuration-files)
- [Environment Variables](#environment-variables)
- [Usage Examples](#usage-examples)
- [Monitoring and Maintenance](#monitoring-and-maintenance)

## 🎯 Overview

Tenanta uses Redis with multi-database support for isolated caching and session management. Each service has its own database and key prefix to ensure data isolation and prevent conflicts.

### Key Features

- **Multi-Database Support**: 32 databases (0-31) for service isolation
- **Key Prefixing**: Unique prefixes for each service
- **Access Control Lists**: Service-specific access control
- **Persistent Storage**: AOF (Append Only File) for data persistence
- **Memory Management**: LRU eviction policy with 2GB limit

## 🏗️ Multi-Database Architecture

### Database Assignments

| Database | Service | Purpose | Key Prefix |
|----------|---------|---------|------------|
| 0 | Database API | Main operations | `tenanta:database-api:` |
| 1 | Client API | Caching and user sessions | `tenanta:client-api:` |
| 2-15 | Reserved | Future services | TBD |
| 16-31 | Available | Additional services | TBD |

### Benefits

- **Isolation**: Each service operates in its own database
- **Performance**: No key conflicts between services
- **Security**: Service-specific access control
- **Scalability**: Easy to add new services

## 🔑 Key Prefixing Strategy

Each service uses unique key prefixes to prevent conflicts:

```typescript
// Database API keys
tenanta:database-api:user:123
tenanta:database-api:session:abc
tenanta:database-api:webhook:system

// Client API keys
tenanta:client-api:cache:profile:123
tenanta:client-api:session:user:456
tenanta:client-api:rate:limit:ip:192.168.1.1

// Admin API keys
tenanta:admin-api:audit:login:789
tenanta:admin-api:analytics:daily:2024-01-01
tenanta:admin-api:system:health
```

### Key Naming Conventions

- Use lowercase with hyphens for readability
- Include service name in prefix
- Use descriptive key names
- Include relevant IDs or identifiers

## 🛡️ Access Control Lists (ACL)

Redis ACL provides service-specific access control:

### User Definitions

```acl
# Database API User
user database-api on >database_api_password ~tenanta:database-api:* &* +@all -@dangerous

# Client API User
user client-api on >client_api_password ~tenanta:client-api:* &* +@all -@dangerous



# Monitoring User (read-only)
user monitor on >monitor_password ~* &* +@read +@slow +@latency

# Development User (full access)
user dev on >dev_password ~* &* +@all
```

### ACL Rules Explanation

- **Patterns**: `~tenanta:database-api:*` - Only access specific prefix keys
- **Commands**: `+@all -@dangerous` - All commands except dangerous ones
- **Channels**: `&*` - All channels for pub/sub
- **Read-only**: `+@read +@slow +@latency` - Only read and monitoring commands

## 📁 Configuration Files

### Redis Configuration (`redis/redis.conf`)

```conf
# Network
bind 0.0.0.0
port 6379
timeout 0
tcp-keepalive 300

# Security
requirepass tenanta_redis_password
maxclients 10000

# Memory Management
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec

# Multi-Database
databases 32
```

### ACL Configuration (`redis/users.acl`)

```acl
# Default user (disabled)
user default off

# Service-specific users
user database-api on >database_api_password ~tenanta:database-api:* &* +@all -@dangerous
user client-api on >client_api_password ~tenanta:client-api:* &* +@all -@dangerous
user admin-api on >admin_api_password ~tenanta:admin-api:* &* +@all -@dangerous

# Monitoring user
user monitor on >monitor_password ~* &* +@read +@slow +@latency

# Development user
user dev on >dev_password ~* &* +@all
```

## 🔧 Environment Variables

### Redis Configuration

```env
# Redis Connection
REDIS_URL=redis://:tenanta_redis_password@localhost:6379
REDIS_PASSWORD=tenanta_redis_password
REDIS_DB=0

# Database Assignments
REDIS_DB_DATABASE_API=0
REDIS_DB_CLIENT_API=1
REDIS_DB_ADMIN_API=2

# Key Prefixes
REDIS_PREFIX_DATABASE_API=tenanta:database-api:
REDIS_PREFIX_CLIENT_API=tenanta:client-api:
REDIS_PREFIX_ADMIN_API=tenanta:admin-api:

# ACL Users
REDIS_USER_DATABASE_API=database-api
REDIS_USER_CLIENT_API=client-api
REDIS_USER_ADMIN_API=admin-api
REDIS_PASSWORD_DATABASE_API=database_api_password
REDIS_PASSWORD_CLIENT_API=client_api_password
REDIS_PASSWORD_ADMIN_API=admin_api_password

# Performance
REDIS_MAX_MEMORY=2gb
REDIS_MAX_MEMORY_POLICY=allkeys-lru
REDIS_MAX_CLIENTS=10000
```

## 💻 Usage Examples

### Using Redis Manager

```typescript
import { createServiceRedisManager } from '@tenanta/shared';

// Create Redis manager for database-api
const redis = createServiceRedisManager('database-api', {
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
});

// Set a key with TTL
await redis.set('user:123', JSON.stringify(userData), { ttl: 3600 });

// Get a key
const userData = await redis.get('user:123');

// Set hash field
await redis.hset('session:abc', 'userId', '123');

// Get hash field
const userId = await redis.hget('session:abc', 'userId');

// Publish to channel
await redis.publish('user:events', JSON.stringify(event));

// Subscribe to channel
await redis.subscribe('user:events', (message) => {
  console.log('Received event:', message);
});
```

### Service-Specific Configuration

```typescript
// Database API
const databaseApiRedis = createServiceRedisManager('database-api', {
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
});

// Client API
const clientApiRedis = createServiceRedisManager('client-api', {
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
});

// Admin API
const adminApiRedis = createServiceRedisManager('admin-api', {
  url: process.env.REDIS_URL,
  password: process.env.REDIS_PASSWORD,
});
```

### Caching Patterns

```typescript
// Cache with TTL
async function getUserWithCache(userId: string) {
  const cacheKey = `user:${userId}`;
  
  // Try to get from cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Get from database
  const user = await getUserFromDatabase(userId);
  
  // Cache for 1 hour
  await redis.set(cacheKey, JSON.stringify(user), { ttl: 3600 });
  
  return user;
}

// Rate limiting
async function checkRateLimit(ip: string, limit: number = 100) {
  const key = `rate:limit:${ip}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 3600); // 1 hour window
  }
  
  return count <= limit;
}
```

## 📊 Monitoring and Maintenance

### Health Checks

```bash
# Check Redis connection
redis-cli -a tenanta_redis_password ping

# Check database info
redis-cli -a tenanta_redis_password info

# Check database size
redis-cli -a tenanta_redis_password dbsize

# Monitor commands
redis-cli -a tenanta_redis_password monitor
```

### Database Management

```bash
# Switch to specific database
redis-cli -a tenanta_redis_password -n 0

# Flush specific database
redis-cli -a tenanta_redis_password -n 0 flushdb

# Get keys with pattern
redis-cli -a tenanta_redis_password -n 0 keys "tenanta:database-api:*"
```

### Performance Monitoring

```bash
# Get memory usage
redis-cli -a tenanta_redis_password info memory

# Get slow log
redis-cli -a tenanta_redis_password slowlog get 10

# Get latency info
redis-cli -a tenanta_redis_password latency latest
```

### Backup and Recovery

```bash
# Create backup
redis-cli -a tenanta_redis_password bgsave

# Check backup status
redis-cli -a tenanta_redis_password lastsave

# Restore from backup
cp dump.rdb /var/lib/redis/
```

## 🔒 Security Best Practices

1. **Use Strong Passwords**: Generate strong passwords for each service
2. **Enable ACL**: Use Access Control Lists for service isolation
3. **Network Security**: Bind to localhost in production
4. **Regular Updates**: Keep Redis updated to latest stable version
5. **Monitoring**: Monitor access logs and performance metrics
6. **Backup**: Regular backups of Redis data
7. **Encryption**: Use SSL/TLS for network communication

## 🚀 Production Deployment

### Docker Compose Configuration

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes --databases 32 --requirepass tenanta_redis_password
  volumes:
    - ./redis/redis.conf:/usr/local/etc/redis/redis.conf
    - ./redis/users.acl:/usr/local/etc/redis/users.acl
  ports:
    - "6379:6379"
  healthcheck:
    test: ["CMD", "redis-cli", "-a", "tenanta_redis_password", "ping"]
```

### Environment Setup

1. **Copy configuration files**:
   ```bash
   cp redis/redis.conf /etc/redis/
   cp redis/users.acl /etc/redis/
   ```

2. **Set permissions**:
   ```bash
   chmod 600 /etc/redis/redis.conf
   chmod 600 /etc/redis/users.acl
   ```

3. **Start Redis**:
   ```bash
   redis-server /etc/redis/redis.conf
   ```

## 📚 Additional Resources

- [Redis Documentation](https://redis.io/documentation)
- [Redis ACL Documentation](https://redis.io/topics/acl)
- [ioredis Documentation](https://github.com/luin/ioredis)
- [Redis Best Practices](https://redis.io/topics/optimization)

---

This configuration provides a robust, scalable, and secure Redis setup for the Tenanta platform. 