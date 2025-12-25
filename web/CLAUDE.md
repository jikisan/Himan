# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start dev server**: `npm run dev`
- **Build for production**: `npm run build` (runs TypeScript compiler first, then Vite build)
- **Lint code**: `npm run lint`
- **Preview production build**: `npm run preview`

## Architecture Overview

This project follows **Simplified Clean Architecture** with a modular structure. The architecture enforces separation of concerns through three distinct layers:

### Layer Structure

Each feature module is organized into three layers:

1. **Domain Layer** (`domain/`)
   - Contains pure business logic with zero framework dependencies
   - `entities/`: Business objects and domain models
   - `usecases/`: Business operations, one class per use case
   - `types/`: TypeScript interfaces and type definitions
   - Must not import from infrastructure or presentation layers

2. **Infrastructure Layer** (`infrastructure/`)
   - Handles external communication and data persistence
   - `api/`: HTTP clients and API endpoint definitions
   - `storage/`: LocalStorage/SessionStorage abstractions
   - `mappers/`: Transform DTOs to/from domain entities
   - Can import from domain layer only

3. **Presentation Layer** (`presentation/`)
   - All React-specific code lives here
   - `components/`: React components specific to the module
   - `pages/`: Page-level components (route targets)
   - `hooks/`: Custom React hooks for the module
   - `styles/`: Module-specific styles
   - Can import from both domain and infrastructure layers

### Module Organization

The codebase is organized into feature modules under `src/modules/`:

- **`shared/`** (aliased as `@core`): Core/shared functionality
  - Reusable UI components (`common/`, `layouts/`)
  - Global hooks, utilities, and styles
  - Base API client setup and configuration
  - Shared entities and types

- **`auth/`** (aliased as `@auth`): Authentication module
  - User authentication and session management
  - Login, register, logout use cases
  - Auth-specific components and pages

- **`dashboard/`** (aliased as `@dashboard`): Dashboard module
  - Dashboard data and analytics
  - Charts, widgets, statistics components

### Module Boundaries

- Each module has an `index.ts` at its root that exports its public API
- **Inter-module imports must only use the module's public API** (via index.ts)
- Never import directly from another module's internal structure
- Modules should be independently deletable without breaking other modules

### Dependency Rules

Dependencies flow inward:
```
Presentation → Infrastructure → Domain
     ↓              ↓
   Domain ← Domain (only)
```

Never allow:
- Domain importing from Infrastructure or Presentation
- Infrastructure importing from Presentation
- Direct internal imports between modules (bypass index.ts)

## TypeScript Configuration

### Path Aliases

The following aliases are configured in both `tsconfig.app.json` and `vite.config.ts`:

- `@core/*` → `src/modules/shared/*` (Note: renamed from "core" to "shared")
- `@auth/*` → `src/modules/auth/*`
- `@dashboard/*` → `src/modules/dashboard/*`
- `@app/*` → `src/app/*`
- `@modules/*` → `src/modules/*`

**Important**: The shared module directory is `src/modules/shared/` but is aliased as `@core` for imports.

### Compiler Options

- Uses `bundler` module resolution (Vite-specific)
- Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- `verbatimModuleSyntax: true` - use explicit type imports when needed

## Technology Stack

- **Build Tool**: Vite (using rolldown-vite@7.2.5 - a faster Rolldown-based fork)
- **Framework**: React 19.2 with TypeScript
- **Compiler**: SWC (via @vitejs/plugin-react-swc) for Fast Refresh
- **Linting**: ESLint with TypeScript, React Hooks, and React Refresh rules

Note: React Compiler is not compatible with SWC currently.

## Adding New Modules

When creating a new feature module:

1. Create the module directory under `src/modules/[module-name]/`
2. Follow the three-layer structure: `domain/`, `infrastructure/`, `presentation/`
3. Add subdirectories as needed:
   - Domain: `entities/`, `usecases/`, `types/`
   - Infrastructure: `api/`, `storage/`, `mappers/`
   - Presentation: `components/`, `pages/`, `hooks/`, `styles/`
4. Create an `index.ts` at the module root to export public API
5. Add path alias to both `tsconfig.app.json` (paths) and `vite.config.ts` (resolve.alias)
6. Update this CLAUDE.md with the new module's purpose

## Code Organization Principles

- Each use case is a separate class/function file
- Keep domain layer framework-agnostic (no React imports)
- Use barrel exports (index.ts) to control module boundaries
- Components should be small and focused on single responsibility
- Place shared utilities in `@core/presentation/utils`
- Place shared types in `@core/domain/types`

### Development Workflow

**File Organization:**
- Group related files by feature/domain rather than by file type
- Co-locate tests with components in `__tests__` directories
- Keep API layer separate from React components
- Extract complex UI logic into separate components (Filter, Sort) for maintainability
- Use callback props for parent-child component communication
- Use index files for clean imports

**Code Quality:**
- Run linter before committing (`npm run lint`)
- Write tests for new features
- Use TypeScript strict mode
- Follow existing code patterns and conventions

**Performance Monitoring:**
- Use React DevTools Profiler for performance analysis
- Monitor bundle size with build tools
- Implement code splitting for large features
- Optimize images and assets

**Git Workflow:**
- Use descriptive commit messages following conventional commit format
- Create feature branches for new work
- Write tests before pushing code
- Keep commits focused and atomic
- Commit message descriptions should use proper sentences starting with verbs, not bullet points with "-"
- Each sentence should be on a separate line in the commit description
- Do NOT include Claude Code attribution in commit messages:
  ```
  # Don't include this in commits:
  🤖 Generated with [Claude Code](https://claude.ai/code)
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

**Commit Message Format Example:**
```
feat: add user authentication system

Implement login and registration functionality.
Add password hashing with bcrypt for security.
Create JWT token management for session handling.
Update database schema with user tables.