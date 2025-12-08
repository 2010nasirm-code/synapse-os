// ============================================================================
// NEXUS PRIME - DIAGNOSTICS API
// System diagnostics and health monitoring
// ============================================================================

import { kernel, SystemIssue } from '../core/kernel';
import { guardian } from '../self-heal/guardian';
import { DiagnosticsEngine } from '../self-heal/diagnostics';
import { perfectionEngine } from '../intelligence/perfection-engine';
import { globalEvents } from '../core/events';

export interface DiagnosticsReport {
  timestamp: number;
  system: {
    status: string;
    uptime: number;
    health: number;
  };
  issues: SystemIssue[];
  perfection: {
    score: number;
    checks: Array<{ name: string; passed: boolean; score: number }>;
  };
  guardian: {
    status: string;
    healed: number;
    failed: number;
  };
  recommendations: string[];
}

class DiagnosticsAPI {
  private diagnosticsEngine: DiagnosticsEngine;

  constructor() {
    this.diagnosticsEngine = new DiagnosticsEngine();
  }

  // ----------------------------- Full Diagnostics ---------------------------
  async runFullDiagnostics(): Promise<DiagnosticsReport> {
    const startTime = Date.now();

    // Run all diagnostic scanners
    const issues = await this.diagnosticsEngine.runFullScan();

    // Run perfection checks
    const perfectionReport = await perfectionEngine.runAllChecks();

    // Get system status
    const health = kernel.getHealth();
    const metrics = kernel.getMetrics();
    const guardianStats = guardian.getStats();

    // Generate recommendations
    const recommendations = this.generateRecommendations(issues, perfectionReport);

    const report: DiagnosticsReport = {
      timestamp: Date.now(),
      system: {
        status: kernel.getStatus(),
        uptime: metrics.uptime,
        health: health.score,
      },
      issues,
      perfection: {
        score: perfectionReport.overallScore,
        checks: Array.from(perfectionReport.checks.entries()).map(([name, result]) => ({
          name,
          passed: result.passed,
          score: result.score,
        })),
      },
      guardian: {
        status: guardianStats.status,
        healed: guardianStats.issuesHealed,
        failed: guardianStats.issuesFailed,
      },
      recommendations,
    };

    globalEvents.emit('diagnostics:report-generated', report);

    return report;
  }

  // ----------------------------- Quick Health Check -------------------------
  async quickHealthCheck(): Promise<{
    healthy: boolean;
    score: number;
    criticalIssues: number;
  }> {
    const health = kernel.getHealth();

    return {
      healthy: health.status === 'healthy',
      score: health.score,
      criticalIssues: health.issues.filter(i => i.severity === 'critical').length,
    };
  }

  // ----------------------------- Component Diagnostics ----------------------
  async diagnoseComponent(componentName: string): Promise<{
    status: string;
    issues: SystemIssue[];
    metrics: Record<string, number>;
  }> {
    const result = await this.diagnosticsEngine.scanComponent(componentName);

    if (!result) {
      return {
        status: 'unknown',
        issues: [],
        metrics: {},
      };
    }

    return {
      status: result.status,
      issues: result.issues,
      metrics: result.metrics,
    };
  }

  // ----------------------------- Issue Management ---------------------------
  getActiveIssues(): SystemIssue[] {
    return kernel.getHealth().issues.filter(i => !i.resolved);
  }

  getIssueHistory(): SystemIssue[] {
    return kernel.getHealth().issues;
  }

  async resolveIssue(issueId: string): Promise<boolean> {
    const issues = kernel.getHealth().issues;
    const issue = issues.find(i => i.id === issueId);

    if (!issue) return false;

    if (issue.autoFixable) {
      return guardian.forceHeal(issue);
    }

    // Mark as resolved manually
    kernel.markErrorResolved(issueId);
    return true;
  }

  // ----------------------------- Self-Healing Controls ----------------------
  async triggerHealing(issueId?: string): Promise<boolean> {
    const issues = kernel.getHealth().issues;

    if (issueId) {
      const issue = issues.find(i => i.id === issueId);
      if (!issue) return false;
      return guardian.forceHeal(issue);
    }

    // Heal all auto-fixable issues
    let success = true;
    for (const issue of issues.filter(i => i.autoFixable && !i.resolved)) {
      const result = await guardian.forceHeal(issue);
      if (!result) success = false;
    }

    return success;
  }

  // ----------------------------- Recommendations ----------------------------
  private generateRecommendations(
    issues: SystemIssue[],
    perfectionReport: any
  ): string[] {
    const recommendations: string[] = [];

    // Based on issues
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    if (criticalCount > 0) {
      recommendations.push(`Address ${criticalCount} critical issue(s) immediately`);
    }

    const memoryIssues = issues.filter(i => i.component === 'memory');
    if (memoryIssues.length > 0) {
      recommendations.push('Consider clearing caches or reducing memory usage');
    }

    const errorIssues = issues.filter(i => i.type === 'error');
    if (errorIssues.length > 5) {
      recommendations.push('High error rate detected - review recent changes');
    }

    // Based on perfection score
    if (perfectionReport.overallScore < 70) {
      recommendations.push('Run optimization to improve system performance');
    }

    // General recommendations
    if (issues.length === 0 && perfectionReport.overallScore >= 90) {
      recommendations.push('System is running optimally');
    }

    return recommendations;
  }

  // ----------------------------- Export -------------------------------------
  exportDiagnostics(): string {
    const health = kernel.getHealth();
    const metrics = kernel.getMetrics();
    const guardianStats = guardian.getStats();

    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      health,
      metrics,
      guardian: guardianStats,
    }, null, 2);
  }
}

export const diagnosticsAPI = new DiagnosticsAPI();

