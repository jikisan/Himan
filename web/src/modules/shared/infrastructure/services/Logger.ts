import { initLogger, getLogger } from '@himan/shared';

// Initialize the shared logger with Vite's dev mode flag
initLogger({ isDevelopment: import.meta.env.DEV });

// Re-export as Logger for backward compatibility
export const Logger = getLogger();
