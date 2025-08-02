# 🤝 Contributing to Tenanta

Thank you for your interest in contributing to Tenanta! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Monorepo Structure](#monorepo-structure)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Release Process](#release-process)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🎯 How Can I Contribute?

### Reporting Bugs

- Use the GitHub issue tracker
- Include detailed steps to reproduce the bug
- Provide environment information (OS, Node.js version, etc.)
- Include error logs and screenshots if applicable

### Suggesting Enhancements

- Use the "Feature Request" issue template
- Describe the enhancement clearly
- Explain why this enhancement would be useful
- Include mockups or examples if applicable

### Code Contributions

- Fork the repository
- Create a feature branch
- Make your changes
- Add tests for new functionality
- Ensure all tests pass
- Submit a pull request

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 14+
- Redis

### Local Development

1. **Fork and clone the repository**
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
   cp env.example .env
   # Edit .env with your local configuration
   ```

4. **Start development services**
   ```bash
   npm run docker:up
   ```

5. **Run database migrations**
   ```bash
   npm run migrate
   ```

6. **Seed development data**
   ```bash
   npm run seed:dev
   ```

7. **Start development servers**
   ```bash
   npm run dev
   ```

## 📁 Monorepo Structure

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
└── tools/                         # Build and development tools
```

### Application Development

- **`apps/database-api`** - Main API with authentication webhook handling and core business logic
- **`apps/client-api`** - Client-specific API with caching and regional optimizations
- **`apps/admin-api`** - Admin panel API with security and audit functions
- **`apps/client`** - User interface built with Next.js including database console
- **`apps/admin`** - Admin panel built with Next.js
- **`apps/database`** - Database schemas, migrations, and seed data

### Shared Packages

- **`packages/shared`** - Common utilities, middleware, and helper functions
- **`packages/database-schema`** - Database schema definitions and migrations
- **`packages/auth`** - Authentication and authorization utilities
- **`packages/logging`** - Centralized logging and monitoring
- **`packages/types`** - Shared TypeScript type definitions
- **`packages/console`** - Database console utilities and components

## 📝 Coding Standards

### General Guidelines

- Follow the existing code style and conventions
- Write clean, readable, and maintainable code
- Add comments for complex logic
- Use meaningful variable and function names
- Keep functions small and focused

### Monorepo Guidelines

- **Use shared packages**: Place common code in `packages/shared`
- **Type safety**: Use `packages/types` for shared type definitions
- **Database schemas**: Use `packages/database-schema` for schema definitions
- **Authentication**: Use `packages/auth` for auth-related utilities
- **Logging**: Use `packages/logging` for centralized logging
- **Database Console**: Use `packages/console` for console-related utilities

### JavaScript/TypeScript Standards

- Use TypeScript for new code
- Follow ESLint configuration
- Use Prettier for code formatting
- Prefer `const` and `let` over `var`
- Use async/await over Promises
- Add JSDoc comments for public APIs

### API Design Standards

- Follow RESTful conventions
- Use consistent naming patterns
- Include proper error handling
- Add input validation
- Document all endpoints

### Database Standards

- Use migrations for schema changes
- Follow naming conventions
- Add indexes for performance
- Use transactions for data integrity
- Include foreign key constraints

## 🧪 Testing Guidelines

### Test Structure

```
tests/
├── unit/              # Unit tests
├── integration/       # Integration tests
├── e2e/              # End-to-end tests
└── fixtures/         # Test data
```

### Writing Tests

- Write tests for all new functionality
- Aim for 80%+ code coverage
- Use descriptive test names
- Mock external dependencies
- Test both success and error cases

### Running Tests

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
nx e2e admin

# Run affected tests (only changed apps)
npm run affected:test
```

## 🔄 Pull Request Process

### Before Submitting

1. **Ensure your code follows standards**
   - Run linter: `npm run lint`
   - Run formatter: `nx format:write`
   - Fix any issues

2. **Test your changes**
   - Run all tests: `npm run test`
   - Test manually in development
   - Ensure no breaking changes

3. **Update documentation**
   - Update README if needed
   - Add API documentation
   - Update changelog

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Affected Applications
- [ ] database-api
- [ ] client-api
- [ ] admin-api
- [ ] client
- [ ] admin
- [ ] shared packages
- [ ] database console

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Shared packages updated if needed
```

### Review Process

1. **Automated checks must pass**
   - CI/CD pipeline
   - Code coverage
   - Security scans

2. **Code review required**
   - At least one maintainer approval
   - Address all review comments
   - Resolve conflicts if any

3. **Merge requirements**
   - All tests pass
   - Documentation updated
   - No security issues

## 🐛 Issue Guidelines

### Bug Reports

Use this template for bug reports:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
A clear description of what you expected to happen.

**Environment:**
- OS: [e.g. macOS, Windows]
- Node.js version: [e.g. 18.0.0]
- Database version: [e.g. PostgreSQL 14]

**Affected Applications**
- [ ] database-api
- [ ] client-api
- [ ] admin-api
- [ ] client
- [ ] admin
- [ ] database console

**Additional context**
Add any other context about the problem here.
```

### Feature Requests

Use this template for feature requests:

```markdown
**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
A clear description of any alternative solutions.

**Target Applications**
- [ ] database-api
- [ ] client-api
- [ ] admin-api
- [ ] client
- [ ] admin
- [ ] shared packages
- [ ] database console

**Additional context**
Add any other context or screenshots about the feature request.
```

## 🚀 Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality
- **PATCH** version for bug fixes

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version bumped
- [ ] Release notes prepared
- [ ] Security review completed

### Creating a Release

1. **Prepare release branch**
   ```bash
   git checkout -b release/v1.2.0
   ```

2. **Update version**
   ```bash
   npm version patch|minor|major
   ```

3. **Update changelog**
   - Add release notes
   - Include breaking changes
   - List new features

4. **Create pull request**
   - Submit for review
   - Address feedback
   - Merge to main

5. **Create GitHub release**
   - Tag the release
   - Add release notes
   - Publish to npm (if applicable)

## 📞 Getting Help

- **Discord**: [Join our community](https://discord.gg/tenanta)
- **Email**: contributors@tenanta.com
- **GitHub Issues**: [Create an issue](https://github.com/yusufstar/tenanta/issues)

## 🙏 Recognition

Contributors will be recognized in:

- Project README
- Release notes
- Contributor hall of fame
- GitHub contributors page

Thank you for contributing to Tenanta! 🎉 