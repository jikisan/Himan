/**
 * Logger Service
 *
 * Provides centralized logging with environment-aware configuration.
 * In production, console logs are suppressed and can be sent to error tracking.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class LoggerService {
  private isDevelopment = import.meta.env.DEV;

  /**
   * Log informational messages (only in development)
   */
  info(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, ...args);
    }
    // In production, could send to error tracking service
    this.sendToErrorTracking('warn', message, args);
  }

  /**
   * Log error messages
   */
  error(message: string, error?: unknown, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error, ...args);
    }
    // In production, send to error tracking service
    this.sendToErrorTracking('error', message, { error, args });
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Send logs to error tracking service (placeholder for future implementation)
   * Can integrate with Sentry, LogRocket, or other services
   */
  private sendToErrorTracking(
    _level: LogLevel,
    _message: string,
    _data: unknown
  ): void {
    if (!this.isDevelopment) {
      // TODO: Integrate with error tracking service
      // Example: Sentry.captureMessage(message, { level, extra: data });
    }
  }
}

// Export singleton instance
export const Logger = new LoggerService();
