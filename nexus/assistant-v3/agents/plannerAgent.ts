/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - PLANNER AGENT
 * ============================================================================
 * 
 * Multi-step planning and task decomposition.
 * 
 * @module nexus/assistant-v3/agents/plannerAgent
 * @version 3.0.0
 */

import { AgentResult, ActionDraft, Insight } from '../core/types';
import { RuntimeContext } from '../core/contextBuilder';
import { IntentAnalysis } from '../core/router';
import { IAgent } from '../core/coordinator';
import { formatAsSteps } from './personaRouter';

// ============================================================================
// PLAN TEMPLATES
// ============================================================================

interface PlanTemplate {
  name: string;
  trigger: RegExp;
  steps: string[];
  actions?: Partial<ActionDraft>[];
}

const planTemplates: PlanTemplate[] = [
  {
    name: 'Create Tracker',
    trigger: /\b(create|add|new)\s+(a\s+)?tracker\b/i,
    steps: [
      'Choose a name for your tracker',
      'Select the type (number, checkbox, scale, etc.)',
      'Set an optional daily goal',
      'Configure reminders if needed',
      'Start tracking!',
    ],
    actions: [
      {
        type: 'create_tracker',
        previewText: 'Create new tracker',
        requiresConfirmation: true,
      },
    ],
  },
  {
    name: 'Create Automation',
    trigger: /\b(create|add|new|set\s+up)\s+(a\s+)?(automation|trigger)\b/i,
    steps: [
      'Define the trigger condition (when should it run?)',
      'Choose the action to perform',
      'Set any additional conditions or filters',
      'Test the automation',
      'Enable and save',
    ],
    actions: [
      {
        type: 'create_automation',
        previewText: 'Create new automation',
        requiresConfirmation: true,
      },
    ],
  },
  {
    name: 'Improve Sleep',
    trigger: /\b(improve|better|fix)\s+(my\s+)?sleep\b/i,
    steps: [
      'Track your sleep consistently for at least a week',
      'Identify patterns - when do you sleep best?',
      'Set a consistent bedtime and wake time',
      'Create a wind-down routine tracker',
      'Set up automation: remind me 30 min before bedtime',
    ],
    actions: [
      {
        type: 'create_tracker',
        payload: { name: 'Sleep Quality', type: 'scale' },
        previewText: 'Create Sleep Quality tracker',
        requiresConfirmation: true,
      },
      {
        type: 'create_automation',
        payload: { name: 'Bedtime Reminder', trigger: { type: 'schedule' } },
        previewText: 'Set up bedtime reminder',
        requiresConfirmation: true,
      },
    ],
  },
  {
    name: 'Build Habit',
    trigger: /\b(build|start|create)\s+(a\s+)?(new\s+)?habit\b/i,
    steps: [
      'Define your habit clearly and specifically',
      'Start small - make it easy to do',
      'Link it to an existing routine (habit stacking)',
      'Track it daily to build accountability',
      'Celebrate small wins along the way',
    ],
    actions: [
      {
        type: 'create_tracker',
        payload: { type: 'boolean' },
        previewText: 'Create habit tracker',
        requiresConfirmation: true,
      },
    ],
  },
  {
    name: 'Analyze Data',
    trigger: /\b(analyze|understand|see)\s+(my\s+)?(data|patterns|trends)\b/i,
    steps: [
      'Select the data range to analyze',
      'Review overall trends and averages',
      'Look for correlations between trackers',
      'Identify best and worst performing periods',
      'Generate actionable insights',
    ],
  },
  {
    name: 'Set Goal',
    trigger: /\b(set|create|new)\s+(a\s+)?goal\b/i,
    steps: [
      'Define your goal using SMART criteria',
      'Break it down into milestones',
      'Create trackers for key metrics',
      'Set up regular check-ins',
      'Plan rewards for milestones',
    ],
    actions: [
      {
        type: 'create_item',
        previewText: 'Create goal',
        requiresConfirmation: true,
      },
    ],
  },
];

// ============================================================================
// PLANNER AGENT
// ============================================================================

export class PlannerAgent implements IAgent {
  id = 'planner';
  name = 'Planner Agent';
  priority = 7;
  canParallelize = true;

  async execute(context: RuntimeContext, intent: IntentAnalysis): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const query = context.request.query;
      
      // Find matching plan template
      const plan = this.findPlan(query);
      
      if (!plan) {
        // Generate generic plan
        return this.generateGenericPlan(context, intent, startTime);
      }

      // Format steps according to persona
      const formattedSteps = formatAsSteps(plan.steps, context.persona);

      // Build response
      let response = `Here's a plan to **${plan.name.toLowerCase()}**:\n\n${formattedSteps}`;

      // Add persona-specific touches
      if (context.persona === 'friendly') {
        response += '\n\nI can help you with any of these steps! Just let me know 😊';
      } else if (context.persona === 'teacher') {
        response += '\n\nWould you like me to explain any of these steps in more detail?';
      }

      // Build actions
      const actions: ActionDraft[] = (plan.actions || []).map((a, i) => ({
        id: `action-${Date.now()}-${i}`,
        type: a.type || 'create_item',
        payload: a.payload || {},
        requiresConfirmation: a.requiresConfirmation ?? true,
        previewText: a.previewText,
      }));

      return {
        agentId: this.id,
        success: true,
        response,
        actions: actions.length > 0 ? actions : undefined,
        insights: [{
          id: `insight-${Date.now()}`,
          type: 'suggestion',
          title: `Plan: ${plan.name}`,
          description: `${plan.steps.length}-step plan generated`,
          confidence: 0.85,
        }],
        provenance: {
          agent: this.id,
          inputs: [query],
          confidence: 0.85,
          timestamp: new Date().toISOString(),
          operation: 'plan_generation',
        },
        processingTimeMs: Date.now() - startTime,
      };

    } catch (error) {
      return {
        agentId: this.id,
        success: false,
        error: error instanceof Error ? error.message : 'Planning failed',
        provenance: {
          agent: this.id,
          inputs: [context.request.query],
          confidence: 0,
          timestamp: new Date().toISOString(),
          operation: 'error',
        },
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  private findPlan(query: string): PlanTemplate | null {
    for (const template of planTemplates) {
      if (template.trigger.test(query)) {
        return template;
      }
    }
    return null;
  }

  private generateGenericPlan(
    context: RuntimeContext,
    intent: IntentAnalysis,
    startTime: number
  ): AgentResult {
    // Generate a generic task-based plan
    const steps = [
      'Clarify your objective',
      'Identify key requirements',
      'Break down into smaller tasks',
      'Set timeline and milestones',
      'Execute and track progress',
    ];

    const formattedSteps = formatAsSteps(steps, context.persona);
    let response = `Here's a general approach:\n\n${formattedSteps}`;

    if (context.persona === 'friendly') {
      response += '\n\nTell me more about what you want to accomplish, and I can create a more specific plan! 🎯';
    }

    return {
      agentId: this.id,
      success: true,
      response,
      provenance: {
        agent: this.id,
        inputs: [context.request.query],
        confidence: 0.6,
        timestamp: new Date().toISOString(),
        operation: 'generic_plan',
      },
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: PlannerAgent | null = null;

export function getPlannerAgent(): PlannerAgent {
  if (!instance) {
    instance = new PlannerAgent();
  }
  return instance;
}

export default PlannerAgent;

