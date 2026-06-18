# Monorepo Guide

This project is organized as a **pnpm workspace monorepo** with a separate backend and frontend.

## What is a Monorepo?

A monorepo is a single repository containing multiple sub-projects (called "workspaces"). In this case:

- **Backend** (`./backend/`) - Express.js API server
- **Frontend** (`./frontend/`) - React web application

Benefits:
- Single repository for version control
- Shared development tools and scripts
- Easy cross-project coordination
- Simplified deployment

## Workspace Setup

### Root Level (`/`)

**Purpose**: Manage all workspaces

**Key files**:
- `package.json` - Defines workspaces, shared scripts
- `tsconfig.json` - Root TypeScript configuration
- `pnpm-lock.yaml` - Dependency lock file for all workspaces
- `.gitignore` - Version control rules

### Backend Workspace (`/backend`)

**Purpose**: API server and database layer

**Has own**:
- `package.json` - Backend dependencies
- `tsconfig.json` - Backend TypeScript config
- `.env.example` - Backend environment template
- `pnpm-lock.yaml` - Backend lock file (linked to root)

### Frontend Workspace (`/frontend`)

**Purpose**: Web UI and client

**Has own**:
- `package.json` - Frontend dependencies
- `tsconfig.json` - Frontend TypeScript config
- `.env.example` - Frontend environment template
- `pnpm-lock.yaml` - Frontend lock file (linked to root)

## pnpm Workspace Commands

### Installing Dependencies

```bash
# Install ALL dependencies (backend + frontend)
pnpm install --recursive

# Install in specific workspace
pnpm --filter backend install
pnpm --filter frontend install

# Add package to specific workspace
pnpm --filter backend add express
pnpm --filter frontend add react-router-dom

# Add dev dependency
pnpm --filter backend add -D typescript
pnpm --filter frontend add -D vite
```

### Running Scripts

```bash
# Run script in specific workspace
pnpm --filter backend dev          # Runs "dev" script in backend/package.json
pnpm --filter frontend dev         # Runs "dev" script in frontend/package.json

# Run script in all workspaces
pnpm -r dev                        # Runs "dev" in both backend and frontend

# Short forms
pnpm backend:dev                   # Shortcut from root package.json
pnpm frontend:dev
```

### Building

```bash
# Build all workspaces
pnpm build
pnpm -r build

# Build specific workspace
pnpm --filter backend build
pnpm --filter frontend build
```

## Root Package.json Scripts

The root `package.json` defines convenient shortcuts:

```json
{
  "scripts": {
    "dev": "pnpm -r dev",                    // Run all in dev
    "build": "pnpm -r build",                // Build all
    "backend:dev": "pnpm --filter backend dev",
    "frontend:dev": "pnpm --filter frontend dev",
    "backend:build": "pnpm --filter backend build",
    "frontend:build": "pnpm --filter frontend build"
  }
}
```

## Dependency Management

### How pnpm Workspaces Work

1. **Single lock file** (`pnpm-lock.yaml` at root)
   - All dependencies across all workspaces use one lock file
   - Ensures version consistency
   - Faster installation

2. **Separate node_modules**
   - Each workspace can have its own `node_modules/`
   - Or use root `node_modules/` with symlinks
   - Configured in root `package.json`

3. **Shared vs Private Dependencies**
   - Each workspace lists its own dependencies in its `package.json`
   - Dependencies are NOT shared between workspaces
   - Each workspace can use different versions

### Adding Dependencies

**To Backend**:
```bash
cd backend && pnpm add express
# OR
pnpm --filter backend add express
```

**To Frontend**:
```bash
cd frontend && pnpm add react-router-dom
# OR
pnpm --filter frontend add react-router-dom
```

**To Both** (less common):
```bash
pnpm --filter backend --filter frontend add shared-package
```

## Development Workflow

### Terminal Setup (Recommended)

**Terminal 1 - Backend**:
```bash
pnpm backend:dev
# Runs: Express.js on port 5000
```

**Terminal 2 - Frontend**:
```bash
pnpm frontend:dev
# Runs: React dev server on port 3000
```

**Terminal 3 - Monitoring** (optional):
```bash
# Watch for changes, check logs, etc.
```

### Alternative: Run All at Once

```bash
# Runs both backend and frontend in dev mode
pnpm dev

# All output in single terminal (useful for CI/CD)
```

## Monorepo Best Practices

### 1. Independent Workspaces
- Each workspace is self-contained
- Can be developed, tested, deployed independently
- Each has its own dependencies

### 2. Clear Boundaries
- Backend knows nothing about frontend code
- Frontend communicates via API calls
- No direct imports between workspaces

### 3. Shared Scripts
- Root `package.json` provides common workflows
- Developers don't need to remember workspace-specific commands

### 4. Environment Variables
- Each workspace has its own `.env`
- Backend `.env` separate from frontend `.env`
- Both include in `.gitignore`

### 5. Documentation
- Docs folder at root level
- Explains both backend and frontend
- Single source of truth

## Troubleshooting

### Dependency Installation Issues

```bash
# Clear all node_modules and lock files
rm -rf node_modules backend/node_modules frontend/node_modules pnpm-lock.yaml

# Reinstall cleanly
pnpm install --recursive
```

### Package Not Found in Workspace

```bash
# Check if package is installed in correct workspace
pnpm --filter backend list | grep package-name

# If missing, add it
pnpm --filter backend add package-name
```

### Lock File Conflicts

```bash
# Don't edit pnpm-lock.yaml manually
# Instead, use pnpm commands:
pnpm install              # Updates lock file
pnpm update              # Updates dependencies
```

### Scripts Not Running

```bash
# Check that script exists in target workspace
cat backend/package.json | grep '"dev":'

# Run with verbose output
pnpm --filter backend dev --verbose
```

## Comparison: Monorepo vs Multiple Repos

### Monorepo (This Project)
✅ Single repository
✅ Coordinated versions
✅ Shared build tools
✅ Easier to track related changes
❌ Larger repository
❌ Can be complex

### Multiple Repositories
✅ Independent deployment
✅ Clear separation
✅ Different technologies possible
❌ Coordination overhead
❌ Version mismatches
❌ Duplicate tooling

## Moving Between Workspaces

```bash
# From root to backend
cd backend
pnpm install       # Installs in backend only

# Back to root
cd ..

# Or run commands from root
pnpm --filter backend install
```

## CI/CD Considerations

### Building for Production

```bash
# Build both backend and frontend
pnpm build

# Or individually
pnpm backend:build
pnpm frontend:build
```

### Deployment

1. **Backend** - Deploy Express.js server and database
2. **Frontend** - Deploy React build to static hosting
3. **Docker** - Use docker-compose to orchestrate both

## Advanced Topics

### Using Workspaces in Scripts

```json
{
  "scripts": {
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "format": "pnpm -r format",
    "clean": "pnpm -r clean"
  }
}
```

### Conditional Execution

```bash
# Run only if script exists
pnpm --filter backend --if-present dev

# Run in parallel
pnpm -r --parallel test

# Run sequentially
pnpm -r --sequential build
```

### Workspace Filtering

```bash
# Run in specific workspaces
pnpm --filter backend --filter frontend test

# Using patterns (less common)
pnpm --filter "./!(node_modules)/**" test
```

## Resources

- [pnpm Workspaces Documentation](https://pnpm.io/workspaces)
- [pnpm CLI Reference](https://pnpm.io/cli/install)
- Project documentation in `docs/` folder

## Getting Help

1. Check `docs/README.md` for documentation index
2. Review `docs/DEVELOPMENT.md` for common tasks
3. Check specific workspace README
4. Review pnpm official documentation
