// ============================================================================
// NEXUS PRIME - DEBUG AGENT
// Error detection, logging, and debugging assistance
// ============================================================================

import { BaseAgent, AgentTask } from './base-agent';
import { globalEvents, PrimeEvents } from '../core/events';
import { kernel, SystemIssue } from '../core/kernel';

export interface DebugLog {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  component: string;
  message: string;
  data?: any;
  stack?: string;
  timestamp: number;
}

export class DebugAgent extends BaseAgent {
  private logs: DebugLog[] = [];
  private maxLogs = 1000;
  private errorPatterns = new Map<string, number>();

  constructor() {
    super('debug-agent', 'Debug Agent', 'Monitors and assists with debugging');
    this.registerCapabilities();
    this.setupConsoleInterception();
  }

  protected async onStart(): Promise<void> {
    // Subscribe to error events
    globalEvents.on('kernel:error', (data) => this.handleKernelError(data));
    globalEvents.on(PrimeEvents.AGENT_ERROR, (data) => this.handleAgentError(data));
    globalEvents.on(PrimeEvents.DATA_ERROR, (data) => this.handleDataError(data));
  }

  protected async onStop(): Promise<void> {
    // Save logs before stopping
    this.persistLogs();
  }

  protected async processTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case 'analyze-error':
        return this.analyzeError(task.data);
      case 'generate-report':
        return this.generateDebugReport();
      case 'clear-logs':
        return this.clearLogs();
      case 'detect-patterns':
        return this.detectErrorPatterns();
      default:
        console.warn(`[DebugAgent] Unknown task type: ${task.type}`);
    }
  }

  // ----------------------------- Capabilities -------------------------------
  private registerCapabilities(): void {
    this.registerCapability({
      name: 'analyze',
      description: 'Analyze an error and suggest fixes',
      handler: async (data) => this.analyzeError(data),
    });

    this.registerCapability({
      name: 'report',
      description: 'Generate debug report',
      handler: async () => this.generateDebugReport(),
    });

    this.registerCapability({
      name: 'patterns',
      description: 'Detect error patterns',
      handler: async () => this.detectErrorPatterns(),
    });
  }

  // ----------------------------- Console Interception -----------------------
  private setupConsoleInterception(): void {
    if (typeof console === 'undefined') return;

    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args: any[]) => {
      this.log('error', 'console', args.map(a => String(a)).join(' '));
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      this.log('warn', 'console', args.map(a => String(a)).join(' '));
      originalWarn.apply(console, args);
    };
  }

  // ----------------------------- Event Handlers -----------------------------
  private handleKernelError(data: { error: Error; context: string; issue: SystemIssue }): void {
    this.log('error', data.context, data.error.message, {
      stack: data.error.stack,
      issue: data.issue,
    });

    // Track pattern
    this.trackErrorPattern(data.error.message);

    // Add analysis task
    this.addTask({
      type: 'analyze-error',
      priority: 'high',
      data: { error: data.error, context: data.context },
    });
  }

  private handleAgentError(data: { agentId: string; taskId: string; error: any }): void {
    this.log('error', `agent:${data.agentId}`, String(data.error), {
      taskId: data.taskId,
    });
  }

  private handleDataError(data: any): void {
    this.log('error', 'data', 'Data error occurred', data);
  }

  // ----------------------------- Logging ------------------------------------
  log(level: DebugLog['level'], component: string, message: string, data?: any): void {
    const log: DebugLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      level,
      component,
      message,
      data,
      timestamp: Date.now(),
    };

    if (data?.stack) {
      log.stack = data.stack;
    }

    this.logs.push(log);

    // Trim logs if needed
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  // ----------------------------- Analysis -----------------------------------
  private async analyzeError(data: { error: Error; context: string }): Promise<{
    cause: string;
    suggestions: string[];
    autoFixable: boolean;
  }> {
    const { error, context } = data;
    const message = error.message.toLowerCase();
    const suggestions: string[] = [];
    let cause = 'Unknown error';
    let autoFixable = false;

    // Analyze common error patterns
    if (message.includes('network') || message.includes('fetch')) {
      cause = 'Network request failed';
      suggestions.push('Check internet connection');
      suggestions.push('Verify API endpoint is accessible');
      suggestions.push('Check for CORS issues');
      autoFixable = true;
    } else if (message.includes('undefined') || message.includes('null')) {
      cause = 'Null/undefined reference';
      suggestions.push('Add null checks before accessing properties');
      suggestions.push('Verify data is loaded before use');
      autoFixable = false;
    } else if (message.includes('type') || message.includes('cannot read')) {
      cause = 'Type error or property access on wrong type';
      suggestions.push('Check variable types');
      suggestions.push('Ensure proper type guards');
      autoFixable = false;
    } else if (message.includes('timeout')) {
      cause = 'Operation timed out';
      suggestions.push('Increase timeout duration');
      suggestions.push('Check for slow operations');
      autoFixable = true;
    } else if (message.includes('memory') || message.includes('heap')) {
      cause = 'Memory issue';
      suggestions.push('Reduce data size');
      suggestions.push('Clear caches');
      suggestions.push('Check for memory leaks');
      autoFixable = true;
    }

    return { cause, suggestions, autoFixable };
  }

  private trackErrorPattern(message: string): void {
    // Normalize error message for pattern detection
    const normalized = message
      .replace(/\d+/g, 'N')
      .replace(/'[^']+'/g, "'X'")
      .toLowerCase()
      .trim();

    this.errorPatterns.set(
      normalized,
      (this.errorPatterns.get(normalized) || 0) + 1
    );
  }

  private async detectErrorPatterns(): Promise<{
    patterns: Array<{ pattern: string; count: number }>;
    mostCommon: string | null;
  }> {
    const patterns = Array.from(this.errorPatterns.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count);

    return {
      patterns: patterns.slice(0, 10),
      mostCommon: patterns[0]?.pattern || null,
    };
  }

  // ----------------------------- Reports ------------------------------------
  private async generateDebugReport(): Promise<{
    timestamp: number;
    health: any;
    recentErrors: DebugLog[];
    errorPatterns: any;
    systemState: any;
  }> {
    const health = kernel.getHealth();
    const metrics = kernel.getMetrics();
    const patterns = await this.detectErrorPatterns();

    return {
      timestamp: Date.now(),
      health,
      recentErrors: this.logs.filter(l => l.level === 'error').slice(-20),
      errorPatterns: patterns,
      systemState: {
        uptime: metrics.uptime,
        errorsHandled: metrics.errorsHandled,
        healingActions: metrics.healingActions,
      },
    };
  }

  // ----------------------------- Persistence --------------------------------
  private persistLogs(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const recentLogs = this.logs.slice(-100);
      localStorage.setItem('nexus-prime-debug-logs', JSON.stringify(recentLogs));
    } catch (e) {
      // Storage might be full
    }
  }

  loadPersistedLogs(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const saved = localStorage.getItem('nexus-prime-debug-logs');
      if (saved) {
        const logs = JSON.parse(saved);
        this.logs = [...logs, ...this.logs];
      }
    } catch (e) {
      // Ignore
    }
  }

  // ----------------------------- Getters ------------------------------------
  getLogs(filter?: {
    level?: DebugLog['level'];
    component?: string;
    since?: number;
    limit?: number;
  }): DebugLog[] {
    let logs = [...this.logs];

    if (filter?.level) {
      logs = logs.filter(l => l.level === filter.level);
    }

    if (filter?.component) {
      logs = logs.filter(l => l.component.includes(filter.component!));
    }

    if (filter?.since) {
      logs = logs.filter(l => l.timestamp >= filter.since!);
    }

    if (filter?.limit) {
      logs = logs.slice(-filter.limit);
    }

    return logs;
  }

  clearLogs(): void {
    this.logs = [];
    this.errorPatterns.clear();
  }
}

