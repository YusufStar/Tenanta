# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Migration from monorepo to standalone services architecture
- Self-contained service structure without shared packages
- Individual TypeScript configurations per service
- Local logging, validation, and utility implementations per service
- Docker Compose configuration for all services
- Comprehensive documentation
- Security policies and contributing guidelines

### Changed
- **BREAKING**: Removed monorepo structure and Nx workspace
- **BREAKING**: Removed shared packages (@tenanta/logging, @tenanta/types, @tenanta/shared)
- **BREAKING**: Each service now contains its own utilities, types, and helpers
- Migrated from workspace dependencies to standalone service dependencies
- Updated all import paths to use local modules instead of workspace packages
- Reorganized project structure for better service isolation
- Updated TypeScript configurations to remove path aliases and workspace references

### Fixed
- Import resolution issues after removing workspace structure
- TypeScript configuration conflicts
- Module resolution errors

### Deprecated
- Monorepo structure with Nx
- Shared workspace packages
- Cross-service dependencies

### Removed
- Nx workspace configuration
- packages/ directory and all shared packages
- tsconfig.base.json and workspace-level configurations
- @tenanta/* package imports and dependencies
- Workspace-level package.json scripts

### Security
- N/A

## [1.0.0] - 2025-02-08

### Added
- Initial release of Tenanta platform
- Multi-tenant architecture with PostgreSQL
- Local database system without authentication requirements
- Free platform with no payment requirements
- Role-based access control (RBAC)
- Centralized logging and monitoring
- Admin panel for system management
- Client application for end users
- Comprehensive API documentation
- Security policies and guidelines
- Open source licensing (MIT)
- Free platform architecture
- Web-based PostgreSQL and Redis console interface

### Changed
- N/A

### Fixed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Security
- JWT-based authentication
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Rate limiting
- Audit logging

---

## Version History

- **1.0.0** - Initial release with monorepo structure
- **Unreleased** - Migration to standalone services architecture

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 