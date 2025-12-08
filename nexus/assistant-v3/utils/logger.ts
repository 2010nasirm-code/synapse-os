/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - LOGGER
 * ============================================================================
 * 
 * Structured logging with levels and redaction.
 * 
 * @module nexus/assistant-v3/utils/logger
 * @version 3.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

// Patterns to redact
const REDACT_PATTERNS = [
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL]' },
  { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CARD]' },
  { pattern: /\bsk-[a-zA-Z0-9]{32,}\b/g, replacement: '[API_KEY]' },
  { pattern: /\bpassword["\s:=]+["']?[^"'\s]+["']?/gi, replacement: 'password=[REDACTED]' },
];

// ============================================================================
// LOG STORE
// ============================================================================

const logStore: LogEntry[] = [];
const MAX_LOGS = 1000;

// ============================================================================
// LOGGER CLASS
// ============================================================================

export class Logger {
  private module: string;

  constructor(module: string) {
    this.module = module;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
  }

  private redact(text: string): string {
    let redacted = text;
    for (const { pattern, replacement } of REDACT_PATTERNS) {
      redacted = redacted.replace(pattern, replacement);
    }
    return redacted;
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      message: this.redact(message),
      data: data ? JSON.parse(this.redact(JSON.stringify(data))) : undefined,
    };

    // Store
    logStore.push(entry);
    if (logStore.length > MAX_LOGS) {
      logStore.shift();
    }

    // Output
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${this.module}]`;
    const output = data 
      ? `${prefix} ${entry.message} ${JSON.stringify(entry.data)}`
      : `${prefix} ${entry.message}`;

    switch (level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }
}

// ============================================================================
// LOG ACCESS
// ============================================================================

/**
 * Get recent logs
 */
export function getLogs(options?: {
  level?: LogLevel;
  module?: string;
  limit?: number;
}): LogEntry[] {
  let logs = [...logStore];

  if (options?.level) {
    const minLevel = LOG_LEVELS[options.level];
    logs = logs.filter(l => LOG_LEVELS[l.level] >= minLevel);
  }

  if (options?.module) {
    logs = logs.filter(l => l.module === options.module);
  }

  if (options?.limit) {
    logs = logs.slice(-options.limit);
  }

  return logs.reverse();
}

/**
 * Clear logs
 */
export function clearLogs(): void {
  logStore.length = 0;
}

/**
 * Export logs
 */
export function exportLogs(): string {
  return JSON.stringify(logStore, null, 2);
}

// ============================================================================
// FACTORY
// ============================================================================

const loggers = new Map<string, Logger>();

export function getLogger(module: string): Logger {
  if (!loggers.has(module)) {
    loggers.set(module, new Logger(module));
  }
  return loggers.get(module)!;
}

export default {
  Logger,
  getLogger,
  getLogs,
  clearLogs,
  exportLogs,
};

