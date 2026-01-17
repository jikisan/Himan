# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start dev server**: `npm run dev`
- **Build for production**: `npm run build` (runs TypeScript compiler first, then Vite build)
- **Lint code**: `npm run lint`
- **Preview production build**: `npm run preview`
- **Run tests**: `npm test` (runs Vitest in watch mode)
- **Run tests once**: `npm run test:run`
- **Run tests with UI**: `npm run test:ui`
- **Run tests with coverage**: `npm run test:coverage`
- **Deploy to Cloudflare Pages**: `npm run deploy` (builds and deploys using Wrangler)
- **Deploy preview**: `npm run deploy:preview` (deploys to preview branch)

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

- **`notes/`** (aliased as `@notes`): Notes application module
  - Mac Notes-like three-panel interface
  - Folder management and organization
  - Rich text editing with Tiptap
  - Auto-save with debouncing
  - Search, tags, and pinned notes
  - Full CRUD operations with Supabase

- **`passwords/`** (aliased as `@passwords`): Password Manager module
  - Secure password storage with client-side encryption
  - Category-based organization
  - Search and favorites functionality
  - Account-based encryption using Web Crypto API (AES-GCM)
  - Three-panel layout similar to notes module

- **`storage/`** (aliased as `@storage`): File Storage module
  - File upload and management functionality
  - Folder-based organization for files
  - File preview and metadata display
  - Support for images, videos, PDFs, and documents
  - File type detection and formatting utilities
  - Integration with Supabase Storage
  - Uses React Query for caching and data synchronization

- **`cards/`** (aliased as `@cards`): Credit Card Manager module
  - Secure credit card information storage
  - Category-based organization
  - Card expiration tracking and warnings
  - Search and favorites functionality
  - Uses React Query for caching and data synchronization

- **`subscriptions/`** (aliased as `@subscriptions`): Subscription Management module
  - User subscription tier management (free, beta, pro, enterprise)
  - Role-based access control (user, admin)
  - Subscription validation and expiration tracking
  - Usage limits enforcement based on tier
  - Subscription state management via context provider

- **`settings/`** (aliased as `@settings`): Settings module
  - User preferences and configuration
  - Theme management (light/dark/system)
  - Application settings

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

- `@/*` → `src/*` (Root source directory)
- `@core/*` → `src/modules/shared/*` (Note: directory is "shared" but aliased as "@core")
- `@auth/*` → `src/modules/auth/*`
- `@dashboard/*` → `src/modules/dashboard/*`
- `@notes/*` → `src/modules/notes/*`
- `@passwords/*` → `src/modules/passwords/*`
- `@cards/*` → `src/modules/cards/*`
- `@storage/*` → `src/modules/storage/*`
- `@subscriptions/*` → `src/modules/subscriptions/*`
- `@settings/*` → `src/modules/settings/*`
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
- **Backend**: Supabase (authentication, database, real-time)
- **Routing**: React Router v7
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **UI Components**:
  - Radix UI primitives (Dialog, Dropdown Menu, Select, Scroll Area)
  - shadcn/ui component patterns
  - Custom components built with Tailwind and class-variance-authority
- **Rich Text Editor**: Tiptap with extensions (Typography, Highlight, Task Lists, Placeholder, Character Count)
- **Form Management**: React Hook Form with Zod validation
- **Validation**: Zod for runtime validation and input constraints
- **Data Fetching & Caching**: TanStack React Query v5 for server state management
- **Icons**: Lucide React

Note: React Compiler is not compatible with SWC currently.

### Data Fetching & Caching Strategy

The application uses multiple caching strategies depending on the module:

**React Query (TanStack Query v5):**
- Used in: Storage, Cards modules
- Configuration in `src/modules/shared/presentation/contexts/QueryProvider.tsx`
- Default settings:
  - `staleTime`: 5 minutes (data considered fresh)
  - `gcTime`: 10 minutes (unused data kept in cache)
  - `refetchOnWindowFocus`: true (ensures data freshness)
  - `refetchOnMount`: false (prevents redundant fetches)
- Query key factories for organized cache management
- Automatic cache invalidation on mutations
- Vite configuration requires `dedupe: ['react', 'react-dom']` for React 19 compatibility

**Hybrid Local/Remote Storage:**
- Used in: Notes module
- Implements offline-first architecture with `HybridNoteRepository`
- Local storage via `LocalNotesStorage` for instant access
- Background sync via `NoteSyncService` for data consistency
- Auto-sync intervals for periodic synchronization
- Conflict resolution and dirty state tracking

**When to Use Each Strategy:**
- **React Query**: Use for modules with standard CRUD operations that need server-side data caching
- **Hybrid Storage**: Use for modules requiring offline support, conflict resolution, or real-time collaboration features

### Testing Setup

- **Test Framework**: Vitest with React Testing Library
- **Test Environment**: happy-dom (faster alternative to jsdom)
- **Test Utilities**: @testing-library/jest-dom for custom matchers
- **Configuration**: `vitest.config.ts` with test setup file at `src/test/setup.ts`
- **Test Organization**: Co-locate tests with components in `__tests__` directories
- All path aliases are configured in vitest.config.ts for proper module resolution in tests

### UI Component System

The project uses a hybrid approach combining Radix UI primitives with custom styling:

- Base components are in `src/components/ui/` (Button, Dialog, Card, Input, etc.)
- All UI components use CSS variables for theming (defined in `src/index.css`)
- Theme switching (light/dark/system) is managed via `ThemeProvider` context
- Tailwind CSS v4 with `@theme inline` configuration maps CSS variables to Tailwind classes
- This allows using `bg-primary`, `text-primary-foreground`, etc. directly with proper theme support

**Styling Approach:**
- Use Tailwind utility classes for theme colors: `bg-primary`, `text-primary-foreground`, `bg-popover`, `text-destructive`, etc.
- The `@theme inline` configuration in `src/index.css` ensures these classes work with CSS variables
- Theme colors automatically adapt to light/dark modes
- Common patterns:
  - Primary background: `bg-primary text-primary-foreground`
  - Popover/Dropdown: `bg-popover text-popover-foreground`
  - Destructive text: `text-destructive`
  - Border highlights: Use Tailwind border utilities with color classes

### Routing Structure

Routes are defined in `src/router/index.tsx` with:
- **Protected routes** require authentication (Dashboard, Notes, Settings, Profile)
- **Public routes** redirect to dashboard if already authenticated (Login, Register)
- Route guards are in `src/router/ProtectedRoute.tsx` and `src/router/PublicRoute.tsx`
- Main app providers wrap routes: `ThemeProvider` → `AuthProvider` → `Router`

### Tiptap Editor Configuration

The notes module uses Tiptap for rich text editing:

- Editor configuration in `src/modules/notes/presentation/hooks/useEditor.ts`
- Custom styles in `src/index.css` under `.tiptap` class
- Requires `@tailwindcss/typography` plugin for prose classes
- Supports: headings (h1-h3), bullet/ordered lists, task lists, highlighting, bold/italic/strikethrough
- Auto-save with 1-second debounce
- Custom placeholder text support
- Character count with limit enforcement (50,000 characters for note content)

**Important**: When adding Tiptap editor, ensure:
1. `@tailwindcss/typography` is installed and configured in `tailwind.config.js`
2. Editor element has both `tiptap` and `prose` classes
3. Custom CSS for `.tiptap h1`, `.tiptap ul`, etc. is defined for proper rendering
4. CharacterCount extension is configured with appropriate limits

### Input Validation & Limits

The application enforces character limits on user inputs using Zod validation:

- **Folder names**: 100 characters max (validated with Zod)
- **Note titles**: 255 characters max (validated with Zod)
- **Note content**: 50,000 characters max (enforced by Tiptap CharacterCount extension)

**Validation Pattern**:
```typescript
import { z } from 'zod';

const schema = z.string()
  .min(1, "Field is required")
  .max(MAX_LENGTH, `Must be ${MAX_LENGTH} characters or less`)
  .trim();

const validation = schema.safeParse(value);
if (!validation.success) {
  // Handle error: validation.error.issues[0].message
}
```

All input components display:
- Real-time character counters
- Visual feedback (red text/border) when limits exceeded
- HTML `maxLength` attribute for browser-level enforcement

### Database & Supabase

- Database migrations are in `supabase/migrations/`
- Supabase client is initialized in the shared module infrastructure layer
- Authentication is managed via Supabase Auth
- Notes module uses Supabase for:
  - Notes table with CRUD operations
  - Folders table with relationship to notes
  - Real-time subscriptions (if enabled)
  - Row-level security for user data isolation

**Repository Pattern**: Each feature creates repository classes in the infrastructure layer that:
- Abstract Supabase client calls
- Handle data transformations between database DTOs and domain entities
- Manage error handling and data validation
- Use `mapToEntity` methods to transform database records to domain types

**Security Considerations**:
- All data must be protected with Row-Level Security (RLS) policies in Supabase
- User-specific data filtering is enforced at the database level
- Client-side filtering alone is insufficient for security

## Adding New Modules

When creating a new feature module:

1. Create the module directory under `src/modules/[module-name]/`
2. Follow the three-layer structure: `domain/`, `infrastructure/`, `presentation/`
3. Add subdirectories as needed:
   - Domain: `entities/`, `usecases/`, `types/`
   - Infrastructure: `api/`, `storage/`, `mappers/`
   - Presentation: `components/`, `pages/`, `hooks/`, `styles/`
4. Create an `index.ts` at the module root to export public API
5. Add path alias to all three config files:
   - `tsconfig.app.json` (paths)
   - `vite.config.ts` (resolve.alias)
   - `vitest.config.ts` (resolve.alias)
6. Update this CLAUDE.md with the new module's purpose

## Code Organization Principles

- Each use case is a separate class/function file
- Keep domain layer framework-agnostic (no React imports)
- Use barrel exports (index.ts) to control module boundaries
- Components should be small and focused on single responsibility
- Place shared utilities in `@core/presentation/utils`
- Place shared types in `@core/domain/types`

### Client-Side Encryption (Password Module)

The passwords module implements client-side encryption for sensitive data:

**Implementation**:
- Located in `src/modules/passwords/infrastructure/services/EncryptionService.ts`
- Uses Web Crypto API with AES-GCM algorithm (256-bit keys)
- Key derivation via PBKDF2 with 100,000 iterations
- Derives encryption key from user ID + application-specific salt
- Each encrypted value has a unique initialization vector (IV)

**Usage**:
```typescript
import { EncryptionService } from '@passwords/infrastructure/services';

// Encrypt
const encrypted = await EncryptionService.encrypt(plaintext, userId);

// Decrypt
const decrypted = await EncryptionService.decrypt(encrypted, userId);
```

**Security Note**: The current implementation uses a shared application salt. For production, consider implementing per-user random salts stored securely.

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
```

## Environment Configuration

Required environment variables (see `.env.example`):

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**:
- Never commit `.env` files to version control
- Environment variables must be prefixed with `VITE_` to be exposed to client-side code
- Validate environment variables at runtime in `src/modules/shared/infrastructure/config/supabase.ts`

## Deployment

The project supports deployment to multiple platforms:

### Cloudflare Pages
- Deploy using: `npm run deploy` (production) or `npm run deploy:preview` (preview)
- Uses Wrangler CLI for deployments
- Build output: `dist` directory

## Common Development Tasks

**Installing New Tiptap Extensions**:
```bash
npm install @tiptap/extension-[name]
```
After installation, restart the dev server to clear Vite's module cache.

**Adding New UI Components**:
- Place reusable UI primitives in `src/components/ui/`
- Use Radix UI primitives as base components
- Apply theme-aware styling with Tailwind CSS variables
- Export from `src/components/ui/index.ts` for clean imports

**Working with Forms**:
- Use React Hook Form for form state management
- Define Zod schemas for validation
- Use `@hookform/resolvers` to integrate Zod with React Hook Form
- Display validation errors inline with appropriate styling