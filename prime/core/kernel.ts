// ============================================================================
// NEXUS PRIME - DYNAMIC INTELLIGENCE KERNEL
// Real-time system monitoring, adaptation, and optimization
// ============================================================================

import { EventEmitter } from './events';

export type KernelStatus = 'initializing' | 'running' | 'degraded' | 'recovering' | 'stopped';

export interface KernelMetrics {
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  activeAgents: number;
  pendingTasks: number;
  eventsProcessed: number;
  errorsHandled: number;
  adaptationsApplied: number;
  healingActions: number;
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  score: number; // 0-100
  issues: SystemIssue[];
  lastCheck: number;
}

export interface SystemIssue {
  id: string;
  type: 'error' | 'warning' | 'performance' | 'stability';
  component: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  resolved: boolean;
  autoFixable: boolean;
}

export class NexusPrimeKernel {
  private static instance: NexusPrimeKernel;
  private status: KernelStatus = 'initializing';
  private startTime: number = 0;
  private metrics: KernelMetrics;
  private health: SystemHealth;
  private events: EventEmitter;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private modules: Map<string, { status: string; lastActive: number }> = new Map();

  private constructor() {
    this.events = new EventEmitter();
    this.metrics = this.initializeMetrics();
    this.health = this.initializeHealth();
  }

  static getInstance(): NexusPrimeKernel {
    if (!NexusPrimeKernel.instance) {
      NexusPrimeKernel.instance = new NexusPrimeKernel();
    }
    return NexusPrimeKernel.instance;
  }

  // ----------------------------- Initialization -----------------------------
  async initialize(): Promise<void> {
    if (this.status === 'running') return;

    this.startTime = Date.now();
    this.status = 'initializing';
    this.events.emit('kernel:initializing');

    try {
      // Start monitoring loops
      this.startHealthMonitor();
      this.startMetricsCollector();
      this.startAdaptationEngine();

      this.status = 'running';
      this.events.emit('kernel:started');
      console.log('[Nexus Prime] Kernel initialized successfully');

    } catch (error) {
      this.status = 'degraded';
      this.events.emit('kernel:error', error);
      console.error('[Nexus Prime] Kernel initialization failed:', error);
    }
  }

  async shutdown(): Promise<void> {
    this.status = 'stopped';
    
    // Clear all intervals
    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
      this.intervals.delete(name);
    }

    this.events.emit('kernel:stopped');
    console.log('[Nexus Prime] Kernel shut down');
  }

  // ----------------------------- Health Monitoring --------------------------
  private startHealthMonitor(): void {
    const interval = setInterval(() => {
      this.performHealthCheck();
    }, 5000); // Every 5 seconds

    this.intervals.set('healthMonitor', interval);
  }

  private performHealthCheck(): void {
    const issues: SystemIssue[] = [];
    let healthScore = 100;

    // Check module health
    const now = Date.now();
    for (const [name, info] of this.modules) {
      if (info.status === 'error') {
        healthScore -= 10;
        issues.push({
          id: `module-${name}-error`,
          type: 'error',
          component: name,
          message: `Module ${name} is in error state`,
          severity: 'high',
          timestamp: now,
          resolved: false,
          autoFixable: true,
        });
      } else if (now - info.lastActive > 30000) {
        healthScore -= 5;
        issues.push({
          id: `module-${name}-inactive`,
          type: 'warning',
          component: name,
          message: `Module ${name} has been inactive for 30+ seconds`,
          severity: 'medium',
          timestamp: now,
          resolved: false,
          autoFixable: false,
        });
      }
    }

    // Check error rate
    if (this.metrics.errorsHandled > 10) {
      healthScore -= Math.min(30, this.metrics.errorsHandled * 2);
      issues.push({
        id: 'high-error-rate',
        type: 'stability',
        component: 'kernel',
        message: `High error rate detected: ${this.metrics.errorsHandled} errors`,
        severity: this.metrics.errorsHandled > 50 ? 'critical' : 'high',
        timestamp: now,
        resolved: false,
        autoFixable: true,
      });
    }

    // Update health
    this.health = {
      status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'warning' : 'critical',
      score: Math.max(0, healthScore),
      issues,
      lastCheck: now,
    };

    // Emit health update
    this.events.emit('kernel:health', this.health);

    // Trigger self-healing if needed
    if (this.health.status === 'critical') {
      this.events.emit('kernel:healing-required', issues.filter(i => i.autoFixable));
    }
  }

  // ----------------------------- Metrics Collection -------------------------
  private initializeMetrics(): KernelMetrics {
    return {
      uptime: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      activeAgents: 0,
      pendingTasks: 0,
      eventsProcessed: 0,
      errorsHandled: 0,
      adaptationsApplied: 0,
      healingActions: 0,
    };
  }

  private initializeHealth(): SystemHealth {
    return {
      status: 'healthy',
      score: 100,
      issues: [],
      lastCheck: Date.now(),
    };
  }

  private startMetricsCollector(): void {
    const interval = setInterval(() => {
      this.collectMetrics();
    }, 1000);

    this.intervals.set('metricsCollector', interval);
  }

  private collectMetrics(): void {
    this.metrics.uptime = Date.now() - this.startTime;
    
    // Memory usage (browser approximation)
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const mem = (performance as any).memory;
      this.metrics.memoryUsage = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;
    }

    this.events.emit('kernel:metrics', this.metrics);
  }

  // ----------------------------- Adaptation Engine --------------------------
  private startAdaptationEngine(): void {
    const interval = setInterval(() => {
      this.evaluateAdaptations();
    }, 10000); // Every 10 seconds

    this.intervals.set('adaptationEngine', interval);
  }

  private evaluateAdaptations(): void {
    // Analyze patterns and determine adaptations
    const adaptations: string[] = [];

    // Memory pressure adaptation
    if (this.metrics.memoryUsage > 80) {
      adaptations.push('reduce-cache-size');
      adaptations.push('defer-non-critical-tasks');
    }

    // Error rate adaptation
    if (this.metrics.errorsHandled > 5) {
      adaptations.push('enable-safe-mode');
      adaptations.push('increase-retry-delays');
    }

    if (adaptations.length > 0) {
      this.metrics.adaptationsApplied += adaptations.length;
      this.events.emit('kernel:adaptations', adaptations);
    }
  }

  // ----------------------------- Module Registration ------------------------
  registerModule(name: string): void {
    this.modules.set(name, { status: 'active', lastActive: Date.now() });
    this.events.emit('kernel:module-registered', name);
  }

  updateModuleStatus(name: string, status: string): void {
    const module = this.modules.get(name);
    if (module) {
      module.status = status;
      module.lastActive = Date.now();
    }
  }

  heartbeat(moduleName: string): void {
    const module = this.modules.get(moduleName);
    if (module) {
      module.lastActive = Date.now();
    }
  }

  // ----------------------------- Event System -------------------------------
  on(event: string, handler: (data: any) => void): void {
    this.events.on(event, handler);
  }

  off(event: string, handler: (data: any) => void): void {
    this.events.off(event, handler);
  }

  emit(event: string, data?: any): void {
    this.events.emit(event, data);
    this.metrics.eventsProcessed++;
  }

  // ----------------------------- Error Handling -----------------------------
  handleError(error: Error, context: string): void {
    this.metrics.errorsHandled++;
    
    const issue: SystemIssue = {
      id: `error-${Date.now()}`,
      type: 'error',
      component: context,
      message: error.message,
      severity: 'high',
      timestamp: Date.now(),
      resolved: false,
      autoFixable: true,
    };

    this.health.issues.push(issue);
    this.events.emit('kernel:error', { error, context, issue });
  }

  markErrorResolved(issueId: string): void {
    const issue = this.health.issues.find(i => i.id === issueId);
    if (issue) {
      issue.resolved = true;
      this.metrics.healingActions++;
    }
  }

  // ----------------------------- Getters ------------------------------------
  getStatus(): KernelStatus { return this.status; }
  getMetrics(): KernelMetrics { return { ...this.metrics }; }
  getHealth(): SystemHealth { return { ...this.health }; }
  getUptime(): number { return this.metrics.uptime; }
}

// Export singleton
export const kernel = NexusPrimeKernel.getInstance();

