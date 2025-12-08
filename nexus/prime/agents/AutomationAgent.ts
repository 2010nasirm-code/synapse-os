/**
 * ============================================================================
 * NEXUS PRIME - AUTOMATION AGENT
 * ============================================================================
 * 
 * Creates automations from natural language:
 * - Interprets if/then rules
 * - Generates automation blueprints
 * - All outputs are draft actions requiring confirmation
 * 
 * @module nexus/prime/agents/AutomationAgent
 * @version 1.0.0
 */

import { AgentConfig, AgentResult, AIRequest, SystemContext, AutomationBlueprint } from '../core/types';
import { BaseAgent } from './BaseAgent';

// ============================================================================
// AUTOMATION TEMPLATES
// ============================================================================

interface TriggerTemplate {
  type: string;
  description: string;
  patterns: RegExp[];
  configKeys: string[];
}

interface ActionTemplate {
  type: string;
  description: string;
  patterns: RegExp[];
  configKeys: string[];
}

const TRIGGER_TEMPLATES: TriggerTemplate[] = [
  {
    type: 'time',
    description: 'Triggers at a specific time',
    patterns: [/at (\d+)(:\d+)?\s*(am|pm)?/i, /every (day|morning|evening|night)/i],
    configKeys: ['time', 'frequency'],
  },
  {
    type: 'value',
    description: 'Triggers when a value meets a condition',
    patterns: [/when (.+) (is|equals|reaches|exceeds|below|above) (.+)/i, /if (.+) (<|>|=|>=|<=) (.+)/i],
    configKeys: ['field', 'operator', 'value'],
  },
  {
    type: 'event',
    description: 'Triggers on an event',
    patterns: [/when (.+) (happens|occurs|is created|is completed)/i, /on (.+) (creation|completion|update)/i],
    configKeys: ['eventType', 'entityType'],
  },
  {
    type: 'schedule',
    description: 'Triggers on a schedule',
    patterns: [/every (\d+) (minute|hour|day|week)/i, /daily|weekly|monthly/i],
    configKeys: ['interval', 'unit'],
  },
];

const ACTION_TEMPLATES: ActionTemplate[] = [
  {
    type: 'notify',
    description: 'Send a notification',
    patterns: [/notify|alert|remind|send.*notification/i],
    configKeys: ['message', 'channel'],
  },
  {
    type: 'create',
    description: 'Create an item',
    patterns: [/create|add|insert/i],
    configKeys: ['entityType', 'data'],
  },
  {
    type: 'update',
    description: 'Update an item',
    patterns: [/update|change|set|modify/i],
    configKeys: ['entityType', 'field', 'value'],
  },
  {
    type: 'log',
    description: 'Log data',
    patterns: [/log|record|track/i],
    configKeys: ['data'],
  },
];

// ============================================================================
// AUTOMATION AGENT
// ============================================================================

export class AutomationAgent extends BaseAgent {
  readonly config: AgentConfig = {
    id: 'automation',
    name: 'Automation Agent',
    description: 'Creates automations from natural language',
    capabilities: ['automation', 'rules', 'triggers', 'when', 'if', 'then', 'notify', 'remind'],
    rateLimit: 20,
    safetyTier: 2,
    canProduceActions: true,
    requiresContext: true,
    timeout: 20000,
  };

  async process(request: AIRequest, context: SystemContext): Promise<AgentResult> {
    return this.executeWithTracking(request, context, 'automate', async () => {
      // Parse the automation request
      const parsed = this.parseAutomation(request.prompt);
      
      if (!parsed.trigger && !parsed.action) {
        return this.helpWithAutomation(request);
      }

      // Build the automation blueprint
      const blueprint = this.buildBlueprint(parsed, request.prompt);

      // Create action draft
      const actionDraft = this.createActionDraft(
        'create',
        `Create Automation: ${blueprint.name}`,
        blueprint.description,
        { blueprint },
        {
          requiresConfirmation: true,
          preview: this.formatBlueprintPreview(blueprint),
          estimatedImpact: 'A new automation rule will be created and can be enabled.',
          reversible: true,
        }
      );

      return this.createSuccessResult(
        `I've created an automation blueprint:\n\n` +
        `**${blueprint.name}**\n\n` +
        `**Trigger:** ${blueprint.trigger.description}\n` +
        `**Actions:** ${blueprint.actions.map(a => a.description).join(', ')}\n\n` +
        `Review the details and confirm to create this automation.`,
        {
          actionDrafts: [actionDraft],
          confidence: parsed.confidence,
        }
      );
    });
  }

  /**
   * Parse automation from natural language
   */
  private parseAutomation(prompt: string): {
    trigger: { type: string; config: Record<string, string> } | null;
    action: { type: string; config: Record<string, string> } | null;
    confidence: number;
  } {
    let trigger: { type: string; config: Record<string, string> } | null = null;
    let action: { type: string; config: Record<string, string> } | null = null;
    let confidence = 0.5;

    // Try to match triggers
    for (const template of TRIGGER_TEMPLATES) {
      for (const pattern of template.patterns) {
        const match = prompt.match(pattern);
        if (match) {
          trigger = {
            type: template.type,
            config: this.extractConfig(match, template.configKeys),
          };
          confidence += 0.2;
          break;
        }
      }
      if (trigger) break;
    }

    // Try to match actions
    for (const template of ACTION_TEMPLATES) {
      for (const pattern of template.patterns) {
        const match = prompt.match(pattern);
        if (match) {
          action = {
            type: template.type,
            config: this.extractConfig(match, template.configKeys),
          };
          confidence += 0.2;
          break;
        }
      }
      if (action) break;
    }

    return { trigger, action, confidence: Math.min(confidence, 0.95) };
  }

  /**
   * Extract config from regex match
   */
  private extractConfig(match: RegExpMatchArray, keys: string[]): Record<string, string> {
    const config: Record<string, string> = {};
    
    for (let i = 1; i < match.length && i <= keys.length; i++) {
      if (match[i]) {
        config[keys[i - 1]] = match[i];
      }
    }
    
    return config;
  }

  /**
   * Build automation blueprint
   */
  private buildBlueprint(
    parsed: { trigger: { type: string; config: Record<string, string> } | null; action: { type: string; config: Record<string, string> } | null },
    originalPrompt: string
  ): AutomationBlueprint {
    const name = this.generateName(parsed);
    
    return {
      id: `auto-${Date.now()}`,
      name,
      description: `Automation created from: "${originalPrompt.slice(0, 100)}"`,
      trigger: {
        type: parsed.trigger?.type || 'manual',
        config: parsed.trigger?.config || {},
        description: this.describeTrigger(parsed.trigger),
      },
      actions: [
        {
          type: parsed.action?.type || 'log',
          config: parsed.action?.config || {},
          description: this.describeAction(parsed.action),
          order: 0,
        },
      ],
      enabled: false,
      createdAt: Date.now(),
    };
  }

  /**
   * Generate automation name
   */
  private generateName(parsed: { trigger: { type: string } | null; action: { type: string } | null }): string {
    const triggerName = parsed.trigger?.type || 'Manual';
    const actionName = parsed.action?.type || 'Action';
    return `${triggerName.charAt(0).toUpperCase() + triggerName.slice(1)} → ${actionName.charAt(0).toUpperCase() + actionName.slice(1)}`;
  }

  /**
   * Describe trigger in human terms
   */
  private describeTrigger(trigger: { type: string; config: Record<string, string> } | null): string {
    if (!trigger) return 'Manual trigger (run on demand)';

    switch (trigger.type) {
      case 'time':
        return `At ${trigger.config.time || 'specified time'}`;
      case 'value':
        return `When ${trigger.config.field || 'value'} ${trigger.config.operator || 'is'} ${trigger.config.value || 'target'}`;
      case 'event':
        return `When ${trigger.config.entityType || 'item'} ${trigger.config.eventType || 'changes'}`;
      case 'schedule':
        return `Every ${trigger.config.interval || '1'} ${trigger.config.unit || 'day'}`;
      default:
        return 'Custom trigger';
    }
  }

  /**
   * Describe action in human terms
   */
  private describeAction(action: { type: string; config: Record<string, string> } | null): string {
    if (!action) return 'Log event';

    switch (action.type) {
      case 'notify':
        return `Send notification: "${action.config.message || 'Alert!'}"`;
      case 'create':
        return `Create ${action.config.entityType || 'item'}`;
      case 'update':
        return `Update ${action.config.field || 'field'} to ${action.config.value || 'new value'}`;
      case 'log':
        return 'Log data';
      default:
        return 'Custom action';
    }
  }

  /**
   * Format blueprint preview
   */
  private formatBlueprintPreview(blueprint: AutomationBlueprint): string {
    return `
┌─────────────────────────────────────┐
│ 🤖 ${blueprint.name.padEnd(31)} │
├─────────────────────────────────────┤
│ TRIGGER                             │
│ ${blueprint.trigger.description.slice(0, 35).padEnd(35)} │
├─────────────────────────────────────┤
│ ACTIONS                             │
${blueprint.actions.map(a => `│ → ${a.description.slice(0, 33).padEnd(33)} │`).join('\n')}
├─────────────────────────────────────┤
│ Status: ${blueprint.enabled ? '✓ Enabled' : '○ Disabled'}                      │
└─────────────────────────────────────┘
    `.trim();
  }

  /**
   * Help user create automation
   */
  private helpWithAutomation(_request: AIRequest): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    return this.createSuccessResult(
      `## Create an Automation\n\n` +
      `Tell me what you want to automate using natural language. Examples:\n\n` +
      `**Time-based:**\n` +
      `• "Every morning at 9am, remind me to check my tasks"\n` +
      `• "Every week, create a summary report"\n\n` +
      `**Value-based:**\n` +
      `• "When my sleep is below 6 hours, notify me"\n` +
      `• "If expenses exceed $100, send an alert"\n\n` +
      `**Event-based:**\n` +
      `• "When a task is completed, log it to analytics"\n` +
      `• "On new item creation, send a notification"\n\n` +
      `What would you like to automate?`,
      { confidence: 0.9 }
    );
  }

  canHandle(request: AIRequest): boolean {
    return this.matchesPatterns(request.prompt, [
      /automate/i,
      /automation/i,
      /when.*then/i,
      /if.*then/i,
      /every (day|week|month|morning|evening)/i,
      /remind me/i,
      /notify.*when/i,
      /trigger/i,
    ]);
  }
}

export default AutomationAgent;

