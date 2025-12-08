// ============================================================================
// NEXUS MODULES - Automations Module
// ============================================================================

import { AutomationRule, AutomationTrigger, AutomationCondition, AutomationAction } from '../../types';
import { generateUUID, now } from '../../utils';
import { eventBus } from '../../core/engine';
import { nexusScheduler } from '../../systems/nexus_scheduler';

export interface AutomationCreateInput {
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
}

export type TriggerHandler = (
  rule: AutomationRule,
  context: Record<string, unknown>
) => Promise<boolean>;

export type ActionHandler = (
  action: AutomationAction,
  context: Record<string, unknown>
) => Promise<unknown>;

export class AutomationsModule {
  private rules: Map<string, AutomationRule> = new Map();
  private triggerHandlers: Map<string, TriggerHandler> = new Map();
  private actionHandlers: Map<string, ActionHandler> = new Map();
  private scheduledJobs: Map<string, string> = new Map(); // ruleId -> jobId

  constructor() {
    this.registerBuiltInHandlers();
    this.setupEventListeners();
  }

  // ----------------------------- Rule Management ----------------------------
  create(userId: string, input: AutomationCreateInput): AutomationRule {
    const rule: AutomationRule = {
      id: generateUUID(),
      userId,
      name: input.name,
      description: input.description,
      trigger: input.trigger,
      conditions: input.conditions || [],
      actions: input.actions.map((a, i) => ({ ...a, order: i })),
      isActive: false,
      runCount: 0,
      createdAt: now(),
    };

    this.rules.set(rule.id, rule);
    eventBus.emit('automations:created', rule);

    return rule;
  }

  get(id: string): AutomationRule | undefined {
    return this.rules.get(id);
  }

  update(id: string, updates: Partial<AutomationCreateInput>): AutomationRule | undefined {
    const rule = this.rules.get(id);
    if (!rule) return undefined;

    if (updates.name) rule.name = updates.name;
    if (updates.description !== undefined) rule.description = updates.description;
    if (updates.trigger) rule.trigger = updates.trigger;
    if (updates.conditions) rule.conditions = updates.conditions;
    if (updates.actions) {
      rule.actions = updates.actions.map((a, i) => ({ ...a, order: i }));
    }

    eventBus.emit('automations:updated', rule);
    return rule;
  }

  delete(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;

    this.deactivate(id);
    this.rules.delete(id);
    eventBus.emit('automations:deleted', { id });

    return true;
  }

  // ----------------------------- Activation ---------------------------------
  activate(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule || rule.isActive) return false;

    rule.isActive = true;

    // Set up scheduled trigger if applicable
    if (rule.trigger.type === 'schedule') {
      this.setupScheduledTrigger(rule);
    }

    eventBus.emit('automations:activated', rule);
    return true;
  }

  deactivate(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule || !rule.isActive) return false;

    rule.isActive = false;

    // Remove scheduled job
    const jobId = this.scheduledJobs.get(id);
    if (jobId) {
      nexusScheduler.cancel(jobId);
      this.scheduledJobs.delete(id);
    }

    eventBus.emit('automations:deactivated', rule);
    return true;
  }

  // ----------------------------- Trigger Handling ---------------------------
  private setupScheduledTrigger(rule: AutomationRule): void {
    const config = rule.trigger.config;
    
    if (config.interval) {
      const job = nexusScheduler.scheduleInterval(
        `automation:${rule.id}`,
        async () => { await this.execute(rule.id, {}); },
        config.interval as number
      );
      this.scheduledJobs.set(rule.id, job.id);
    } else if (config.time) {
      const job = nexusScheduler.scheduleDaily(
        `automation:${rule.id}`,
        async () => { await this.execute(rule.id, {}); },
        config.time as string
      );
      this.scheduledJobs.set(rule.id, job.id);
    }
  }

  private setupEventListeners(): void {
    // Listen for various events that could trigger automations
    eventBus.on('trackers:tracked', (event) => {
      this.handleEventTrigger('tracker_tracked', event.payload);
    });

    eventBus.on('trackers:created', (event) => {
      this.handleEventTrigger('tracker_created', event.payload);
    });

    eventBus.on('suggestions:generated', (event) => {
      this.handleEventTrigger('suggestion_generated', event.payload);
    });
  }

  private async handleEventTrigger(eventType: string, data: unknown): Promise<void> {
    const rules = Array.from(this.rules.values());
    for (const rule of rules) {
      if (!rule.isActive) continue;
      if (rule.trigger.type !== 'event') continue;
      if (rule.trigger.config.eventType !== eventType) continue;

      await this.execute(rule.id, { event: eventType, data });
    }
  }

  // ----------------------------- Execution ----------------------------------
  async execute(
    id: string,
    context: Record<string, unknown>
  ): Promise<{ success: boolean; results: unknown[] }> {
    const rule = this.rules.get(id);
    if (!rule) {
      return { success: false, results: [] };
    }

    eventBus.emit('automations:executing', { rule, context });

    // Check conditions
    const conditionsMet = await this.checkConditions(rule.conditions, context);
    if (!conditionsMet) {
      return { success: false, results: [] };
    }

    // Execute actions in order
    const results: unknown[] = [];
    const sortedActions = [...rule.actions].sort((a, b) => a.order - b.order);

    for (const action of sortedActions) {
      try {
        const result = await this.executeAction(action, context);
        results.push(result);
        context[`action_${action.order}_result`] = result;
      } catch (error) {
        console.error(`Automation action failed:`, error);
        eventBus.emit('automations:error', { rule, action, error });
        return { success: false, results };
      }
    }

    rule.runCount++;
    rule.lastRun = now();

    eventBus.emit('automations:executed', { rule, context, results });

    return { success: true, results };
  }

  async trigger(id: string, context: Record<string, unknown> = {}): Promise<boolean> {
    const result = await this.execute(id, context);
    return result.success;
  }

  // ----------------------------- Conditions ---------------------------------
  private async checkConditions(
    conditions: AutomationCondition[],
    context: Record<string, unknown>
  ): Promise<boolean> {
    for (const condition of conditions) {
      const value = this.resolveValue(condition.field, context);
      const conditionMet = this.evaluateCondition(value, condition.operator, condition.value);
      
      if (!conditionMet) return false;
    }
    return true;
  }

  private resolveValue(field: string, context: Record<string, unknown>): unknown {
    const parts = field.split('.');
    let value: unknown = context;
    
    for (const part of parts) {
      if (value === null || value === undefined) return undefined;
      value = (value as Record<string, unknown>)[part];
    }
    
    return value;
  }

  private evaluateCondition(
    actual: unknown,
    operator: AutomationCondition['operator'],
    expected: unknown
  ): boolean {
    switch (operator) {
      case 'eq': return actual === expected;
      case 'neq': return actual !== expected;
      case 'gt': return (actual as number) > (expected as number);
      case 'gte': return (actual as number) >= (expected as number);
      case 'lt': return (actual as number) < (expected as number);
      case 'lte': return (actual as number) <= (expected as number);
      case 'contains': return String(actual).includes(String(expected));
      case 'matches': return new RegExp(String(expected)).test(String(actual));
      default: return false;
    }
  }

  // ----------------------------- Actions ------------------------------------
  registerActionHandler(type: string, handler: ActionHandler): void {
    this.actionHandlers.set(type, handler);
  }

  private async executeAction(
    action: AutomationAction,
    context: Record<string, unknown>
  ): Promise<unknown> {
    const handler = this.actionHandlers.get(action.type);
    if (!handler) {
      throw new Error(`Unknown action type: ${action.type}`);
    }
    return handler(action, context);
  }

  private registerBuiltInHandlers(): void {
    // Log action
    this.registerActionHandler('log', async (action) => {
      console.log('[Automation]', action.config.message);
      return true;
    });

    // Emit event action
    this.registerActionHandler('emit', async (action) => {
      eventBus.emit(action.config.event as string, action.config.data);
      return true;
    });

    // Delay action
    this.registerActionHandler('delay', async (action) => {
      await new Promise(resolve => setTimeout(resolve, action.config.duration as number));
      return true;
    });

    // HTTP request action
    this.registerActionHandler('http', async (action, context) => {
      const { url, method = 'POST', body } = action.config;
      const response = await fetch(url as string, {
        method: method as string,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      return response.json();
    });

    // Set variable action
    this.registerActionHandler('setVariable', async (action, context) => {
      context[action.config.name as string] = action.config.value;
      return action.config.value;
    });
  }

  // ----------------------------- Query Operations ---------------------------
  getByUser(userId: string): AutomationRule[] {
    return Array.from(this.rules.values()).filter(r => r.userId === userId);
  }

  getActive(userId?: string): AutomationRule[] {
    let rules = Array.from(this.rules.values()).filter(r => r.isActive);
    if (userId) {
      rules = rules.filter(r => r.userId === userId);
    }
    return rules;
  }

  // ----------------------------- Statistics ---------------------------------
  getStats() {
    const rules = Array.from(this.rules.values());
    
    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.isActive).length,
      totalRuns: rules.reduce((sum, r) => sum + r.runCount, 0),
      triggerTypes: Object.fromEntries(
        ['event', 'schedule', 'condition', 'manual'].map(type => [
          type,
          rules.filter(r => r.trigger.type === type).length,
        ])
      ),
      actionHandlers: this.actionHandlers.size,
    };
  }
}

// Singleton instance
export const automationsModule = new AutomationsModule();
export default automationsModule;


