/**
 * Nexus Logger
 * Centralized logging system
 */

import type { LogEntry } from "../core/types";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class NexusLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private minLevel: LogLevel = "info";
  private subscribers: Array<(entry: LogEntry) => void> = [];

  constructor() {
    if (process.env.NODE_ENV === "development") {
      this.minLevel = "debug";
    }
  }

  private log(level: LogLevel, category: string, message: string, data?: Record<string, any>): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) return;

    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      level,
      category,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output
    const prefix = `[${level.toUpperCase()}] [${category}]`;
    switch (level) {
      case "debug":
        console.debug(prefix, message, data || "");
        break;
      case "info":
        console.info(prefix, message, data || "");
        break;
      case "warn":
        console.warn(prefix, message, data || "");
        break;
      case "error":
        console.error(prefix, message, data || "");
        break;
    }

    // Notify subscribers
    this.subscribers.forEach(fn => fn(entry));
  }

  debug(category: string, message: string, data?: Record<string, any>): void {
    this.log("debug", category, message, data);
  }

  info(category: string, message: string, data?: Record<string, any>): void {
    this.log("info", category, message, data);
  }

  warn(category: string, message: string, data?: Record<string, any>): void {
    this.log("warn", category, message, data);
  }

  error(category: string, message: string, data?: Record<string, any>): void {
    this.log("error", category, message, data);
  }

  getLogs(options?: { level?: LogLevel; category?: string; limit?: number }): LogEntry[] {
    let result = [...this.logs];

    if (options?.level) {
      result = result.filter(l => l.level === options.level);
    }

    if (options?.category) {
      result = result.filter(l => l.category === options.category);
    }

    if (options?.limit) {
      result = result.slice(-options.limit);
    }

    return result;
  }

  clear(): void {
    this.logs = [];
  }

  subscribe(fn: (entry: LogEntry) => void): () => void {
    this.subscribers.push(fn);
    return () => {
      const index = this.subscribers.indexOf(fn);
      if (index > -1) this.subscribers.splice(index, 1);
    };
  }

  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  export(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new NexusLogger();


