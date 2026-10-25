// ============================================================
// Debug logger with levels — enabled via chrome.storage
// ============================================================

export enum LogLevel {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.NONE]: '',
  [LogLevel.ERROR]: '❌ ERROR',
  [LogLevel.WARN]: '⚠️  WARN',
  [LogLevel.INFO]: 'ℹ️  INFO',
  [LogLevel.DEBUG]: '🔍 DEBUG',
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.NONE]: '',
  [LogLevel.ERROR]: 'color: #ff4444; font-weight: bold',
  [LogLevel.WARN]: 'color: #ffaa00; font-weight: bold',
  [LogLevel.INFO]: 'color: #4488ff',
  [LogLevel.DEBUG]: 'color: #888888',
};

const PREFIX = '[AVS]'; // Amazon Video Saver

export class Logger {
  private level: LogLevel = LogLevel.INFO;

  constructor(private defaultContext: string = '') {
    // Try to load saved log level
    this.loadLevel();
  }

  private async loadLevel(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const result = await chrome.storage.local.get('logLevel');
        if (result.logLevel !== undefined) {
          this.level = result.logLevel as LogLevel;
        }
      }
    } catch {
      // Storage not available (e.g., during tests), use default
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ logLevel: level });
      }
    } catch {
      // Ignore
    }
  }

  getLevel(): LogLevel {
    return this.level;
  }

  error(messageOrContext: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, messageOrContext, ...args);
  }

  warn(messageOrContext: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, messageOrContext, ...args);
  }

  info(messageOrContext: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, messageOrContext, ...args);
  }

  debug(messageOrContext: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, messageOrContext, ...args);
  }

  private log(level: LogLevel, messageOrContext: string, ...args: unknown[]): void {
    if (level > this.level) return;

    const label = LEVEL_LABELS[level];
    const color = LEVEL_COLORS[level];
    const timestamp = new Date().toISOString().slice(11, 23);

    const ctx = this.defaultContext ? ` [${this.defaultContext}]` : '';
    const prefix = `%c${PREFIX} ${label} [${timestamp}]${ctx} ${messageOrContext}`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(prefix, color, ...args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, color, ...args);
        break;
      case LogLevel.INFO:
        console.info(prefix, color, ...args);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, color, ...args);
        break;
    }
  }
}

/** Singleton logger instance */
export const logger = new Logger();
