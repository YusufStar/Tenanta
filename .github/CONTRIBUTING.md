# Contributing to Tenanta

Thank you for your interest in contributing to Tenanta! We welcome contributions from everyone.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Bun or npm
- Docker and Docker Compose
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Tenanta.git
   cd Tenanta
   ```

2. **Environment Setup**
   ```bash
   # Copy environment files
   cp env.example .env
   cp client/env.example client/.env.local
   cp database-api/env.example database-api/.env
   ```

3. **Install Dependencies**
   ```bash
   # Install client dependencies
   cd client && bun install

   # Install API dependencies
   cd ../database-api && bun install
   ```

4. **Start Infrastructure**
   ```bash
   docker-compose up -d
   ```

5. **Start Development Servers**
   ```bash
   # Terminal 1: Start API
   cd database-api && bun dev

   # Terminal 2: Start Client
   cd client && bun dev
   ```

## 📋 How to Contribute

### 🐛 Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/YusufStar/Tenanta/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Node.js version, etc.)
   - Screenshots if applicable

### 💡 Suggesting Features

1. Check [Discussions](https://github.com/YusufStar/Tenanta/discussions) for similar ideas
2. Create a new discussion with:
   - Clear description of the feature
   - Use cases and benefits
   - Possible implementation approach

### 🔧 Code Contributions

#### Workflow
1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards below
   - Add tests for new functionality
   - Update documentation if needed

3. **Test your changes**
   ```bash
   # Run client tests
   cd client && bun test

   # Run API tests
   cd database-api && bun test

   # Run linting
   bun lint
   ```

4. **Commit your changes**
   ```bash
   git commit -m "feat: add awesome new feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Use the PR template
   - Link any relevant issues
   - Provide clear description of changes

## 📐 Coding Standards

### TypeScript
- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` type unless absolutely necessary

### Code Style
- Use Prettier for formatting
- Follow ESLint rules
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

### Commit Messages
Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:
```
feat: add tenant database isolation
fix: resolve SQL editor syntax highlighting
docs: update API documentation
```

### File Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components
│   ├── forms/          # Form components
│   └── layout/         # Layout components
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configurations
├── types/              # TypeScript type definitions
└── utils/              # Helper functions
```

## 🧪 Testing

### Frontend Testing
```bash
cd client
bun test                # Run tests
bun test:watch         # Run tests in watch mode
bun test:coverage      # Run tests with coverage
```

### Backend Testing
```bash
cd database-api
bun test                # Run tests
bun test:watch         # Run tests in watch mode
```

### Testing Guidelines
- Write unit tests for utilities and services
- Write integration tests for API endpoints
- Write component tests for React components
- Aim for >80% code coverage
- Test both happy path and error cases

## 📝 Documentation

### Code Documentation
- Add JSDoc comments for public APIs
- Document complex algorithms and business logic
- Keep README files up to date

### API Documentation
- Document all API endpoints
- Include request/response examples
- Document error responses

## 🎯 Areas Looking for Help

We especially welcome contributions in these areas:

### 🔧 Backend
- Database optimization and indexing
- API performance improvements
- Enhanced security features
- Real-time features with WebSockets

### 🎨 Frontend
- UI/UX improvements
- Accessibility enhancements
- Mobile responsiveness
- Performance optimizations

### 📚 Documentation
- API documentation
- Tutorial content
- Code examples
- Translation to other languages

### 🧪 Testing
- Unit test coverage
- Integration tests
- End-to-end tests
- Performance testing

## 🚫 What We Don't Accept

- Changes that break existing functionality without good reason
- Code that doesn't follow our style guidelines
- Features without tests
- Large changes without prior discussion
- Dependency additions without justification

## 📞 Getting Help

If you need help with development:

- 💬 Join our [Discussions](https://github.com/YusufStar/Tenanta/discussions)
- 📧 Email the maintainers
- 🐛 Open an issue for bugs

## 🏆 Recognition

Contributors will be:
- Added to the contributors list
- Mentioned in release notes for significant contributions
- Given credit in documentation

## 📄 License

By contributing to Tenanta, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Tenanta! 🙏
