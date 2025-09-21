# MKeep - React and React Native Monorepo

A cross-platform monorepo built with Turborepo, featuring React web and React Native mobile applications with shared code.

## Project Structure

This Turborepo includes the following packages and apps:

### Apps and Packages

- `apps/webApp/`: React web application (Vite + TypeScript)
- `apps/mobileApp/`: React Native mobile application
- `@repo/ui`: Shared UI components and utilities with theming support
- `@repo/eslint-config`: Shared ESLint configurations
- `@repo/typescript-config`: Shared TypeScript configurations

Each package and app is 100% [TypeScript](https://www.typescriptlang.org/).

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

```bash
# Install dependencies
pnpm install

# For iOS development (mobile app)
cd apps/mobileApp && bundle install && cd ios && bundle exec pod install

# Set up Android environment variables (add to ~/.zshrc or ~/.bash_profile)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
```

### Development

```bash
# Start all apps in development mode
pnpm dev

# Start Metro bundler for React Native
pnpm start

# Run mobile app on iOS
pnpm ios

# Run mobile app on Android
pnpm android

# Run web app only
cd apps/webApp && pnpm dev
```

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting
- [Turborepo](https://turbo.build/) for coordinated builds and development

## Code Sharing

The monorepo supports sharing code between web and mobile apps through the `@repo/ui` package:

```typescript
// Both web and mobile can import shared themes
import { colors } from '@repo/ui/theme';
```

## References

- [Setting up a React and React Native monorepo with Turborepo and pnpm](https://medium.com/@alex.derville/setting-up-a-react-and-react-native-monorepo-with-turborepo-and-pnpm-8310c1faf18c) - Complete setup guide
