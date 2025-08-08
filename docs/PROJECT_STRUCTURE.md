# 📁 Project Structure

This document provides a detailed overview of the Tenanta project structure.

## 🏗️ Overview

```
tenanta/
├── client/                        # User interface (Next.js)
├── database-api/                  # Main API service
├── database/                      # Database schemas and migrations
├── docs/                          # Documentation
└── docker-compose.yml             # Docker services configuration
```

## 📦 Applications

### `database-api/`
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
│   │   ├── tenantController.ts    # Tenant management controllers
│   │   ├── schemaController.ts    # Schema management controllers
│   │   └── logController.ts       # Log management controllers
│   ├── services/                  # Business logic
│   │   ├── tenantService.ts       # Tenant management services
│   │   ├── schemaService.ts       # Schema management services
│   │   ├── logService.ts          # Log management services
│   │   └── databaseService.ts     # Database initialization services
│   ├── middleware/                # Custom middleware
│   │   ├── errorHandler.ts        # Error handling middleware
│   │   ├── requestLogger.ts       # Request logging middleware
│   │   └── validation.ts          # Request validation middleware
│   ├── routes/                    # API routes
│   │   ├── tenantRoutes.ts        # Tenant management routes
│   │   ├── schemaRoutes.ts        # Schema management routes
│   │   └── logRoutes.ts           # Log management routes
│   ├── config/                    # Configuration
│   │   ├── database.ts            # Database configuration
│   │   └── redis.ts               # Redis configuration
│   ├── shared/                    # Shared utilities
│   │   ├── logger.ts              # Logging utilities
│   │   ├── helpers.ts             # Helper functions
│   │   ├── crypto.ts              # Cryptographic utilities
│   │   └── validation.ts          # Validation utilities
│   ├── types/                     # TypeScript type definitions
│   │   └── index.ts               # All type definitions
│   ├── utils/                     # Utility functions
│   │   ├── response.ts            # Response formatting utilities
│   │   └── validation.ts          # Validation utilities
│   ├── websocket/                 # WebSocket functionality
│   │   └── index.ts               # WebSocket server setup
│   ├── server.ts                  # Express server setup
│   └── index.ts                   # Application entry point
├── logs/                          # Application logs
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
└── env.example                    # Environment variables template
```





### `client/`
**User interface application**

- **Purpose**: Main user-facing application
- **Technologies**: Next.js, React, TypeScript, Tailwind CSS
- **Key Features**:
  - Multi-tenant database management
  - Dynamic schema creation and management
  - Project-based database organization
  - Real-time updates
  - Schema visualization and editing
  - Dashboard and analytics
  - Modern responsive UI

**Structure**:
```
client/
├── src/
│   ├── app/                       # Next.js app directory structure
│   │   ├── (main)/               # Main application layout
│   │   │   ├── layout.tsx         # Main layout component
│   │   │   ├── page.tsx           # Home page
│   │   │   └── tenants/           # Tenant management pages
│   │   ├── (tenant)/             # Tenant-specific routes
│   │   │   └── tenants/           # Tenant dashboard pages
│   │   ├── globals.css            # Global styles
│   │   └── layout.tsx             # Root layout
│   ├── components/                # React components
│   │   ├── dashboard/            # Dashboard components
│   │   │   └── main/             # Main dashboard components
│   │   ├── chart-examples/       # Chart and visualization components
│   │   ├── flow/                 # Flow diagram components
│   │   ├── navs/                 # Navigation components
│   │   ├── ui/                   # Reusable UI components (shadcn/ui)
│   │   └── query-provider.tsx    # React Query provider
│   ├── hooks/                     # Custom React hooks
│   │   ├── use-logs.ts           # Logs management hook
│   │   ├── use-mobile.ts         # Mobile detection hook
│   │   ├── use-schemas.ts        # Schema management hook
│   │   └── use-tenants.ts        # Tenant management hook
│   ├── lib/                       # Utility libraries
│   │   ├── api.ts                # API client utilities
│   │   ├── mock.ts               # Mock data for development
│   │   └── utils.ts              # General utility functions
│   └── styles/                    # Additional styling
├── public/                        # Static assets
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
├── next.config.ts                 # Next.js configuration
├── tailwind.config.js             # Tailwind CSS configuration
├── components.json                # shadcn/ui configuration
└── env.example                    # Environment variables template
```

### `database/`
**Database schemas and migrations**

- **Purpose**: Database initialization and configuration
- **Technologies**: PostgreSQL, Redis, TypeScript
- **Key Features**:
  - Database initialization scripts
  - Redis configuration
  - Base schema setup
  - Multi-tenant database preparation

**Structure**:
```
database/
├── src/
│   └── init/                      # Initialization scripts
│       └── index.ts               # Database initialization
├── redis/                         # Redis configuration
│   ├── redis.conf                 # Redis server configuration
│   └── users.acl                  # Redis ACL definitions
├── init/                          # Docker initialization scripts
├── package.json                   # Dependencies and scripts
├── tsconfig.json                  # TypeScript configuration
└── env.example                    # Environment variables template
```

## 📖 Documentation (`docs/`)

```
docs/
├── PROJECT_STRUCTURE.md          # This file - project structure overview
├── CHANGELOG.md                   # Version history and changes
├── CONTRIBUTING.md                # Contribution guidelines
├── CODE_OF_CONDUCT.md            # Code of conduct
└── SECURITY.md                    # Security policies and procedures
```

## 🔧 Configuration Files

### Root Level
- `docker-compose.yml` - Docker services configuration
- `env.example` - Environment variables template
- `LICENSE` - Project license

### Application Level
Each application has its own:
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `env.example` - Environment variables template

## 🚀 Development Workflow

### Running Applications

```bash
# Run the entire stack with Docker
docker-compose up

# Run database-api in development mode
cd database-api
bun install
bun run dev

# Run client in development mode
cd client
bun install
bun run dev

# Run database initialization
cd database
bun install
bun run init
```

### Building Applications

```bash
# Build database-api
cd database-api
bun run build

# Build client
cd client
bun run build
```

### Testing Applications

```bash
# Test database-api
cd database-api
bun run test

# Test client
cd client
bun run test
```

## 📋 Architecture Overview

### Database API Service
- **Express.js** server with TypeScript
- **Multi-tenant** PostgreSQL schema management
- **Redis** for caching and session management
- **WebSocket** support for real-time updates
- **Winston** logging with daily log rotation
- **JWT** authentication and authorization
- **Rate limiting** and security middleware

### Client Application
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **React Query** for server state management
- **Recharts** for data visualization
- **Monaco Editor** for code editing

### Database Layer
- **PostgreSQL** as primary database
- **Redis** for caching and real-time features
- **Dynamic schema** creation per tenant
- **Multi-tenant** data isolation

## 📋 Best Practices

### Code Organization
- Each service is self-contained with its own dependencies
- Shared utilities are duplicated to avoid coupling
- Clear separation of concerns between services
- Consistent naming conventions across services

### Development
- Use TypeScript for all new code
- Follow established code style and linting rules
- Write tests for critical functionality
- Use environment variables for configuration

### Deployment
- Use Docker for consistent environments
- Each service has its own container
- Use docker-compose for local development
- Monitor applications and logs in production

---

This structure provides a scalable and maintainable foundation for the Tenanta platform without the complexity of a monorepo setup. 