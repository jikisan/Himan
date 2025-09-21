# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a **Turborepo monorepo** with cross-platform applications:

- **apps/webApp/**: React web application (Vite + TypeScript)
- **apps/mobileApp/**: React Native mobile application
- **packages/ui/**: Shared UI components and utilities
- **packages/eslint-config/**: Shared ESLint configurations
- **packages/typescript-config/**: Shared TypeScript configurations

## Development Commands

### Root Level (Turborepo)
```bash
# Install dependencies
pnpm install

# Start all apps in development mode
pnpm dev

# Build all apps
pnpm build

# Lint all packages
pnpm lint

# Format code across monorepo
pnpm format
```

### Web App (apps/webApp/)
```bash
# Development server
pnpm dev

# Build for production
pnpm build

# Lint
pnpm lint

# Preview production build
pnpm preview
```

### Mobile App (apps/mobileApp/)
```bash
# Start Metro bundler
pnpm start

# Run on Android
pnpm android

# Run on iOS
pnpm ios

# Run tests
pnpm test

# Lint
pnpm lint
```

## Architecture Notes

- **Package Manager**: Uses pnpm with workspaces defined in `pnpm-workspace.yaml`
- **Build System**: Turborepo for coordinated builds and development across apps
- **Web Stack**: React 19 + Vite + TypeScript + SWC
- **Mobile Stack**: React Native 0.81.4 + TypeScript
- **Shared Code**: UI components and utilities in `@repo/ui` package
- **Code Quality**: ESLint configurations shared across all apps via `@repo/eslint-config`

The project appears to be an early-stage setup (based on original Turborepo Vite starter template) with basic React components in place. The mobile app has standard React Native project structure with Android/iOS platform folders.

## Important Guidelines

### pnpm and React Native Compatibility
React Native doesn't work seamlessly with pnpm out of the box. When adding new React Native dependencies or creating new RN apps:

1. **Always use pnpm**: Never use npm or yarn commands in this monorepo
2. **Clean up npm artifacts**: If React Native CLI creates `package-lock.json` or `node_modules` with npm, remove them and run `pnpm install`
3. **Shared dependencies**: When sharing code between web and mobile apps, add packages to the appropriate `packages/` folder and import them as npm dependencies in both apps

### Code Sharing Strategy
- All shared code must be placed in `packages/` folders
- Import shared packages like any other npm dependency: `import { Component } from '@repo/ui'`
- Add proper dependencies to both web and mobile app `package.json` files when sharing code
- Use the `@repo/` namespace for internal packages