# Simplified Clean Architecture File Structure Setup

## Project: Vite + React + TypeScript Application

### Objective
Create a Simplified Clean Architecture (Hybrid) folder structure for a Vite + React TypeScript application.

### Directory Structure to Generate
```
project-root/
├── src/
│   ├── modules/
│   │   ├── core/                      # Core/shared module
│   │   │   ├── domain/
│   │   │   │   ├── entities/          # Base entities and interfaces
│   │   │   │   └── types/             # Shared type definitions
│   │   │   ├── infrastructure/
│   │   │   │   ├── api/               # Base API client setup
│   │   │   │   ├── storage/           # LocalStorage/SessionStorage wrappers
│   │   │   │   └── config/            # App configuration
│   │   │   └── presentation/
│   │   │       ├── components/        # Reusable UI components
│   │   │       │   ├── common/        # Button, Input, Card, Modal, etc.
│   │   │       │   └── layouts/       # MainLayout, AuthLayout, DashboardLayout
│   │   │       ├── hooks/             # Global custom hooks
│   │   │       ├── styles/            # Global styles, theme, CSS variables
│   │   │       └── utils/             # UI utility functions
│   │   │
│   │   ├── auth/                      # Authentication module
│   │   │   ├── domain/
│   │   │   │   ├── entities/          # User, Session entities
│   │   │   │   ├── usecases/          # LoginUseCase, RegisterUseCase, LogoutUseCase
│   │   │   │   └── types/             # Auth-specific types
│   │   │   ├── infrastructure/
│   │   │   │   ├── api/               # Auth API endpoints
│   │   │   │   ├── storage/           # Token storage
│   │   │   │   └── mappers/           # DTO to Entity mappers
│   │   │   ├── presentation/
│   │   │   │   ├── components/        # LoginForm, RegisterForm, ProtectedRoute
│   │   │   │   ├── pages/             # LoginPage, RegisterPage, ForgotPasswordPage
│   │   │   │   ├── hooks/             # useAuth, useLogin, useRegister
│   │   │   │   └── styles/            # Auth-specific styles
│   │   │   └── index.ts               # Module public API exports
│   │   │
│   │   ├── dashboard/                 # Dashboard module
│   │   │   ├── domain/
│   │   │   │   ├── entities/          # Dashboard-specific entities
│   │   │   │   ├── usecases/          # GetDashboardDataUseCase, etc.
│   │   │   │   └── types/             # Dashboard types
│   │   │   ├── infrastructure/
│   │   │   │   └── api/               # Dashboard API endpoints
│   │   │   ├── presentation/
│   │   │   │   ├── components/        # Charts, Widgets, StatsCard
│   │   │   │   ├── pages/             # DashboardPage, AnalyticsPage
│   │   │   │   └── hooks/             # useDashboard, useStats
│   │   │   └── index.ts
│   │   │
│   │   └── [additional-modules]/      # Add more feature modules as needed
│   │
│   ├── app/                           # Application setup
│   │   ├── router/                    # Route configuration
│   │   │   ├── routes.tsx             # Route definitions
│   │   │   └── PrivateRoute.tsx       # Route guards
│   │   ├── providers/                 # Context providers
│   │   │   ├── AuthProvider.tsx       # Authentication context
│   │   │   └── ThemeProvider.tsx      # Theme context
│   │   └── store/                     # State management (if using Redux/Zustand)
│   │
│   ├── App.tsx                        # Root component
│   ├── main.tsx                       # Application entry point
│   └── vite-env.d.ts                  # Vite type definitions
│
├── public/                            # Static assets
│   └── assets/
│       ├── images/
│       ├── fonts/
│       └── icons/
│
├── index.html                         # HTML entry point
├── .env.example                       # Environment variables template
├── .gitignore
├── package.json
├── tsconfig.json                      # TypeScript configuration
├── tsconfig.node.json                 # TypeScript config for Vite
├── vite.config.ts                     # Vite configuration
├── .eslintrc.cjs                      # ESLint configuration
└── README.md                          # Project documentation
```

### File Creation Instructions

#### 1. Create all directories first
- Create the nested folder structure as shown above
- Ensure each module follows the same pattern: domain → infrastructure → presentation

#### 2. Add index.ts files for each module
- Each module should have an index.ts at its root
- This file exports only the public API of the module
- Other modules should only import from these index files

#### 3. Add placeholder files in each directory
- Create at least one .ts or .tsx file in each folder to maintain structure in git
- Use `.gitkeep` files for empty directories if needed

### Module Structure Rules

#### Domain Layer
- **entities/**: Pure business objects with no dependencies
- **usecases/**: Business logic and rules, one file per use case
- **types/**: TypeScript interfaces and type definitions

#### Infrastructure Layer
- **api/**: External API communication
- **storage/**: Browser storage implementations
- **mappers/**: Transform external data to domain entities

#### Presentation Layer
- **components/**: React components specific to the module
- **pages/**: Page-level components (route targets)
- **hooks/**: Custom React hooks for the module
- **styles/**: Module-specific styles (CSS modules or styled-components)

### TypeScript Path Aliases to Configure

Add these to tsconfig.json paths:
```
"@core/*": ["src/modules/core/*"]
"@auth/*": ["src/modules/auth/*"]
"@dashboard/*": ["src/modules/dashboard/*"]
"@app/*": ["src/app/*"]
"@modules/*": ["src/modules/*"]
```

### Key Architecture Principles

1. **Dependency Rule**: Dependencies only point inward (Presentation → Infrastructure → Domain)
2. **Module Independence**: Modules should not import from each other's internal structure
3. **Public API**: Each module exposes only necessary exports through index.ts
4. **Use Case Driven**: Each business operation is a separate use case class
5. **Framework Agnostic Domain**: Domain layer has no React/UI dependencies

### Additional Folders to Create Based on Needs

- `src/tests/` - Test files mirroring src structure
- `src/mocks/` - Mock data and handlers
- `src/assets/` - Images, fonts, and other assets
- `src/lib/` - Third-party library configurations
- `src/constants/` - Application constants

### Notes
- Keep the domain layer pure and framework-agnostic
- Infrastructure layer handles all external communications
- Presentation layer contains all React-specific code
- Each module should be deletable without affecting other modules
- Use barrel exports (index.ts) to control module boundaries