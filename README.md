# 🏢 Tenanta

**Modern Multi-Tenant Database Management Platform**

Tenanta is a comprehensive multi-tenant database management platform that allows you to create, manage, and monitor isolated database environments for multiple tenants with ease.

![Tenanta Platform](https://img.shields.io/badge/Platform-Multi--Tenant-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## ✨ Features

### 🎯 Core Features
- **Multi-Tenant Architecture**: Create and manage multiple isolated database environments
- **Dynamic Database Creation**: Automatic PostgreSQL and Redis database provisioning per tenant
- **Real-time SQL Editor**: Execute SQL queries with syntax highlighting and auto-completion
- **Schema Management**: Visual and code-based database schema design and modification
- **Live Dashboard**: Monitor tenant activities, recent SQL executions, and logs
- **Modern UI**: Beautiful, responsive interface built with Next.js and Tailwind CSS

### 🔧 Technical Features
- **TypeScript First**: Full type safety across the entire stack
- **Real-time Updates**: WebSocket-based live updates for dashboards and logs
- **Security**: JWT authentication, rate limiting, and secure database connections
- **Scalable**: Microservices architecture with Docker support
- **Monitoring**: Comprehensive logging and activity tracking

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ and Bun/npm
- Git

### 1. Clone the Repository
```bash
git clone https://github.com/YusufStar/Tenanta.git
cd Tenanta
```

### 2. Environment Setup
Copy the environment files and configure them:
```bash
# Root environment
cp env.example .env

# Client environment
cp client/env.example client/.env.local

# Database API environment
cp database-api/env.example database-api/.env
```

### 3. Start Infrastructure
Start PostgreSQL and Redis services:
```bash
docker-compose up -d
```

### 4. Start the Services

**Database API:**
```bash
cd database-api
bun install
bun dev
```

**Client Application:**
```bash
cd client
bun install
bun dev
```

### 5. Access the Application
- **Client Interface**: http://localhost:3000
- **Database API**: http://localhost:8000

## 🎮 Usage Guide

### Creating Your First Tenant

1. **Navigate to Tenants**: Go to the main dashboard and click on "Tenants"
2. **Create New Tenant**: Click "Create Tenant" and provide tenant details
3. **Automatic Setup**: Tenanta automatically creates isolated PostgreSQL and Redis databases
4. **Access Tenant**: Click on your tenant to access its dedicated environment

### Managing Tenant Databases

**Schema Management:**
- Navigate to `Schemas` in your tenant dashboard
- Use the visual editor or code editor to design your database schema
- Apply changes with real-time validation

**SQL Editor:**
- Access the `SQL Editor` from the tenant sidebar
- Execute queries with syntax highlighting
- View results in a formatted table
- Query history is automatically saved

**Monitoring Dashboard:**
- View recent SQL executions
- Monitor database connections and usage
- Check logs and activity feeds
- Real-time performance metrics

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js       │    │   Express API   │    │   PostgreSQL    │
│   Client        │◄──►│   Server        │◄──►│   Multi-DB      │
│   (Port 3000)   │    │   (Port 8000)   │    │   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │   Multi-DB      │
                       │   (Port 6379)   │
                       └─────────────────┘
```

### Technology Stack

**Frontend:**
- Next.js 15 with App Router
- TypeScript
- Tailwind CSS + shadcn/ui
- React Query for state management
- Monaco Editor for SQL editing

**Backend:**
- Express.js with TypeScript
- PostgreSQL for data storage
- Redis for caching and sessions
- WebSocket for real-time updates
- Winston for logging

**Infrastructure:**
- Docker & Docker Compose
- Multi-database PostgreSQL setup
- Redis with multiple database support

## 📂 Project Structure

```
Tenanta/
├── client/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/          # Utilities and configurations
│   └── package.json
├── database-api/          # Express.js API server
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── services/      # Business logic
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Express middleware
│   │   └── types/         # TypeScript type definitions
│   └── package.json
├── database/              # Database initialization scripts
│   ├── init/             # PostgreSQL init scripts
│   └── redis/            # Redis configuration
├── docs/                  # Project documentation
└── docker-compose.yml    # Infrastructure setup
```

## 🔧 Development

### Running Tests
```bash
# Client tests
cd client && bun test

# API tests
cd database-api && bun test
```

### Building for Production
```bash
# Build client
cd client && bun build

# Build API
cd database-api && bun build
```

### Environment Variables

**Client (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Database API (.env):**
```env
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=tenanta_user
POSTGRES_PASSWORD=your_password
POSTGRES_DB=tenanta_main

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Server
PORT=8000
NODE_ENV=development
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](.github/CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`bun test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database management with [PostgreSQL](https://postgresql.org/)
- Caching with [Redis](https://redis.io/)

## 📞 Support

- 📧 **Email**: yusuf@example.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/YusufStar/Tenanta/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/YusufStar/Tenanta/discussions)

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/YusufStar">Yusuf Yıldız</a></p>
</div>
