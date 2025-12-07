/**
 * Debug Logger for Beta Testing
 * Tracks user interactions, errors, and performance metrics
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogCategory = 
  | "auth" 
  | "items" 
  | "suggestions" 
  | "automations" 
  | "graph" 
  | "analytics"
  | "ui"
  | "performance"
  | "feedback"
  | "api"
  | "debug";

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  duration?: number;
}

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private sessionId: string;
  private userId?: string;
  private isEnabled: boolean;
  private performanceMarks: Map<string, PerformanceMetric> = new Map();
  private listeners: ((log: LogEntry) => void)[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = process.env.NODE_ENV !== "production" || 
                     process.env.NEXT_PUBLIC_DEBUG_MODE === "true";
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  setUserId(userId: string) {
    this.userId = userId;
    this.info("auth", "User identified", { userId });
  }

  clearUserId() {
    this.userId = undefined;
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }

  subscribe(listener: (log: LogEntry) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private createLogEntry(
    level: LogLevel,
    category: LogCategory,
    message: string,
    data?: Record<string, any>
  ): LogEntry {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      userId: this.userId,
      sessionId: this.sessionId,
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };

    return entry;
  }

  private addLog(entry: LogEntry) {
    if (!this.isEnabled) return;

    this.logs.push(entry);

    // Keep log size manageable
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(entry));

    // Console output with styling
    const styles = {
      debug: "color: #6b7280",
      info: "color: #3b82f6",
      warn: "color: #f97316",
      error: "color: #ef4444; font-weight: bold",
    };

    const prefix = `[${entry.category.toUpperCase()}]`;
    console.log(
      `%c${prefix} ${entry.message}`,
      styles[entry.level],
      entry.data || ""
    );
  }

  debug(category: LogCategory, message: string, data?: Record<string, any>) {
    this.addLog(this.createLogEntry("debug", category, message, data));
  }

  info(category: LogCategory, message: string, data?: Record<string, any>) {
    this.addLog(this.createLogEntry("info", category, message, data));
  }

  warn(category: LogCategory, message: string, data?: Record<string, any>) {
    this.addLog(this.createLogEntry("warn", category, message, data));
  }

  error(category: LogCategory, message: string, data?: Record<string, any>) {
    this.addLog(this.createLogEntry("error", category, message, data));
  }

  // Performance tracking
  startTimer(name: string, metadata?: Record<string, any>) {
    this.performanceMarks.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  endTimer(name: string): number | undefined {
    const mark = this.performanceMarks.get(name);
    if (!mark) return undefined;

    mark.endTime = performance.now();
    mark.duration = mark.endTime - mark.startTime;

    this.info("performance", `Timer: ${name}`, {
      duration: `${mark.duration.toFixed(2)}ms`,
      ...mark.metadata,
    });

    this.performanceMarks.delete(name);
    return mark.duration;
  }

  // User interaction tracking
  trackInteraction(
    component: string,
    action: string,
    data?: Record<string, any>
  ) {
    this.info("ui", `Interaction: ${component} - ${action}`, data);
  }

  trackSuggestion(action: "viewed" | "applied" | "dismissed" | "generated", suggestionId?: string, data?: Record<string, any>) {
    this.info("suggestions", `Suggestion ${action}`, { suggestionId, ...data });
  }

  trackAutomation(action: "created" | "updated" | "deleted" | "triggered" | "toggled", automationId?: string, data?: Record<string, any>) {
    this.info("automations", `Automation ${action}`, { automationId, ...data });
  }

  trackGraph(action: "viewed" | "node_clicked" | "filtered" | "searched" | "zoomed", data?: Record<string, any>) {
    this.info("graph", `Graph ${action}`, data);
  }

  // API tracking
  trackApiCall(endpoint: string, method: string, status: number, duration: number) {
    const level = status >= 400 ? "error" : "info";
    this.addLog(this.createLogEntry(level, "api", `${method} ${endpoint}`, {
      status,
      duration: `${duration.toFixed(2)}ms`,
    }));
  }

  // Get logs for export
  getLogs(filter?: { level?: LogLevel; category?: LogCategory; since?: Date }): LogEntry[] {
    let filtered = [...this.logs];

    if (filter?.level) {
      filtered = filtered.filter(log => log.level === filter.level);
    }

    if (filter?.category) {
      filtered = filtered.filter(log => log.category === filter.category);
    }

    if (filter?.since) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= filter.since!);
    }

    return filtered;
  }

  // Export logs as JSON
  exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      userId: this.userId,
      exportedAt: new Date().toISOString(),
      logs: this.logs,
    }, null, 2);
  }

  // Clear all logs
  clearLogs() {
    this.logs = [];
    this.info("debug", "Logs cleared");
  }

  // Get session info
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      logsCount: this.logs.length,
      startedAt: this.logs[0]?.timestamp,
      isEnabled: this.isEnabled,
    };
  }
}

// Singleton instance
export const logger = new DebugLogger();

// React hook for using logger
export function useLogger() {
  return logger;
}

// Error boundary helper
export function logError(error: Error, componentStack?: string) {
  logger.error("ui", `Uncaught error: ${error.message}`, {
    name: error.name,
    stack: error.stack,
    componentStack,
  });
}

