# 🏠 Tenanta - Open Source Multi-Tenant Backend Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](docs/code_of_conduct.md)

**Version:** v1.0.0  
**Author:** Yusuf Yıldız  
**Date:** 02.08.2025

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Monorepo Structure](#monorepo-structure)
- [Features](#features)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)

## 🎯 Overview

Tenanta is a modular, scalable, and secure multi-tenant backend platform designed for modern applications. Built with open source principles and organized as a monorepo using Nx, it provides a robust foundation for building database management applications with comprehensive schema management, dynamic database creation, and local deployment capabilities.

### Key Features

- 🔐 **Multi-tenant Architecture** - Isolated data per tenant with schema-based separation
- 🔄 **Dynamic Schema Management** - Create and manage custom database schemas within projects
- 🛡️ **Advanced Security** - Role-based access control (RBAC) for local database system
- 🆓 **Free Platform** - Completely free multi-tenant platform with no payment requirements
- 📊 **Real-time Monitoring** - Centralized logging with AI-powered analytics
- 🚀 **Scalable Design** - Microservices architecture with Docker support
- 📱 **Modern APIs** - RESTful APIs with WebSocket support for real-time features
- 🏗️ **Monorepo Structure** - Efficient development with shared code and tooling
- 🔄 **Redis Multi-Database** - Isolated caching and session management per service

## 🏗️ Architecture

The project follows a modular, scalable architecture with four main layers:

```
Frontend (Client)  ⇄  client-api  ⇄  database-api  ⇄  database
```

### Core Components

- **`database-api`** - Main API layer handling all core operations, schema management, and data processing
- **`client-api`** - Regional and client-specific API operations, proxy or caching tasks
- **`database`** - PostgreSQL database with multi-tenant support and dynamic schema management
- **`client`** - User interface (Next.js/React) with schema creation and management capabilities

## 📁 Monorepo Structure

```
tenanta/
├── apps/                          # Applications
│   ├── database-api/              # Main API service
│   ├── client-api/                # Client-specific API
│   ├── client/                    # User interface (Next.js)
│   └── database/                  # Database schemas and migrations
├── packages/                      # Shared packages
│   ├── shared/                    # Common utilities and middleware
│   ├── database-schema/           # Database schema definitions
│   ├── auth/                      # Authentication utilities
│   ├── logging/                   # Centralized logging
│   └── types/                     # Shared TypeScript types
├── docs/                          # Documentation
├── tests/                         # E2E and integration tests
└── tools/                         # Build and development tools
```

### Shared Packages

- **`@tenanta/shared`** - Common utilities, middleware, and helper functions
- **`@tenanta/database-schema`** - Database schema definitions and migrations
- **`@tenanta/auth`** - Authentication and authorization utilities
- **`@tenanta/logging`** - Centralized logging and monitoring
- **`@tenanta/types`** - Shared TypeScript type definitions

## 🔄 Redis Multi-Database Architecture

Tenanta uses Redis with multi-database support for isolated caching and session management:

### Database Assignments
- **Database 0**: Database API (Main operations)
- **Database 1**: Client API (Caching and user sessions)
- **Database 2-15**: Reserved for future use
- **Database 16-31**: Available for additional services

### Key Prefixing Strategy
Each service uses unique key prefixes to prevent conflicts:
- `tenanta:database-api:` - Database API keys
- `tenanta:client-api:` - Client API keys

### Access Control Lists (ACL)
Redis ACL provides service-specific access control:
- **database-api user**: Access only `tenanta:database-api:*` keys
- **client-api user**: Access only `tenanta:client-api:*` keys
- **monitor user**: Read-only access for monitoring
- **dev user**: Full access for development

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ 
- PostgreSQL 14+
- Redis 7+ (with multi-database support)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yusufstar/tenanta.git
   cd tenanta
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy environment files for each application
   cp apps/database-api/env.example apps/database-api/.env
   cp apps/client-api/env.example apps/client-api/.env
   cp apps/client/env.example apps/client/.env
   cp apps/database/env.example apps/database/.env
   
   # Edit each .env file with your configuration
   ```

4. **Start the services**
   ```bash
   npm run docker:up
   ```

5. **Run database migrations**
   ```bash
   npm run migrate
   ```

6. **Seed initial data**
   ```bash
   npm run seed
   ```

### Development Setup

```bash
# Install all dependencies
npm install

# Start all applications in development mode
npm run dev

# Build all applications
npm run build

# Run tests for all applications
npm run test

# Run linting for all applications
npm run lint
```

### Nx Commands

```bash
# View dependency graph
npm run graph

# Run specific application
nx serve database-api
nx serve client-api
nx serve client

# Build specific application
nx build database-api

# Test specific application
nx test database-api

# Run affected commands (only changed apps)
npm run affected:build
npm run affected:test
npm run affected:lint
```

## 📚 API Documentation

Comprehensive API documentation is available for each service:

- [Database API Documentation](./docs/api/database-api.md)
- [Client API Documentation](./docs/api/client-api.md)
- [Dynamic Schema Management](./docs/dynamic-schema-management.md)

### API Endpoints

#### Database API (Main)
- `GET /api/v1/tenants/:id` - Get tenant information
- `POST /api/v1/users` - Create user

#### Client API
- `GET /api/v1/client/profile` - Get user profile
- `PUT /api/v1/client/settings` - Update user settings



## 🔧 Configuration

### Environment Variables

Each application has its own environment configuration:

#### Root Level (General)
```bash
# Copy root environment file for Docker Compose
cp env.example .env
```

#### Application Level
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

### Environment Structure

- **Root `.env`**: Docker Compose and general configuration
- **`apps/database-api/.env`**: Database API specific configuration
- **`apps/client-api/.env`**: Client API specific configuration  
- **`apps/client/.env`**: Client application configuration
- **`apps/database/.env`**: Database management configuration

Each application only sees its own environment variables, making configuration cleaner and more secure.

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests for specific application
nx test database-api
nx test client-api
nx test admin-api

# Run tests with coverage
nx test database-api --coverage

# Run E2E tests
nx e2e client
```

## 📦 Deployment

### Docker Deployment

```bash
# Build and deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose up -d --scale database-api=3
```

### Manual Deployment

```bash
# Build all applications
npm run build

# Start specific application
nx serve database-api --prod
```

## 🤝 Contributing

We welcome contributions from the community! Please read our [Contributing Guide](docs/contributing.md) for details on our code of conduct and the process for submitting pull requests.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests: `npm run test`
5. Run linting: `npm run lint`
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Monorepo Development

- **Adding new applications**: Use `nx generate @nrwl/js:application`
- **Adding new packages**: Use `nx generate @nrwl/js:library`
- **Shared code**: Place common utilities in `packages/shared`
- **Type definitions**: Use `packages/types` for shared types
- **Database schemas**: Use `packages/database-schema`

### Code Standards

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting
- Use shared packages for common functionality

## 🛡️ Security

We take security seriously. Please read our [Security Policy](docs/security.md) for reporting vulnerabilities.

### Security Features

- JWT-based authentication
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting
- Audit logging
- Redis ACL for service isolation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📖 Documentation

- [Contributing Guide](docs/contributing.md)
- [Code of Conduct](docs/code_of_conduct.md)
- [Security Policy](docs/security.md)
- [Changelog](docs/changelog.md)
- [Project Structure](docs/project_structure.md)

## 🙏 Acknowledgments



- [PostgreSQL](https://postgresql.org) for the database
- [Redis](https://redis.io) for caching and sessions
- [Nx](https://nx.dev) for monorepo tooling

## 📞 Support

- 📧 Email: support@tenanta.com
- 💬 Discord: [Join our community](https://discord.gg/tenanta)
- 📖 Documentation: [docs.tenanta.com](https://docs.tenanta.com)
- 🐛 Issues: [GitHub Issues](https://github.com/yusufstar/tenanta/issues)

---

**Made with ❤️ by the Tenanta community** 