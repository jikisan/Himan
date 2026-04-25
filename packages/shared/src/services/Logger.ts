type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LoggerConfig {
  isDevelopment: boolean;
}

class LoggerService {
  private isDevelopment = false;

  init(config: LoggerConfig): void {
    this.isDevelopment = config.isDevelopment;
  }

  info(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.warn(`[WARN] ${message}`, ...args);
    }
    this.sendToErrorTracking('warn', message, args);
  }

  error(message: string, error?: unknown, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.error(`[ERROR] ${message}`, error, ...args);
    }
    this.sendToErrorTracking('error', message, { error, args });
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  private sendToErrorTracking(
    _level: LogLevel,
    _message: string,
    _data: unknown
  ): void {
    if (!this.isDevelopment) {
      // TODO: Integrate with error tracking service
    }
  }
}

const _logger = new LoggerService();

export function initLogger(config: LoggerConfig): LoggerService {
  _logger.init(config);
  return _logger;
}

export function getLogger(): LoggerService {
  return _logger;
}
