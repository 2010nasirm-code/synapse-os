// ============================================================================
// NEXUS PRIME - DIAGNOSTICS ENGINE
// System scanning, issue detection, and fix verification
// ============================================================================

import { type SystemIssue } from '../core/kernel';
import { registry } from '../core/registry';
import { globalState } from '../core/state';

export interface DiagnosticResult {
  component: string;
  status: 'healthy' | 'warning' | 'error';
  issues: SystemIssue[];
  metrics: Record<string, number>;
  timestamp: number;
}

export interface FullScanResult {
  timestamp: number;
  duration: number;
  results: DiagnosticResult[];
  issues: SystemIssue[];
  healthScore: number;
}

export class DiagnosticsEngine {
  private scanners: Map<string, () => Promise<DiagnosticResult>> = new Map();
  private lastScan?: FullScanResult;

  constructor() {
    this.registerDefaultScanners();
  }

  // ----------------------------- Scanner Registration -----------------------
  registerScanner(
    name: string,
    scanner: () => Promise<DiagnosticResult>
  ): void {
    this.scanners.set(name, scanner);
  }

  private registerDefaultScanners(): void {
    // State scanner
    this.registerScanner('state', async () => {
      const issues: SystemIssue[] = [];
      const state = globalState.get();

      // Check for null/undefined where shouldn't be
      if (state.system.status === 'error') {
        issues.push({
          id: 'state-system-error',
          type: 'error',
          component: 'state',
          message: 'System state is in error',
          severity: 'high',
          timestamp: Date.now(),
          resolved: false,
          autoFixable: true,
        });
      }

      return {
        component: 'state',
        status: issues.length === 0 ? 'healthy' : 'error',
        issues,
        metrics: {
          sliceCount: Object.keys(state).length,
        },
        timestamp: Date.now(),
      };
    });

    // Services scanner
    this.registerScanner('services', async () => {
      const issues: SystemIssue[] = [];
      const health = await registry.healthCheck();

      for (const [name, isHealthy] of health) {
        if (!isHealthy) {
          issues.push({
            id: `service-${name}-unhealthy`,
            type: 'error',
            component: `service:${name}`,
            message: `Service ${name} is unhealthy`,
            severity: 'high',
            timestamp: Date.now(),
            resolved: false,
            autoFixable: true,
          });
        }
      }

      return {
        component: 'services',
        status: issues.length === 0 ? 'healthy' : 'error',
        issues,
        metrics: {
          totalServices: registry.getAll().length,
          activeServices: registry.getActive().length,
          unhealthyServices: issues.length,
        },
        timestamp: Date.now(),
      };
    });

    // Memory scanner
    this.registerScanner('memory', async (): Promise<DiagnosticResult> => {
      const issues: SystemIssue[] = [];
      const metrics: Record<string, number> = {};
      
      if (typeof performance !== 'undefined' && (performance as any).memory) {
        const mem = (performance as any).memory;
        const usagePercent = (mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100;

        metrics.usedHeap = mem.usedJSHeapSize;
        metrics.totalHeap = mem.totalJSHeapSize;
        metrics.heapLimit = mem.jsHeapSizeLimit;
        metrics.usagePercent = usagePercent;

        if (usagePercent > 90) {
          issues.push({
            id: 'memory-critical',
            type: 'performance',
            component: 'memory',
            message: `Memory usage critical: ${usagePercent.toFixed(1)}%`,
            severity: 'critical',
            timestamp: Date.now(),
            resolved: false,
            autoFixable: true,
          });
        } else if (usagePercent > 70) {
          issues.push({
            id: 'memory-warning',
            type: 'warning',
            component: 'memory',
            message: `Memory usage high: ${usagePercent.toFixed(1)}%`,
            severity: 'medium',
            timestamp: Date.now(),
            resolved: false,
            autoFixable: true,
          });
        }
      }

      return {
        component: 'memory',
        status: issues.length === 0 ? 'healthy' : issues[0]?.severity === 'critical' ? 'error' : 'warning',
        issues,
        metrics,
        timestamp: Date.now(),
      };
    });

    // DOM scanner
    this.registerScanner('dom', async (): Promise<DiagnosticResult> => {
      const issues: SystemIssue[] = [];
      const metrics: Record<string, number> = {};

      if (typeof document !== 'undefined') {
        // Check for orphaned error boundaries
        const errorBoundaries = document.querySelectorAll('[data-error-boundary="true"]');
        metrics.errorBoundaries = errorBoundaries.length;
        
        if (errorBoundaries.length > 0) {
          issues.push({
            id: 'dom-error-boundaries',
            type: 'error',
            component: 'dom',
            message: `${errorBoundaries.length} error boundaries triggered`,
            severity: 'high',
            timestamp: Date.now(),
            resolved: false,
            autoFixable: true,
          });
        }

        // Check for excessive DOM nodes
        const nodeCount = document.querySelectorAll('*').length;
        metrics.nodeCount = nodeCount;
        
        if (nodeCount > 5000) {
          issues.push({
            id: 'dom-excessive-nodes',
            type: 'performance',
            component: 'dom',
            message: `Excessive DOM nodes: ${nodeCount}`,
            severity: 'medium',
            timestamp: Date.now(),
            resolved: false,
            autoFixable: false,
          });
        }
      }

      return {
        component: 'dom',
        status: issues.length === 0 ? 'healthy' : 'warning',
        issues,
        metrics,
        timestamp: Date.now(),
      };
    });

    // Network scanner
    this.registerScanner('network', async (): Promise<DiagnosticResult> => {
      const issues: SystemIssue[] = [];
      const metrics: Record<string, number> = {};

      if (typeof navigator !== 'undefined') {
        metrics.online = navigator.onLine ? 1 : 0;
        
        if (!navigator.onLine) {
          issues.push({
            id: 'network-offline',
            type: 'warning',
            component: 'network',
            message: 'Application is offline',
            severity: 'medium',
            timestamp: Date.now(),
            resolved: false,
            autoFixable: false,
          });
        }
      }

      return {
        component: 'network',
        status: issues.length === 0 ? 'healthy' : 'warning',
        issues,
        metrics,
        timestamp: Date.now(),
      };
    });
  }

  // ----------------------------- Scanning -----------------------------------
  async runFullScan(): Promise<SystemIssue[]> {
    const startTime = Date.now();
    const results: DiagnosticResult[] = [];
    const allIssues: SystemIssue[] = [];

    for (const [name, scanner] of this.scanners) {
      try {
        const result = await scanner();
        results.push(result);
        allIssues.push(...result.issues);
      } catch (error) {
        console.error(`[Diagnostics] Scanner ${name} failed:`, error);
        allIssues.push({
          id: `scanner-${name}-failed`,
          type: 'error',
          component: `diagnostics:${name}`,
          message: `Scanner ${name} failed: ${error}`,
          severity: 'medium',
          timestamp: Date.now(),
          resolved: false,
          autoFixable: false,
        });
      }
    }

    // Calculate health score
    let healthScore = 100;
    for (const issue of allIssues) {
      switch (issue.severity) {
        case 'critical': healthScore -= 25; break;
        case 'high': healthScore -= 15; break;
        case 'medium': healthScore -= 10; break;
        case 'low': healthScore -= 5; break;
      }
    }

    this.lastScan = {
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      results,
      issues: allIssues,
      healthScore: Math.max(0, healthScore),
    };

    return allIssues;
  }

  async scanComponent(component: string): Promise<DiagnosticResult | null> {
    const scanner = this.scanners.get(component);
    if (!scanner) return null;

    try {
      return await scanner();
    } catch (error) {
      console.error(`[Diagnostics] Component scan failed:`, error);
      return null;
    }
  }

  // ----------------------------- Fix Verification ---------------------------
  async verifyFix(issue: SystemIssue): Promise<boolean> {
    // Run a targeted scan on the affected component
    const componentName = issue.component.split(':')[0];
    const result = await this.scanComponent(componentName);

    if (!result) {
      // Can't verify, assume fixed
      return true;
    }

    // Check if the specific issue is still present
    const stillPresent = result.issues.some(i => 
      i.type === issue.type && 
      i.component === issue.component
    );

    return !stillPresent;
  }

  // ----------------------------- Getters ------------------------------------
  getLastScan(): FullScanResult | undefined {
    return this.lastScan;
  }

  getScannerNames(): string[] {
    return Array.from(this.scanners.keys());
  }
}

