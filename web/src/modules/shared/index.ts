// Core module public API
// Export only the public interfaces and components that other modules need

// Domain exports
export * from './domain/entities';
export * from './domain/types';

// Presentation exports
export * from './presentation/components';
export * from './presentation/hooks';
export * from './presentation/utils';

// Infrastructure exports (selective)
export * from './infrastructure/api';
export * from './infrastructure/config';
