/**
 * ============================================================================
 * NEXUS PRIME - BUILDER AGENT
 * ============================================================================
 * 
 * Creates trackers, layouts, dashboards, flows:
 * - Interprets natural language creation requests
 * - Returns draft actions (requires confirmation)
 * - Generates structured payloads for creation
 * 
 * @module nexus/prime/agents/BuilderAgent
 * @version 1.0.0
 */

import { AgentConfig, AgentResult, AIRequest, SystemContext, ActionDraft } from '../core/types';
import { BaseAgent } from './BaseAgent';

// ============================================================================
// BUILDER TEMPLATES
// ============================================================================

interface TrackerTemplate {
  name: string;
  description: string;
  fields: Array<{
    name: string;
    type: 'text' | 'number' | 'date' | 'select' | 'boolean';
    required?: boolean;
    options?: string[];
  }>;
  icon?: string;
}

const TRACKER_TEMPLATES: Record<string, TrackerTemplate> = {
  habit: {
    name: 'Habit Tracker',
    description: 'Track daily habits and routines',
    fields: [
      { name: 'habit', type: 'text', required: true },
      { name: 'completed', type: 'boolean' },
      { name: 'date', type: 'date', required: true },
      { name: 'notes', type: 'text' },
    ],
    icon: '✓',
  },
  mood: {
    name: 'Mood Tracker',
    description: 'Track your daily mood and emotions',
    fields: [
      { name: 'mood', type: 'select', required: true, options: ['Great', 'Good', 'Okay', 'Bad', 'Terrible'] },
      { name: 'energy', type: 'number' },
      { name: 'notes', type: 'text' },
      { name: 'date', type: 'date', required: true },
    ],
    icon: '😊',
  },
  task: {
    name: 'Task Tracker',
    description: 'Track tasks and to-dos',
    fields: [
      { name: 'title', type: 'text', required: true },
      { name: 'priority', type: 'select', options: ['High', 'Medium', 'Low'] },
      { name: 'status', type: 'select', options: ['Todo', 'In Progress', 'Done'] },
      { name: 'due_date', type: 'date' },
    ],
    icon: '📋',
  },
  expense: {
    name: 'Expense Tracker',
    description: 'Track spending and expenses',
    fields: [
      { name: 'description', type: 'text', required: true },
      { name: 'amount', type: 'number', required: true },
      { name: 'category', type: 'select', options: ['Food', 'Transport', 'Entertainment', 'Bills', 'Other'] },
      { name: 'date', type: 'date', required: true },
    ],
    icon: '💰',
  },
  custom: {
    name: 'Custom Tracker',
    description: 'A blank tracker you can customize',
    fields: [
      { name: 'name', type: 'text', required: true },
      { name: 'value', type: 'text' },
      { name: 'date', type: 'date' },
    ],
    icon: '📊',
  },
};

// ============================================================================
// BUILDER AGENT
// ============================================================================

export class BuilderAgent extends BaseAgent {
  readonly config: AgentConfig = {
    id: 'builder',
    name: 'Builder Agent',
    description: 'Creates trackers, layouts, and dashboards',
    capabilities: ['create', 'design', 'structure', 'build', 'tracker', 'dashboard', 'layout'],
    rateLimit: 20,
    safetyTier: 2,
    canProduceActions: true,
    requiresContext: true,
    timeout: 25000,
  };

  async process(request: AIRequest, context: SystemContext): Promise<AgentResult> {
    return this.executeWithTracking(request, context, 'build', async () => {
      const buildType = this.determineBuildType(request.prompt);
      
      switch (buildType) {
        case 'tracker':
          return this.buildTracker(request, context);
        case 'dashboard':
          return this.buildDashboard(request, context);
        case 'layout':
          return this.buildLayout(request, context);
        default:
          return this.suggestBuildOptions(request);
      }
    });
  }

  /**
   * Determine what type of build is requested
   */
  private determineBuildType(prompt: string): 'tracker' | 'dashboard' | 'layout' | 'unknown' {
    const lower = prompt.toLowerCase();
    
    if (/tracker|track|log|record|habit|mood|task|expense/i.test(lower)) return 'tracker';
    if (/dashboard|overview|summary|stats/i.test(lower)) return 'dashboard';
    if (/layout|arrange|organize|view/i.test(lower)) return 'layout';
    
    return 'unknown';
  }

  /**
   * Build a tracker
   */
  private buildTracker(
    request: AIRequest,
    _context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const template = this.matchTrackerTemplate(request.prompt);
    const customFields = this.extractCustomFields(request.prompt);

    // Merge template with custom fields
    const trackerConfig = {
      ...template,
      fields: customFields.length > 0 ? [...template.fields, ...customFields] : template.fields,
    };

    const actionDraft = this.createActionDraft(
      'create',
      `Create ${trackerConfig.name}`,
      `A new tracker will be created: ${trackerConfig.description}`,
      {
        type: 'tracker',
        config: trackerConfig,
      },
      {
        requiresConfirmation: true,
        preview: this.generateTrackerPreview(trackerConfig),
        estimatedImpact: 'A new tracker will be added to your workspace.',
        reversible: true,
      }
    );

    return this.createSuccessResult(
      `I can create a ${trackerConfig.name} for you. Here's what it will include:\n\n` +
      `**Fields:**\n${trackerConfig.fields.map(f => `• ${f.name} (${f.type})`).join('\n')}\n\n` +
      `Click "Confirm" below to create this tracker, or tell me if you'd like any changes.`,
      {
        actionDrafts: [actionDraft],
        confidence: 0.85,
      }
    );
  }

  /**
   * Match prompt to a tracker template
   */
  private matchTrackerTemplate(prompt: string): TrackerTemplate {
    const lower = prompt.toLowerCase();
    
    if (/habit/i.test(lower)) return TRACKER_TEMPLATES.habit;
    if (/mood|emotion|feeling/i.test(lower)) return TRACKER_TEMPLATES.mood;
    if (/task|todo|to-do/i.test(lower)) return TRACKER_TEMPLATES.task;
    if (/expense|spend|money|budget/i.test(lower)) return TRACKER_TEMPLATES.expense;
    
    return TRACKER_TEMPLATES.custom;
  }

  /**
   * Extract custom fields from prompt
   */
  private extractCustomFields(prompt: string): TrackerTemplate['fields'] {
    const fields: TrackerTemplate['fields'] = [];
    
    // Look for "with X field" or "include X" patterns
    const fieldMatches = prompt.match(/(?:with|include|add|track)\s+(\w+)/gi);
    
    if (fieldMatches) {
      for (const match of fieldMatches) {
        const fieldName = match.replace(/^(?:with|include|add|track)\s+/i, '').toLowerCase();
        if (!['a', 'the', 'my', 'this'].includes(fieldName)) {
          fields.push({
            name: fieldName,
            type: this.inferFieldType(fieldName),
          });
        }
      }
    }

    return fields;
  }

  /**
   * Infer field type from name
   */
  private inferFieldType(name: string): 'text' | 'number' | 'date' | 'boolean' {
    const lower = name.toLowerCase();
    
    if (/date|time|when/i.test(lower)) return 'date';
    if (/amount|count|number|score|rating/i.test(lower)) return 'number';
    if (/done|completed|finished|yes|no/i.test(lower)) return 'boolean';
    
    return 'text';
  }

  /**
   * Generate tracker preview
   */
  private generateTrackerPreview(config: TrackerTemplate): string {
    return `
┌──────────────────────────────┐
│ ${config.icon || '📊'} ${config.name.padEnd(25)} │
├──────────────────────────────┤
${config.fields.map(f => `│ ${f.name.padEnd(15)} │ ${f.type.padEnd(10)} │`).join('\n')}
└──────────────────────────────┘
    `.trim();
  }

  /**
   * Build a dashboard
   */
  private buildDashboard(
    request: AIRequest,
    _context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const widgets = this.extractDashboardWidgets(request.prompt);

    const actionDraft = this.createActionDraft(
      'create',
      'Create Custom Dashboard',
      'A new dashboard with selected widgets',
      {
        type: 'dashboard',
        widgets,
      },
      {
        requiresConfirmation: true,
        estimatedImpact: 'A new dashboard view will be created.',
        reversible: true,
      }
    );

    return this.createSuccessResult(
      `I'll create a dashboard with the following widgets:\n\n` +
      widgets.map(w => `• ${w.type}: ${w.title}`).join('\n') +
      `\n\nConfirm to create this dashboard.`,
      {
        actionDrafts: [actionDraft],
        confidence: 0.8,
      }
    );
  }

  /**
   * Extract dashboard widgets from prompt
   */
  private extractDashboardWidgets(prompt: string): Array<{ type: string; title: string; config: Record<string, unknown> }> {
    const widgets = [];
    
    // Default widgets
    widgets.push({ type: 'stats', title: 'Quick Stats', config: {} });
    
    if (/chart|graph/i.test(prompt)) {
      widgets.push({ type: 'chart', title: 'Activity Chart', config: { chartType: 'line' } });
    }
    
    if (/recent|activity/i.test(prompt)) {
      widgets.push({ type: 'activity', title: 'Recent Activity', config: { limit: 10 } });
    }
    
    if (/insight|trend/i.test(prompt)) {
      widgets.push({ type: 'insights', title: 'Insights', config: {} });
    }

    return widgets;
  }

  /**
   * Build a layout
   */
  private buildLayout(
    request: AIRequest,
    _context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const actionDraft = this.createActionDraft(
      'create',
      'Create Custom Layout',
      'Reorganize your workspace layout',
      {
        type: 'layout',
        sections: ['header', 'main', 'sidebar'],
      },
      {
        requiresConfirmation: true,
        estimatedImpact: 'Your workspace layout will be reorganized.',
        reversible: true,
      }
    );

    return this.createSuccessResult(
      "I can help you create a custom layout. What sections would you like?\n\n" +
      "• **Sidebar** - Navigation and quick actions\n" +
      "• **Main** - Your primary content area\n" +
      "• **Panel** - Additional info or insights\n\n" +
      "Tell me your preferences or confirm to use the default layout.",
      {
        actionDrafts: [actionDraft],
        confidence: 0.75,
      }
    );
  }

  /**
   * Suggest build options when type is unclear
   */
  private suggestBuildOptions(_request: AIRequest): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    return this.createSuccessResult(
      "I can help you build:\n\n" +
      "**📊 Trackers** - Track habits, moods, tasks, expenses, or anything custom\n" +
      "**📈 Dashboards** - Overview of your data with charts and stats\n" +
      "**🎨 Layouts** - Customize how your workspace is organized\n\n" +
      "What would you like to create?",
      { confidence: 0.9 }
    );
  }

  canHandle(request: AIRequest): boolean {
    return this.matchesPatterns(request.prompt, [
      /create/i,
      /build/i,
      /make/i,
      /add.*new/i,
      /tracker/i,
      /dashboard/i,
      /layout/i,
    ]);
  }
}

export default BuilderAgent;

