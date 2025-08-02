# 🔧 Environment Configuration

Bu doküman Tenanta projesinin environment variable yapısını açıklar.

## 📁 Environment File Structure

```
tenanta/
├── .env                    # Root level (Docker Compose)
├── apps/
│   ├── database-api/
│   │   ├── env.example    # Database API template
│   │   └── .env          # Database API config
│   ├── client-api/
│   │   ├── env.example    # Client API template
│   │   └── .env          # Client API config
│   ├── client/
│   │   ├── env.example    # Client app template
│   │   └── .env          # Client app config
│   └── database/
│       ├── env.example    # Database app template
│       └── .env          # Database app config
```

## 🚀 Quick Setup

### 1. Root Environment (Docker Compose)
```bash
cp env.example .env
```

### 2. Application Environments
```bash
# Database API
cp apps/database-api/env.example apps/database-api/.env

# Client API
cp apps/client-api/env.example apps/client-api/.env

# Client Application
cp apps/client/env.example apps/client/.env

# Database Application
cp apps/database/env.example apps/database/.env
```

## 📋 Environment File Details

### Root Level (`.env`)
- **Purpose**: Docker Compose ve genel konfigürasyon
- **Contains**: PostgreSQL, Redis, genel ayarlar
- **Used by**: Docker Compose services

### Database API (`apps/database-api/.env`)
- **Purpose**: Ana API servisi konfigürasyonu
- **Port**: 3001
- **Redis DB**: 0
- **Features**: Schema management, core operations

### Client API (`apps/client-api/.env`)
- **Purpose**: Client-specific API konfigürasyonu
- **Port**: 3003
- **Redis DB**: 1
- **Features**: Caching, proxy, rate limiting

### Client Application (`apps/client/.env`)
- **Purpose**: Frontend uygulaması konfigürasyonu
- **Port**: 3000
- **Redis DB**: 2
- **Features**: Schema editor, UI configuration

### Database Application (`apps/database/.env`)
- **Purpose**: Database yönetimi konfigürasyonu
- **Redis DB**: 3
- **Features**: Schema validation, migrations

## 🔄 Redis Database Assignments

| Service | Database | Prefix | Purpose |
|---------|----------|--------|---------|
| Database API | 0 | `tenanta:database-api:` | Core operations |
| Client API | 1 | `tenanta:client-api:` | Caching & sessions |
| Client App | 2 | `tenanta:client:` | Client-side cache |
| Database App | 3 | `tenanta:database:` | Schema metadata |

## 🔒 Security Benefits

### Isolation
- Her uygulama sadece kendi environment variable'larını görür
- Hassas bilgiler uygulamalar arasında paylaşılmaz
- Her uygulama kendi Redis database'ini kullanır

### Configuration Management
- Uygulama-specific ayarlar ayrı dosyalarda
- Kolay debugging ve troubleshooting
- Temiz ve organize yapı

## 🛠️ Development Workflow

### Local Development
```bash
# Her uygulama için ayrı environment
cd apps/database-api && npm run dev
cd apps/client-api && npm run dev
cd apps/client && npm run dev
```

### Docker Development
```bash
# Tüm servisler Docker Compose ile
docker-compose up -d
```

### Environment Updates
```bash
# Yeni environment variable eklemek için
# 1. İlgili env.example dosyasını güncelle
# 2. Uygulamanın .env dosyasını güncelle
# 3. Docker Compose'u yeniden başlat
```

## 📝 Environment Variable Categories

### Database Configuration
- `DATABASE_URL`: PostgreSQL connection string
- `DATABASE_POOL_SIZE`: Connection pool size
- `DATABASE_POOL_MIN`: Minimum connections
- `DATABASE_POOL_MAX`: Maximum connections

### Redis Configuration
- `REDIS_URL`: Redis connection string
- `REDIS_DB`: Database number (0-31)
- `REDIS_PREFIX`: Key prefix for isolation
- `REDIS_USER`: ACL username
- `REDIS_PASSWORD`: ACL password

### Server Configuration
- `PORT`: Application port
- `NODE_ENV`: Environment (development/production)
- `API_VERSION`: API version
- `API_PREFIX`: API route prefix

### Security Configuration
- `RATE_LIMIT_WINDOW_MS`: Rate limiting window
- `RATE_LIMIT_MAX_REQUESTS`: Max requests per window
- `CORS_ORIGIN`: Allowed origins

### Schema Management
- `SCHEMA_VALIDATION_ENABLED`: Enable schema validation
- `SCHEMA_VERSIONING_ENABLED`: Enable versioning
- `MAX_SCHEMAS_PER_TENANT`: Schema limit per tenant
- `MAX_TABLES_PER_SCHEMA`: Table limit per schema

## 🔧 Troubleshooting

### Common Issues

#### 1. Environment File Not Found
```bash
# Check if .env files exist
ls -la apps/*/.env

# Create missing files
cp apps/database-api/env.example apps/database-api/.env
```

#### 2. Redis Connection Issues
```bash
# Check Redis ACL users
redis-cli -a tenanta_redis_password ACL LIST

# Test Redis connection
redis-cli -a tenanta_redis_password -n 0 PING
```

#### 3. Database Connection Issues
```bash
# Test database connection
psql postgresql://tenanta_user:tenanta_password@localhost:5432/tenanta
```

### Debug Commands
```bash
# Check environment variables
echo $DATABASE_URL

# Check application logs
docker-compose logs database-api
docker-compose logs client-api
docker-compose logs client
```

## 📚 Related Documentation

- [Project Structure](./PROJECT_STRUCTURE.md) - Proje yapısı
- [Dynamic Schema Management](./dynamic-schema-management.md) - Schema yönetimi
- [Redis Configuration](./redis-configuration.md) - Redis konfigürasyonu
- [Docker Setup](./docker-setup.md) - Docker kurulumu 