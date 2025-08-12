# Changelog

All notable changes to Tenanta will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial multi-tenant database management platform
- Dynamic tenant creation with isolated PostgreSQL and Redis databases
- Real-time SQL editor with syntax highlighting and auto-completion
- Visual and code-based schema management
- Live tenant dashboard with activity monitoring
- WebSocket-based real-time updates
- Comprehensive logging and audit trails

### Security
- JWT-based authentication system
- Rate limiting for API endpoints
- Input validation and sanitization
- Secure database connection management
- Environment-based configuration

## [1.0.0] - 2025-08-12

### Added
- **Core Platform Features**
  - Multi-tenant architecture with isolated database environments
  - Automatic PostgreSQL database provisioning per tenant
  - Automatic Redis database allocation per tenant
  - RESTful API for tenant and database management
  - WebSocket support for real-time updates

- **Frontend Application**
  - Modern Next.js 15 application with App Router
  - Responsive UI built with Tailwind CSS and shadcn/ui
  - Dark/light mode support
  - Interactive dashboard for tenant management
  - Real-time SQL editor with Monaco Editor
  - Visual schema designer and code editor
  - Tenant-specific navigation and layouts

- **Database Management**
  - Dynamic database creation and isolation
  - Schema management with DBML support
  - SQL query execution and result visualization
  - Database connection pooling
  - Multi-database Redis support with tenant isolation

- **Security & Authentication**
  - JWT-based authentication
  - Rate limiting with express-rate-limit
  - Input validation with express-validator
  - Helmet.js security headers
  - CORS configuration
  - Environment variable based configuration

- **Monitoring & Logging**
  - Winston-based structured logging
  - Daily log rotation
  - Request/response logging middleware
  - Error tracking and handling
  - Real-time activity feeds
  - Database query logging

- **Development Experience**
  - TypeScript throughout the entire stack
  - ESLint and Prettier configuration
  - Jest testing framework setup
  - Docker Compose for local development
  - Environment-based configuration
  - Hot reload for development

- **API Endpoints**
  - `/api/tenants` - Tenant management
  - `/api/tenants/:id/databases` - Database operations
  - `/api/tenants/:id/schemas` - Schema management
  - `/api/tenants/:id/queries` - SQL execution
  - `/api/logs` - Logging and audit trails
  - WebSocket endpoint for real-time updates

### Technical Details
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Express.js, TypeScript, PostgreSQL, Redis
- **Database**: PostgreSQL 14+ with multi-database support
- **Caching**: Redis 7+ with multi-database configuration
- **Authentication**: JWT with bcrypt password hashing
- **Real-time**: WebSocket implementation
- **Containerization**: Docker and Docker Compose
- **Package Management**: Bun for faster dependency management

### Infrastructure
- Docker Compose setup with PostgreSQL and Redis
- Health checks for all services
- Volume persistence for data
- Network isolation for security
- Environment-based configuration
- Development and production configurations

[Unreleased]: https://github.com/YusufStar/Tenanta/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/YusufStar/Tenanta/releases/tag/v1.0.0
