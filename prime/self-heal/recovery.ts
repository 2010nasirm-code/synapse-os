// ============================================================================
// NEXUS PRIME - RECOVERY ENGINE
// Strategies and actions for system recovery
// ============================================================================

import { type SystemIssue } from '../core/kernel';
import { globalEvents } from '../core/events';

export interface RecoveryAction {
  id: string;
  type: string;
  description: string;
  priority: number;
  execute: () => Promise<void>;
}

export class RecoveryEngine {
  private strategies = new Map<string, (issue: SystemIssue) => RecoveryAction[]>();

  constructor() {
    this.registerDefaultStrategies();
  }

  // ----------------------------- Strategy Registration ----------------------
  registerStrategy(
    pattern: string,
    strategyFn: (issue: SystemIssue) => RecoveryAction[]
  ): void {
    this.strategies.set(pattern, strategyFn);
  }

  private registerDefaultStrategies(): void {
    // Network error strategy
    this.registerStrategy('network', (issue) => [
      {
        id: 'retry-request',
        type: 'retry',
        description: 'Retry failed network request',
        priority: 1,
        execute: async () => {
          await this.retryWithBackoff(async () => {
            // Trigger re-fetch of failed request
            globalEvents.emit('recovery:retry-network', { issue });
          });
        },
      },
      {
        id: 'clear-cache',
        type: 'cache',
        description: 'Clear network cache',
        priority: 2,
        execute: async () => {
          if (typeof caches !== 'undefined') {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
          }
        },
      },
    ]);

    // State corruption strategy
    this.registerStrategy('state', (issue) => [
      {
        id: 'reset-state',
        type: 'state',
        description: 'Reset corrupted state slice',
        priority: 1,
        execute: async () => {
          globalEvents.emit('recovery:reset-state', { component: issue.component });
        },
      },
      {
        id: 'restore-snapshot',
        type: 'snapshot',
        description: 'Restore from last known good state',
        priority: 2,
        execute: async () => {
          globalEvents.emit('recovery:restore-snapshot', { component: issue.component });
        },
      },
    ]);

    // UI error strategy
    this.registerStrategy('ui', (issue) => [
      {
        id: 'remount-component',
        type: 'ui',
        description: 'Force remount UI component',
        priority: 1,
        execute: async () => {
          globalEvents.emit('recovery:remount-component', { component: issue.component });
        },
      },
      {
        id: 'reset-animations',
        type: 'ui',
        description: 'Reset animation state',
        priority: 2,
        execute: async () => {
          document.querySelectorAll('[data-animating]').forEach(el => {
            el.removeAttribute('data-animating');
          });
        },
      },
    ]);

    // Data integrity strategy
    this.registerStrategy('data', (issue) => [
      {
        id: 'validate-data',
        type: 'validation',
        description: 'Re-validate data integrity',
        priority: 1,
        execute: async () => {
          globalEvents.emit('recovery:validate-data', { component: issue.component });
        },
      },
      {
        id: 'sync-data',
        type: 'sync',
        description: 'Force sync with server',
        priority: 2,
        execute: async () => {
          globalEvents.emit('recovery:force-sync', { component: issue.component });
        },
      },
    ]);

    // Generic fallback strategy
    this.registerStrategy('generic', (issue) => [
      {
        id: 'soft-reset',
        type: 'reset',
        description: 'Soft reset component',
        priority: 1,
        execute: async () => {
          await this.resetComponent(issue.component);
        },
      },
    ]);
  }

  // ----------------------------- Recovery Planning --------------------------
  planRecovery(issue: SystemIssue): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    // Find matching strategies
    for (const [pattern, strategyFn] of this.strategies) {
      if (
        issue.type.includes(pattern) ||
        issue.component.toLowerCase().includes(pattern) ||
        issue.message.toLowerCase().includes(pattern)
      ) {
        actions.push(...strategyFn(issue));
      }
    }

    // Use generic strategy if no specific match
    if (actions.length === 0) {
      const genericStrategy = this.strategies.get('generic');
      if (genericStrategy) {
        actions.push(...genericStrategy(issue));
      }
    }

    // Sort by priority
    return actions.sort((a, b) => a.priority - b.priority);
  }

  // ----------------------------- Recovery Actions ---------------------------
  async resetComponent(component: string): Promise<void> {
    console.log(`[Recovery] Resetting component: ${component}`);
    globalEvents.emit('recovery:component-reset', { component });
  }

  async softResetAll(): Promise<void> {
    console.log('[Recovery] Performing soft reset of all components');
    
    // Clear local storage caches (not user data)
    const keysToKeep = ['nexus-prime-config', 'user-preferences'];
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      if (!keysToKeep.some(k => key.includes(k))) {
        localStorage.removeItem(key);
      }
    }

    globalEvents.emit('recovery:soft-reset-complete');
  }

  async hardReset(): Promise<void> {
    console.log('[Recovery] Performing hard reset');
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear caches
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }

    // Reload page
    globalEvents.emit('recovery:hard-reset-complete');
    
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }

  async recoverData(data: any): Promise<void> {
    console.log('[Recovery] Recovering data integrity');
    globalEvents.emit('recovery:data-recovery', data);
  }

  async restartAgent(agentId: string): Promise<void> {
    console.log(`[Recovery] Restarting agent: ${agentId}`);
    globalEvents.emit('recovery:agent-restart', { agentId });
  }

  // ----------------------------- Utilities ----------------------------------
  private async retryWithBackoff(
    fn: () => Promise<void>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
      try {
        await fn();
        return;
      } catch (error) {
        lastError = error as Error;
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Retry failed');
  }
}

