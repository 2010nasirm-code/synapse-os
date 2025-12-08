// ============================================================================
// NEXUS PRIME - OPTIMIZER AGENT
// Performance optimization and resource management
// ============================================================================

import { BaseAgent, AgentTask } from './base-agent';
import { globalEvents } from '../core/events';
import { kernel } from '../core/kernel';

export class OptimizerAgent extends BaseAgent {
  private optimizationHistory: Array<{ type: string; improvement: number; timestamp: number }> = [];

  constructor() {
    super('optimizer-agent', 'Optimizer Agent', 'Optimizes system performance');
    this.registerCapabilities();
  }

  protected async onStart(): Promise<void> {
    // Subscribe to performance events
    globalEvents.on('kernel:metrics', (metrics) => this.analyzeMetrics(metrics));
    globalEvents.on('perfection:optimize-performance', () => this.runFullOptimization());

    // Start periodic optimization check
    setInterval(() => this.checkOptimizationOpportunities(), 60000);
  }

  protected async onStop(): Promise<void> {
    // Cleanup
  }

  protected async processTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case 'optimize-memory':
        return this.optimizeMemory();
      case 'optimize-cache':
        return this.optimizeCache();
      case 'optimize-rendering':
        return this.optimizeRendering();
      case 'cleanup-resources':
        return this.cleanupResources();
      case 'full-optimization':
        return this.runFullOptimization();
      default:
        console.warn(`[OptimizerAgent] Unknown task type: ${task.type}`);
    }
  }

  // ----------------------------- Capabilities -------------------------------
  private registerCapabilities(): void {
    this.registerCapability({
      name: 'optimize-memory',
      description: 'Optimize memory usage',
      handler: async () => this.optimizeMemory(),
    });

    this.registerCapability({
      name: 'optimize-cache',
      description: 'Optimize cache strategy',
      handler: async () => this.optimizeCache(),
    });

    this.registerCapability({
      name: 'cleanup',
      description: 'Clean up unused resources',
      handler: async () => this.cleanupResources(),
    });
  }

  // ----------------------------- Analysis -----------------------------------
  private analyzeMetrics(metrics: any): void {
    // Check memory usage
    if (metrics.memoryUsage > 80) {
      this.addTask({
        type: 'optimize-memory',
        priority: 'high',
        data: { currentUsage: metrics.memoryUsage },
      });
    }

    // Check task queue
    if (metrics.pendingTasks > 50) {
      this.addTask({
        type: 'cleanup-resources',
        priority: 'normal',
        data: { pendingTasks: metrics.pendingTasks },
      });
    }
  }

  private checkOptimizationOpportunities(): void {
    const metrics = kernel.getMetrics();

    // Periodic cache optimization
    if (metrics.uptime > 300000) { // After 5 minutes
      this.addTask({
        type: 'optimize-cache',
        priority: 'low',
        data: {},
      });
    }
  }

  // ----------------------------- Optimizations ------------------------------
  private async optimizeMemory(): Promise<{ freed: number }> {
    let freed = 0;

    // Clear old event listeners (simulated)
    globalEvents.emit('optimizer:clear-old-listeners');

    // Trim history arrays
    globalEvents.emit('optimizer:trim-histories');

    // Request garbage collection hint (browser may ignore)
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
      freed += 1000000; // Estimate
    }

    this.recordOptimization('memory', freed);
    return { freed };
  }

  private async optimizeCache(): Promise<{ optimized: boolean }> {
    if (typeof caches === 'undefined') {
      return { optimized: false };
    }

    try {
      const keys = await caches.keys();
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const key of keys) {
        const cache = await caches.open(key);
        const requests = await cache.keys();

        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const date = response.headers.get('date');
            if (date) {
              const cacheTime = new Date(date).getTime();
              if (now - cacheTime > maxAge) {
                await cache.delete(request);
              }
            }
          }
        }
      }

      this.recordOptimization('cache', 1);
      return { optimized: true };
    } catch (error) {
      console.error('[OptimizerAgent] Cache optimization failed:', error);
      return { optimized: false };
    }
  }

  private async optimizeRendering(): Promise<void> {
    if (typeof document === 'undefined') return;

    // Defer non-critical animations
    document.querySelectorAll('[data-animate]').forEach(el => {
      if (!el.closest('[data-critical]')) {
        (el as HTMLElement).style.animationPlayState = 'paused';
      }
    });

    // Pause videos not in viewport
    document.querySelectorAll('video:not([data-critical])').forEach(video => {
      const rect = video.getBoundingClientRect();
      const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
      if (!inViewport) {
        (video as HTMLVideoElement).pause();
      }
    });

    this.recordOptimization('rendering', 1);
  }

  private async cleanupResources(): Promise<{ cleaned: number }> {
    let cleaned = 0;

    // Clear localStorage cache items (not user data)
    if (typeof localStorage !== 'undefined') {
      const keysToClean = Object.keys(localStorage).filter(key => 
        key.startsWith('cache_') || key.startsWith('temp_')
      );

      for (const key of keysToClean) {
        localStorage.removeItem(key);
        cleaned++;
      }
    }

    // Clear session storage temp items
    if (typeof sessionStorage !== 'undefined') {
      const keysToClean = Object.keys(sessionStorage).filter(key => 
        key.startsWith('temp_')
      );

      for (const key of keysToClean) {
        sessionStorage.removeItem(key);
        cleaned++;
      }
    }

    this.recordOptimization('cleanup', cleaned);
    return { cleaned };
  }

  private async runFullOptimization(): Promise<void> {
    console.log('[OptimizerAgent] Running full optimization...');

    await this.optimizeMemory();
    await this.optimizeCache();
    await this.optimizeRendering();
    await this.cleanupResources();

    globalEvents.emit('optimizer:full-optimization-complete', {
      timestamp: Date.now(),
      history: this.optimizationHistory.slice(-10),
    });
  }

  // ----------------------------- Tracking -----------------------------------
  private recordOptimization(type: string, improvement: number): void {
    this.optimizationHistory.push({
      type,
      improvement,
      timestamp: Date.now(),
    });

    // Keep last 100 records
    if (this.optimizationHistory.length > 100) {
      this.optimizationHistory.shift();
    }
  }

  getOptimizationHistory(): typeof this.optimizationHistory {
    return [...this.optimizationHistory];
  }
}

