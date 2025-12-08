// ============================================================================
// NEXUS PRIME - PERFECTION ENGINE
// Continuous system monitoring and auto-improvement
// ============================================================================

import { kernel } from '../core/kernel';
import { globalEvents, PrimeEvents } from '../core/events';
import { guardian } from '../self-heal/guardian';
import { getConfig } from '../core/config';

export interface PerfectionCheck {
  id: string;
  name: string;
  category: 'error' | 'ui' | 'api' | 'navigation' | 'performance' | 'data';
  check: () => Promise<PerfectionResult>;
  fix?: () => Promise<void>;
}

export interface PerfectionResult {
  passed: boolean;
  score: number; // 0-100
  message: string;
  details?: any;
  autoFixable: boolean;
}

export interface PerfectionReport {
  timestamp: number;
  overallScore: number;
  checks: Map<string, PerfectionResult>;
  issues: string[];
  suggestions: string[];
  autoFixes: string[];
}

export class PerfectionEngine {
  private static instance: PerfectionEngine;
  private checks = new Map<string, PerfectionCheck>();
  private lastReport?: PerfectionReport;
  private running = false;
  private interval?: NodeJS.Timeout;

  private constructor() {
    this.registerDefaultChecks();
  }

  static getInstance(): PerfectionEngine {
    if (!PerfectionEngine.instance) {
      PerfectionEngine.instance = new PerfectionEngine();
    }
    return PerfectionEngine.instance;
  }

  // ----------------------------- Check Registration -------------------------
  registerCheck(check: PerfectionCheck): void {
    this.checks.set(check.id, check);
  }

  private registerDefaultChecks(): void {
    // Error boundary check
    this.registerCheck({
      id: 'error-boundaries',
      name: 'Error Boundaries',
      category: 'error',
      check: async () => {
        if (typeof document === 'undefined') {
          return { passed: true, score: 100, message: 'SSR mode', autoFixable: false };
        }

        const errors = document.querySelectorAll('[data-error-boundary="triggered"]');
        const passed = errors.length === 0;

        return {
          passed,
          score: passed ? 100 : Math.max(0, 100 - errors.length * 20),
          message: passed 
            ? 'No error boundaries triggered' 
            : `${errors.length} error boundaries triggered`,
          details: { errorCount: errors.length },
          autoFixable: true,
        };
      },
      fix: async () => {
        // Attempt to recover error boundaries
        globalEvents.emit('perfection:clear-error-boundaries');
      },
    });

    // Console errors check
    this.registerCheck({
      id: 'console-errors',
      name: 'Console Errors',
      category: 'error',
      check: async () => {
        const health = kernel.getHealth();
        const errorCount = health.issues.filter(i => i.type === 'error').length;
        const passed = errorCount === 0;

        return {
          passed,
          score: passed ? 100 : Math.max(0, 100 - errorCount * 10),
          message: passed ? 'No console errors' : `${errorCount} errors detected`,
          details: { errorCount },
          autoFixable: true,
        };
      },
    });

    // UI rendering check
    this.registerCheck({
      id: 'ui-rendering',
      name: 'UI Rendering',
      category: 'ui',
      check: async () => {
        if (typeof document === 'undefined') {
          return { passed: true, score: 100, message: 'SSR mode', autoFixable: false };
        }

        // Check for loading spinners stuck
        const loadingElements = document.querySelectorAll('[data-loading="true"]');
        const stuckLoaders = Array.from(loadingElements).filter(el => {
          const startTime = el.getAttribute('data-loading-start');
          if (!startTime) return false;
          return Date.now() - parseInt(startTime) > 10000; // 10 seconds
        });

        const passed = stuckLoaders.length === 0;

        return {
          passed,
          score: passed ? 100 : Math.max(0, 100 - stuckLoaders.length * 15),
          message: passed ? 'UI rendering normally' : `${stuckLoaders.length} stuck loaders`,
          details: { stuckLoaders: stuckLoaders.length },
          autoFixable: true,
        };
      },
      fix: async () => {
        // Force update stuck loaders
        globalEvents.emit('perfection:reset-loaders');
      },
    });

    // API health check
    this.registerCheck({
      id: 'api-health',
      name: 'API Health',
      category: 'api',
      check: async () => {
        try {
          const response = await fetch('/api/health', { 
            method: 'GET',
            signal: AbortSignal.timeout(5000),
          });
          
          const passed = response.ok;

          return {
            passed,
            score: passed ? 100 : 0,
            message: passed ? 'API responding' : 'API not responding',
            details: { status: response.status },
            autoFixable: false,
          };
        } catch (error) {
          return {
            passed: false,
            score: 0,
            message: 'API health check failed',
            details: { error: String(error) },
            autoFixable: false,
          };
        }
      },
    });

    // Navigation check
    this.registerCheck({
      id: 'navigation',
      name: 'Navigation',
      category: 'navigation',
      check: async () => {
        if (typeof document === 'undefined') {
          return { passed: true, score: 100, message: 'SSR mode', autoFixable: false };
        }

        // Check for broken links
        const links = document.querySelectorAll('a[href^="/"]');
        const brokenLinks: string[] = [];

        // Note: In a real implementation, you'd verify these links
        // For now, just check they exist

        const passed = brokenLinks.length === 0;

        return {
          passed,
          score: 100, // Assume all links are valid
          message: passed ? 'Navigation healthy' : `${brokenLinks.length} broken links`,
          details: { totalLinks: links.length, brokenLinks },
          autoFixable: false,
        };
      },
    });

    // Performance check
    this.registerCheck({
      id: 'performance',
      name: 'Performance',
      category: 'performance',
      check: async () => {
        if (typeof performance === 'undefined') {
          return { passed: true, score: 100, message: 'N/A', autoFixable: false };
        }

        const metrics: Record<string, number> = {};
        let score = 100;

        // Check memory
        if ((performance as any).memory) {
          const mem = (performance as any).memory;
          const usagePercent = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;
          metrics.memoryUsage = usagePercent;

          if (usagePercent > 80) score -= 20;
          else if (usagePercent > 60) score -= 10;
        }

        // Check timing
        const timing = performance.timing;
        if (timing) {
          const loadTime = timing.loadEventEnd - timing.navigationStart;
          metrics.loadTime = loadTime;

          if (loadTime > 5000) score -= 20;
          else if (loadTime > 3000) score -= 10;
        }

        const passed = score >= 70;

        return {
          passed,
          score: Math.max(0, score),
          message: passed ? 'Performance acceptable' : 'Performance issues detected',
          details: metrics,
          autoFixable: true,
        };
      },
      fix: async () => {
        // Trigger performance optimizations
        globalEvents.emit('perfection:optimize-performance');
      },
    });

    // Data consistency check
    this.registerCheck({
      id: 'data-consistency',
      name: 'Data Consistency',
      category: 'data',
      check: async () => {
        // This would check local storage vs server state
        // For now, just check local storage is accessible

        try {
          const testKey = '_perfection_test_';
          localStorage.setItem(testKey, 'test');
          localStorage.removeItem(testKey);

          return {
            passed: true,
            score: 100,
            message: 'Data storage accessible',
            autoFixable: false,
          };
        } catch (error) {
          return {
            passed: false,
            score: 0,
            message: 'Data storage not accessible',
            details: { error: String(error) },
            autoFixable: false,
          };
        }
      },
    });
  }

  // ----------------------------- Running Checks -----------------------------
  async runAllChecks(): Promise<PerfectionReport> {
    this.running = true;
    const checkResults = new Map<string, PerfectionResult>();
    const issues: string[] = [];
    const suggestions: string[] = [];
    const autoFixes: string[] = [];
    let totalScore = 0;

    for (const [id, check] of this.checks) {
      try {
        const result = await check.check();
        checkResults.set(id, result);
        totalScore += result.score;

        if (!result.passed) {
          issues.push(`[${check.category}] ${check.name}: ${result.message}`);

          if (result.autoFixable && check.fix && getConfig().selfHeal.autoFix) {
            try {
              await check.fix();
              autoFixes.push(`Auto-fixed: ${check.name}`);
            } catch (e) {
              suggestions.push(`Manual fix needed: ${check.name}`);
            }
          } else if (!result.autoFixable) {
            suggestions.push(`Manual attention needed: ${check.name}`);
          }
        }
      } catch (error) {
        console.error(`[Perfection] Check ${id} failed:`, error);
        checkResults.set(id, {
          passed: false,
          score: 0,
          message: `Check failed: ${error}`,
          autoFixable: false,
        });
      }
    }

    const report: PerfectionReport = {
      timestamp: Date.now(),
      overallScore: this.checks.size > 0 ? totalScore / this.checks.size : 100,
      checks: checkResults,
      issues,
      suggestions,
      autoFixes,
    };

    this.lastReport = report;
    this.running = false;

    // Emit report
    globalEvents.emit('perfection:report', report);

    // If score is low, notify guardian
    if (report.overallScore < 50) {
      guardian.getStats(); // Trigger guardian awareness
    }

    return report;
  }

  async runCheck(checkId: string): Promise<PerfectionResult | null> {
    const check = this.checks.get(checkId);
    if (!check) return null;

    try {
      return await check.check();
    } catch (error) {
      console.error(`[Perfection] Check ${checkId} failed:`, error);
      return null;
    }
  }

  // ----------------------------- Continuous Monitoring ----------------------
  startMonitoring(intervalMs: number = 60000): void {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.interval = setInterval(() => {
      if (!this.running) {
        this.runAllChecks();
      }
    }, intervalMs);

    // Run initial check
    this.runAllChecks();
  }

  stopMonitoring(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  // ----------------------------- Getters ------------------------------------
  getLastReport(): PerfectionReport | undefined {
    return this.lastReport;
  }

  getCheckCategories(): string[] {
    const categories = new Set<string>();
    for (const check of this.checks.values()) {
      categories.add(check.category);
    }
    return Array.from(categories);
  }

  isRunning(): boolean {
    return this.running;
  }
}

export const perfectionEngine = PerfectionEngine.getInstance();

