# 📁 Project Structure

This document provides a detailed overview of the Tenanta monorepo structure.

## 🏗️ Overview

```
tenanta/
├── apps/                          # Applications
│   ├── database-api/              # Main API service
│   ├── client-api/                # Client-specific API
│   ├── admin-api/                 # Admin panel API
│   ├── client/                    # User interface (Next.js)
│   ├── admin/                     # Admin panel (Next.js)
│   └── database/                  # Database schemas and migrations
├── packages/                      # Shared packages
│   ├── shared/                    # Common utilities and middleware
│   ├── database-schema/           # Database schema definitions
│   ├── auth/                      # Authentication utilities
│   ├── logging/                   # Centralized logging
│   └── types/                     # Shared TypeScript types
├── docs/                          # Documentation
├── tests/                         # E2E and integration tests
├── tools/                         # Build and development tools
├── nginx/                         # Nginx configuration
└── scripts/                       # Build and deployment scripts
```

## 📦 Applications (`apps/`)

### `apps/database-api/`
**Main API service handling core business logic**

- **Purpose**: Central API for all database operations, schema management, and core business logic
- **Technologies**: Node.js, Express, TypeScript
- **Key Features**:
  - Dynamic schema creation and management
  - Multi-tenant data management
  - Core CRUD operations
  - Schema validation and migration
  - Business logic implementation

**Structure**:
```
database-api/
├── src/
│   ├── controllers/               # Request handlers
│   │   ├── schema/               # Schema management controllers
│   │   ├── project/              # Project management controllers
│   │   └── data/                 # Data CRUD controllers
│   ├── services/                  # Business logic
│   │   ├── schemaService/        # Schema management services
│   │   ├── projectService/       # Project management services
│   │   └── dataService/          # Data manipulation services
│   ├── middleware/                # Custom middleware
│   ├── routes/                    # API routes
│   │   ├── schema/               # Schema management routes
│   │   ├── project/              # Project management routes
│   │   └── data/                 # Data CRUD routes
│   ├── models/                    # Data models
│   ├── utils/                     # Utility functions
│   └── config/                    # Configuration
├── tests/                         # Unit and integration tests
├── package.json                   # Dependencies and scripts
└── Dockerfile                     # Container configuration
```

### `apps/client-api/`
**Client-specific API with caching and optimizations**

- **Purpose**: Regional and client-specific API operations
- **Technologies**: Node.js, Express, TypeScript, Redis
- **Key Features**:
  - Caching layer
  - Rate limiting
  - Regional optimizations
  - Client-specific logic

**Structure**:
```
client-api/
├── src/
│   ├── controllers/               # Request handlers
│   ├── services/                  # Business logic
│   ├── middleware/                # Custom middleware
│   ├── routes/                    # API routes
│   ├── cache/                     # Caching logic
│   └── config/                    # Configuration
├── tests/                         # Unit and integration tests
├── package.json                   # Dependencies and scripts
└── Dockerfile                     # Container configuration
```



### `apps/client/`
**User interface application**

- **Purpose**: Main user-facing application
- **Technologies**: Next.js, React, TypeScript
- **Key Features**:
  - Multi-tenant database management
  - Dynamic schema creation and management
  - Project-based database organization
  - Real-time updates
  - Schema visualization and editing

**Structure**:
```
client/
├── src/
│   ├── components/                # React components
│   │   ├── schema/               # Schema management components
│   │   ├── database/             # Database management components
│   │   └── common/               # Shared components
│   ├── pages/                     # Next.js pages
│   │   ├── projects/             # Project management pages
│   │   ├── schemas/              # Schema management pages
│   │   └── dashboard/            # Dashboard pages
│   ├── hooks/                     # Custom React hooks
│   ├── utils/                     # Utility functions
│   ├── styles/                    # CSS and styling
│   └── config/                    # Configuration
├── public/                        # Static assets
├── tests/                         # Unit and integration tests
├── package.json                   # Dependencies and scripts
└── Dockerfile                     # Container configuration
```



### `apps/database/`
**Database schemas and migrations**

- **Purpose**: Database schema management and dynamic schema creation
- **Technologies**: PostgreSQL, Redis
- **Key Features**:
  - Base schema definitions
  - Dynamic schema creation and management
  - Migration scripts
  - Seed data
  - Multi-tenant setup
  - Schema validation and versioning

**Structure**:
```
database/
├── src/
│   ├── schemas/                   # Database schemas
│   │   ├── base/                 # Base schema definitions
│   │   ├── dynamic/              # Dynamic schema management
│   │   └── validation/           # Schema validation rules
│   ├── migrations/                # Migration scripts
│   ├── seeds/                     # Seed data
│   ├── config/                    # Database configuration
│   └── utils/                     # Schema management utilities
├── redis/                         # Redis configuration
│   ├── redis.conf                 # Redis server configuration
│   └── users.acl                  # Redis ACL definitions
├── init/                          # Initialization scripts
├── tests/                         # Database tests
├── package.json                   # Dependencies and scripts
└── Dockerfile                     # Container configuration
```

## 📚 Shared Packages (`packages/`)

### `packages/shared/`
**Common utilities and middleware**

- **Purpose**: Shared code across all applications
- **Technologies**: TypeScript, Express
- **Key Features**:
  - Middleware (CORS, Helmet, etc.)
  - Utility functions
  - Common types
  - Constants

**Structure**:
```
shared/
├── src/
│   ├── middleware/                # Express middleware
│   ├── utils/                     # Utility functions
│   ├── types/                     # TypeScript types
│   ├── constants/                 # Constants
│   └── index.ts                   # Main export file
├── tests/                         # Unit tests
├── package.json                   # Dependencies and scripts
└── tsconfig.json                  # TypeScript configuration
```

### `packages/database-schema/`
**Database schema definitions**

- **Purpose**: Shared database schema definitions
- **Technologies**: TypeScript, Prisma/TypeORM
- **Key Features**:
  - Entity definitions
  - Schema types
  - Migration helpers

**Structure**:
```
database-schema/
├── src/
│   ├── entities/                  # Database entities
│   ├── migrations/                # Migration helpers
│   ├── types/                     # Schema types
│   └── index.ts                   # Main export file
├── tests/                         # Unit tests
├── package.json                   # Dependencies and scripts
└── tsconfig.json                  # TypeScript configuration
```

### `packages/auth/`
**Authentication utilities**

- **Purpose**: Shared authentication logic
- **Technologies**: TypeScript, JWT
- **Key Features**:
  - JWT utilities
  - Authentication middleware
  - Role-based access control

**Structure**:
```
auth/
├── src/
│   ├── middleware/                # Auth middleware
│   ├── utils/                     # Auth utilities
│   ├── types/                     # Auth types
│   └── index.ts                   # Main export file
├── tests/                         # Unit tests
├── package.json                   # Dependencies and scripts
└── tsconfig.json                  # TypeScript configuration
```

### `packages/logging/`
**Centralized logging**

- **Purpose**: Shared logging functionality
- **Technologies**: TypeScript, Winston
- **Key Features**:
  - Logging utilities
  - Log formatting
  - Log transport

**Structure**:
```
logging/
├── src/
│   ├── transports/                # Log transports
│   ├── formatters/                # Log formatters
│   ├── utils/                     # Logging utilities
│   └── index.ts                   # Main export file
├── tests/                         # Unit tests
├── package.json                   # Dependencies and scripts
└── tsconfig.json                  # TypeScript configuration
```

### `packages/types/`
**Shared TypeScript types**

- **Purpose**: Common type definitions
- **Technologies**: TypeScript
- **Key Features**:
  - API types
  - Database types
  - Common interfaces

**Structure**:
```
types/
├── src/
│   ├── api/                       # API types
│   ├── database/                  # Database types
│   ├── common/                    # Common types
│   └── index.ts                   # Main export file
├── tests/                         # Type tests
├── package.json                   # Dependencies and scripts
└── tsconfig.json                  # TypeScript configuration
```

## 📖 Documentation (`docs/`)

```
docs/
├── api/                           # API documentation
│   ├── database-api.md            # Database API docs
│   ├── client-api.md              # Client API docs
│   └── admin-api.md               # Admin API docs
├── deployment/                    # Deployment guides
├── development/                   # Development guides
└── architecture/                  # Architecture documentation
```

## 🧪 Tests (`tests/`)

```
tests/
├── unit/                          # Unit tests
├── integration/                   # Integration tests
├── e2e/                          # End-to-end tests
└── fixtures/                      # Test data
```

## 🛠️ Tools (`tools/`)

```
tools/
├── scripts/                       # Build scripts
├── configs/                       # Configuration files
└── generators/                    # Code generators
```

## 🔧 Configuration Files

### Root Level
- `package.json` - Workspace configuration
- `nx.json` - Nx workspace configuration
- `tsconfig.base.json` - Base TypeScript configuration
- `.eslintrc.json` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `jest.preset.js` - Jest configuration
- `docker-compose.yml` - Docker services
- `env.example` - Environment variables template

### Application Level
Each application has its own:
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `Dockerfile` - Container configuration
- `README.md` - Application-specific documentation

## 🚀 Development Workflow

### Adding New Applications
```bash
nx generate @nrwl/js:application my-new-app
```

### Adding New Packages
```bash
nx generate @nrwl/js:library my-new-package
```

### Running Applications
```bash
# Run all applications
npm run dev

# Run specific application
nx serve database-api
nx serve client-api
nx serve client
```

### Building Applications
```bash
# Build all applications
npm run build

# Build specific application
nx build database-api
```

### Testing Applications
```bash
# Test all applications
npm run test

# Test specific application
nx test database-api
```

## 📋 Best Practices

### Code Organization
- Keep applications focused on their specific domain
- Use shared packages for common functionality
- Maintain clear separation of concerns
- Follow consistent naming conventions

### Development
- Use TypeScript for all new code
- Write tests for all functionality
- Follow the established code style
- Use shared packages when possible

### Deployment
- Use Docker for consistent environments
- Follow the established CI/CD pipeline
- Test thoroughly before deployment
- Monitor applications in production

---

This structure provides a scalable and maintainable foundation for the Tenanta platform. 