# Documentation Index

Welcome to the Ticketing System documentation. Use this guide to navigate all available documentation.

## Quick Navigation

### Getting Started
- **[QUICK_START.md](./QUICK_START.md)** - Start here! Get the project running in 5 minutes
- **[SETUP.md](./SETUP.md)** - Detailed setup and installation instructions
- **[FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)** - Understand the project organization

### Development
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Detailed development workflow and common tasks
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Guidelines for contributing to the project
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System design and architectural decisions

### Reference
- **[API.md](./API.md)** - Complete API endpoint documentation

## Documentation Overview

### 1. QUICK_START.md
**Purpose**: Get the project running immediately

**Contains**:
- One-time setup steps
- Commands to start development servers
- Basic troubleshooting
- Links to detailed documentation

**When to use**: First time setting up the project

### 2. SETUP.md
**Purpose**: Comprehensive installation and configuration guide

**Contains**:
- System requirements and prerequisites
- Detailed installation steps
- Environment variable configuration
- Database setup
- Docker setup alternative
- Common setup issues and solutions

**When to use**: Detailed setup or troubleshooting initial configuration

### 3. DEVELOPMENT.md
**Purpose**: Day-to-day development guide

**Contains**:
- Monorepo workspace commands
- Backend development patterns
- Frontend development patterns
- Database development guide
- API integration examples
- Docker development workflow
- Debugging strategies
- Performance optimization tips

**When to use**: During active development on any part of the project

### 4. CONTRIBUTING.md
**Purpose**: Standards and best practices

**Contains**:
- Code style guidelines
- Architecture principles
- Security practices
- Testing guidelines
- Deployment procedures
- Common tasks walkthrough
- Troubleshooting common issues

**When to use**: When making changes to ensure consistency

### 5. FOLDER_STRUCTURE.md
**Purpose**: Understand code organization

**Contains**:
- Complete folder tree
- Directory descriptions
- Key files and their purposes
- Organizational principles
- Naming conventions

**When to use**: Finding where code should go or understanding where something is

### 6. ARCHITECTURE.md
**Purpose**: System design and technical decisions

**Contains**:
- Technology stack overview
- System components
- Data flow diagrams
- Security model
- Design patterns used
- Scaling considerations

**When to use**: Understanding why things are organized a certain way

### 7. API.md
**Purpose**: Complete API reference

**Contains**:
- All endpoint definitions
- Request/response formats
- Authentication details
- Error codes and meanings
- Example requests and responses

**When to use**: Building frontend features or integrating with external systems

## Common Questions

### I just cloned the project. What do I do?
1. Read [QUICK_START.md](./QUICK_START.md)
2. Run the setup commands
3. Start development with the provided scripts

### I need to add a new feature. Where do I start?
1. Check [DEVELOPMENT.md](./DEVELOPMENT.md) for the relevant section
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) to understand design patterns
3. Follow guidelines in [CONTRIBUTING.md](./CONTRIBUTING.md)

### I'm getting an error. How do I fix it?
1. Check "Troubleshooting" in [SETUP.md](./SETUP.md) or [DEVELOPMENT.md](./DEVELOPMENT.md)
2. Review [CONTRIBUTING.md](./CONTRIBUTING.md) troubleshooting section
3. Check browser console and backend logs

### I need to understand the code organization
1. Start with [FOLDER_STRUCTURE.md](./FOLDER_STRUCTURE.md)
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) for patterns
3. Check [DEVELOPMENT.md](./DEVELOPMENT.md) for code examples

### I need to work with the API
1. Read [API.md](./API.md) for endpoint reference
2. Check [DEVELOPMENT.md](./DEVELOPMENT.md) API integration section
3. Review example requests in [API.md](./API.md)

### I want to deploy the application
1. Check [CONTRIBUTING.md](./CONTRIBUTING.md) deployment section
2. Review [SETUP.md](./SETUP.md) Docker section
3. Ensure all environment variables are configured

## Project Structure at a Glance

```
ticketing-system/
├── backend/                 # Express.js API
│   └── src/
│       ├── routes/          # API endpoints
│       ├── services/        # Business logic
│       ├── db/              # Database
│       └── middleware/      # Auth & other middleware
├── frontend/                # React SPA
│   └── src/
│       ├── pages/           # Page components
│       ├── context/         # Global state
│       ├── services/        # API client
│       └── styles/          # CSS
└── docs/                    # This documentation
    ├── API.md
    ├── ARCHITECTURE.md
    ├── SETUP.md
    ├── QUICK_START.md
    ├── DEVELOPMENT.md
    ├── CONTRIBUTING.md
    ├── FOLDER_STRUCTURE.md
    └── README.md (you are here)
```

## Key Principles

### Backend
- TypeScript for type safety
- Express.js framework
- PostgreSQL database
- JWT authentication
- Business logic in services layer

### Frontend
- React 19 with hooks
- React Router for navigation
- React Context for state
- Axios for HTTP requests
- CSS with BEM naming convention

### Database
- PostgreSQL with proper constraints
- Versioned schema in schema.sql
- Auto-initialization on startup
- Parameterized queries for security

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19 | UI framework |
| | React Router | Routing |
| | Axios | HTTP client |
| | CSS3 | Styling |
| Backend | Express.js | Web framework |
| | TypeScript | Type safety |
| | pg | Database driver |
| | JWT | Authentication |
| Database | PostgreSQL | Data storage |
| | | |
| DevOps | Docker | Containerization |
| | Docker Compose | Local orchestration |
| | pnpm | Package management |

## Support

For questions or issues:
1. Check the relevant documentation section
2. Review [CONTRIBUTING.md](./CONTRIBUTING.md) troubleshooting
3. Check code comments in source files
4. Review related issues or documentation

## Contributing to Documentation

Documentation should be:
- Clear and concise
- Well-organized with headings
- Include examples where helpful
- Link to related documents
- Updated when code changes

## Last Updated
Generated as part of project initialization.

## Navigation

- [← Back to Main README](../README.md)
- [QUICK_START.md →](./QUICK_START.md)
