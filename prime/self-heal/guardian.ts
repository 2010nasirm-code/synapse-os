// ============================================================================
// NEXUS PRIME - SELF-HEALING GUARDIAN 2.0
// The ultimate system protection and recovery layer
// ============================================================================

import { kernel, type SystemIssue } from '../core/kernel';
import { globalEvents, PrimeEvents } from '../core/events';
import { getConfig } from '../core/config';
import { RecoveryEngine, RecoveryAction } from './recovery';
import { DiagnosticsEngine } from './diagnostics';

export type GuardianStatus = 'watching' | 'healing' | 'recovering' | 'cooldown' | 'disabled';

export interface HealingAttempt {
  id: string;
  issue: SystemIssue;
  actions: RecoveryAction[];
  startedAt: number;
  completedAt?: number;
  success: boolean;
  error?: string;
}

export interface GuardianStats {
  status: GuardianStatus;
  issuesDetected: number;
  issuesHealed: number;
  issuesFailed: number;
  lastHealingAttempt?: number;
  averageHealingTime: number;
  uptime: number;
}

export class SelfHealingGuardian {
  private static instance: SelfHealingGuardian;
  private status: GuardianStatus = 'watching';
  private recovery: RecoveryEngine;
  private diagnostics: DiagnosticsEngine;
  private healingHistory: HealingAttempt[] = [];
  private cooldownUntil: number = 0;
  private startTime: number = 0;
  private stats: GuardianStats;

  private constructor() {
    this.recovery = new RecoveryEngine();
    this.diagnostics = new DiagnosticsEngine();
    this.stats = this.initializeStats();
  }

  static getInstance(): SelfHealingGuardian {
    if (!SelfHealingGuardian.instance) {
      SelfHealingGuardian.instance = new SelfHealingGuardian();
    }
    return SelfHealingGuardian.instance;
  }

  // ----------------------------- Initialization -----------------------------
  async initialize(): Promise<void> {
    this.startTime = Date.now();
    
    // Subscribe to kernel events
    kernel.on('kernel:error', (data) => this.handleError(data.error, data.context));
    kernel.on('kernel:healing-required', (issues) => this.handleHealingRequired(issues));
    
    // Subscribe to global events
    globalEvents.on(PrimeEvents.DATA_ERROR, (data) => this.handleDataError(data));
    globalEvents.on(PrimeEvents.AGENT_ERROR, (data) => this.handleAgentError(data));

    // Start diagnostics loop
    this.startDiagnosticsLoop();

    console.log('[Guardian] Self-Healing Guardian 2.0 initialized');
  }

  // ----------------------------- Error Handling -----------------------------
  private async handleError(error: Error, context: string): Promise<void> {
    if (!this.canHeal()) return;

    this.stats.issuesDetected++;

    const issue: SystemIssue = {
      id: `error-${Date.now()}`,
      type: 'error',
      component: context,
      message: error.message,
      severity: this.determineSeverity(error),
      timestamp: Date.now(),
      resolved: false,
      autoFixable: this.isAutoFixable(error, context),
    };

    if (issue.autoFixable && getConfig().selfHeal.autoFix) {
      await this.heal(issue);
    } else {
      globalEvents.emit(PrimeEvents.HEAL_REQUIRED, issue);
    }
  }

  private async handleHealingRequired(issues: SystemIssue[]): Promise<void> {
    if (!this.canHeal()) return;

    for (const issue of issues) {
      if (issue.autoFixable) {
        await this.heal(issue);
      }
    }
  }

  private handleDataError(data: any): void {
    this.stats.issuesDetected++;
    
    // Try to recover data integrity
    this.recovery.recoverData(data);
  }

  private handleAgentError(data: any): void {
    this.stats.issuesDetected++;
    
    // Restart the agent
    this.recovery.restartAgent(data.agentId);
  }

  // ----------------------------- Healing Process ----------------------------
  async heal(issue: SystemIssue): Promise<boolean> {
    if (!this.canHeal()) {
      console.log('[Guardian] Cannot heal: cooldown or disabled');
      return false;
    }

    this.status = 'healing';
    globalEvents.emit(PrimeEvents.HEAL_STARTED, issue);

    const attempt: HealingAttempt = {
      id: `heal-${Date.now()}`,
      issue,
      actions: [],
      startedAt: Date.now(),
      success: false,
    };

    try {
      // Determine recovery strategy
      const actions = this.recovery.planRecovery(issue);
      attempt.actions = actions;

      // Execute recovery actions
      for (const action of actions) {
        await this.executeRecoveryAction(action);
      }

      // Verify fix
      const verified = await this.diagnostics.verifyFix(issue);
      
      if (verified) {
        attempt.success = true;
        attempt.completedAt = Date.now();
        this.stats.issuesHealed++;
        
        // Mark issue as resolved
        kernel.markErrorResolved(issue.id);
        
        globalEvents.emit(PrimeEvents.HEAL_COMPLETE, { issue, attempt });
        console.log(`[Guardian] Successfully healed: ${issue.message}`);
      } else {
        throw new Error('Fix verification failed');
      }

    } catch (error) {
      attempt.success = false;
      attempt.error = error instanceof Error ? error.message : 'Unknown error';
      attempt.completedAt = Date.now();
      this.stats.issuesFailed++;

      globalEvents.emit(PrimeEvents.HEAL_FAILED, { issue, attempt, error });
      console.error(`[Guardian] Healing failed: ${issue.message}`, error);

      // Enter cooldown
      this.enterCooldown();
    }

    this.healingHistory.push(attempt);
    this.stats.lastHealingAttempt = Date.now();
    this.updateAverageHealingTime();
    this.status = 'watching';

    return attempt.success;
  }

  private async executeRecoveryAction(action: RecoveryAction): Promise<void> {
    console.log(`[Guardian] Executing: ${action.type} - ${action.description}`);
    await action.execute();
  }

  // ----------------------------- Recovery Strategies ------------------------
  private determineSeverity(error: Error): SystemIssue['severity'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('critical') || message.includes('fatal')) return 'critical';
    if (message.includes('failed') || message.includes('error')) return 'high';
    if (message.includes('warning') || message.includes('timeout')) return 'medium';
    return 'low';
  }

  private isAutoFixable(error: Error, context: string): boolean {
    // Define auto-fixable error patterns
    const autoFixPatterns = [
      /network.*error/i,
      /timeout/i,
      /connection.*failed/i,
      /data.*sync/i,
      /state.*invalid/i,
      /cache.*miss/i,
      /retry/i,
    ];

    return autoFixPatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(context)
    );
  }

  // ----------------------------- Cooldown Management ------------------------
  private canHeal(): boolean {
    const config = getConfig().selfHeal;
    
    if (!config.enabled) {
      this.status = 'disabled';
      return false;
    }

    if (Date.now() < this.cooldownUntil) {
      this.status = 'cooldown';
      return false;
    }

    return true;
  }

  private enterCooldown(): void {
    const config = getConfig().selfHeal;
    this.cooldownUntil = Date.now() + config.cooldownPeriod;
    this.status = 'cooldown';
    
    setTimeout(() => {
      if (this.status === 'cooldown') {
        this.status = 'watching';
      }
    }, config.cooldownPeriod);
  }

  // ----------------------------- Diagnostics Loop ---------------------------
  private startDiagnosticsLoop(): void {
    setInterval(async () => {
      if (this.status === 'watching') {
        await this.runDiagnostics();
      }
    }, 30000); // Every 30 seconds
  }

  private async runDiagnostics(): Promise<void> {
    const issues = await this.diagnostics.runFullScan();
    
    for (const issue of issues) {
      if (issue.autoFixable) {
        await this.heal(issue);
      }
    }
  }

  // ----------------------------- Manual Controls ----------------------------
  async forceHeal(issue: SystemIssue): Promise<boolean> {
    this.cooldownUntil = 0; // Bypass cooldown
    return this.heal(issue);
  }

  async softReset(component?: string): Promise<void> {
    this.status = 'recovering';
    globalEvents.emit('guardian:soft-reset', { component });

    if (component) {
      await this.recovery.resetComponent(component);
    } else {
      await this.recovery.softResetAll();
    }

    this.status = 'watching';
  }

  async hardReset(): Promise<void> {
    this.status = 'recovering';
    globalEvents.emit('guardian:hard-reset');

    await this.recovery.hardReset();
    
    this.status = 'watching';
  }

  // ----------------------------- Statistics ---------------------------------
  private initializeStats(): GuardianStats {
    return {
      status: 'watching',
      issuesDetected: 0,
      issuesHealed: 0,
      issuesFailed: 0,
      averageHealingTime: 0,
      uptime: 0,
    };
  }

  private updateAverageHealingTime(): void {
    const completedAttempts = this.healingHistory.filter(a => a.completedAt);
    if (completedAttempts.length === 0) return;

    const totalTime = completedAttempts.reduce(
      (sum, a) => sum + (a.completedAt! - a.startedAt),
      0
    );
    this.stats.averageHealingTime = totalTime / completedAttempts.length;
  }

  getStats(): GuardianStats {
    return {
      ...this.stats,
      status: this.status,
      uptime: Date.now() - this.startTime,
    };
  }

  getHistory(): HealingAttempt[] {
    return [...this.healingHistory];
  }

  getStatus(): GuardianStatus {
    return this.status;
  }
}

export const guardian = SelfHealingGuardian.getInstance();

