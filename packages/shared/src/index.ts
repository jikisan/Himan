// @himan/shared - shared domain and infrastructure code
// This package exports framework-agnostic code reusable across web and mobile.

export { initSupabase, getSupabase } from './config/index.js';
export { initLogger, getLogger } from './services/index.js';

// Module re-exports
export * as subscriptions from './modules/subscriptions/index.js';
