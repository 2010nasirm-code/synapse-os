/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - UI AGENT
 * ============================================================================
 * 
 * Helps with navigation and UI suggestions.
 * 
 * @module nexus/assistant-v3/agents/uiAgent
 * @version 3.0.0
 */

import { AgentResult, ActionDraft } from '../core/types';
import { RuntimeContext } from '../core/contextBuilder';
import { IntentAnalysis } from '../core/router';
import { IAgent } from '../core/coordinator';

// ============================================================================
// UI KNOWLEDGE BASE
// ============================================================================

interface UIElement {
  name: string;
  path: string;
  description: string;
  keywords: string[];
}

const uiElements: UIElement[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    description: 'Your main overview with stats, charts, and quick actions',
    keywords: ['dashboard', 'home', 'overview', 'main', 'start'],
  },
  {
    name: 'Trackers',
    path: '/tracker',
    description: 'View and manage all your trackers',
    keywords: ['tracker', 'trackers', 'habits', 'tracking', 'items'],
  },
  {
    name: 'Analytics',
    path: '/analytics',
    description: 'Detailed charts and insights about your data',
    keywords: ['analytics', 'charts', 'graphs', 'statistics', 'stats', 'insights'],
  },
  {
    name: 'Automations',
    path: '/automations',
    description: 'Create and manage automated workflows',
    keywords: ['automation', 'automations', 'triggers', 'workflows', 'rules'],
  },
  {
    name: 'Suggestions',
    path: '/suggestions',
    description: 'AI-powered suggestions and recommendations',
    keywords: ['suggestion', 'suggestions', 'recommendations', 'ideas', 'tips'],
  },
  {
    name: 'Knowledge',
    path: '/knowledge',
    description: 'Your knowledge graph and connections',
    keywords: ['knowledge', 'graph', 'connections', 'network', 'thought'],
  },
  {
    name: 'Settings',
    path: '/settings',
    description: 'Configure your app preferences',
    keywords: ['settings', 'preferences', 'options', 'config', 'configure'],
  },
  {
    name: 'Profile',
    path: '/profile',
    description: 'Your account and profile settings',
    keywords: ['profile', 'account', 'user', 'me', 'my account'],
  },
  {
    name: 'Nexus Prime',
    path: '/prime',
    description: 'Advanced AI assistant interface',
    keywords: ['prime', 'nexus', 'ai', 'assistant', 'chat'],
  },
  {
    name: 'Agents',
    path: '/agents',
    description: 'Manage and configure AI agents',
    keywords: ['agent', 'agents', 'ai agents', 'bots'],
  },
];

// ============================================================================
// HELP CONTENT
// ============================================================================

const helpTopics: Record<string, string> = {
  trackers: `**Trackers** help you monitor habits, goals, and data over time.

• **Create a tracker**: Click "+ New Tracker" or say "create a tracker"
• **Log data**: Click on a tracker to add entries
• **View history**: See your progress in charts and graphs
• **Set goals**: Define targets to work towards`,

  automations: `**Automations** run actions automatically based on triggers.

• **Triggers**: When something happens (item created, time, schedule)
• **Conditions**: Optional filters to narrow when it runs
• **Actions**: What to do (notify, update, create)

Example: "When I complete a workout, add to my streak"`,

  analytics: `**Analytics** shows insights about your tracked data.

• **Trends**: See how metrics change over time
• **Correlations**: Discover connections between trackers
• **Patterns**: Find your best and worst performing periods
• **Predictions**: AI-powered forecasts based on your data`,

  general: `I can help you with:

• **Track** - Monitor habits, goals, and data
• **Analyze** - Understand patterns and trends
• **Automate** - Set up automatic workflows
• **Search** - Find information and answers
• **Plan** - Break down goals into steps

Just ask me anything!`,
};

// ============================================================================
// UI AGENT
// ============================================================================

export class UIAgent implements IAgent {
  id = 'ui';
  name = 'UI Agent';
  priority = 6;
  canParallelize = true;

  async execute(context: RuntimeContext, intent: IntentAnalysis): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const query = context.request.query.toLowerCase();

      // Check for navigation request
      if (/\b(go\s+to|navigate|show\s+me|open|where\s+is)\b/.test(query)) {
        return this.handleNavigation(context, query, startTime);
      }

      // Check for help request
      if (/\b(help|how\s+do\s+i|what\s+can|features?|guide)\b/.test(query)) {
        return this.handleHelp(context, query, startTime);
      }

      // Check for UI-specific questions
      if (/\b(button|menu|sidebar|panel|screen|page)\b/.test(query)) {
        return this.handleUIQuestion(context, query, startTime);
      }

      // Default: provide general help
      return this.handleHelp(context, 'general', startTime);

    } catch (error) {
      return {
        agentId: this.id,
        success: false,
        error: error instanceof Error ? error.message : 'UI operation failed',
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

  private handleNavigation(
    context: RuntimeContext,
    query: string,
    startTime: number
  ): AgentResult {
    // Find matching UI element
    const matches = uiElements.filter(el =>
      el.keywords.some(kw => query.includes(kw))
    );

    if (matches.length === 0) {
      const response = context.persona === 'friendly'
        ? "I'm not sure which page you're looking for. Here are the main areas:\n\n" +
          uiElements.slice(0, 5).map(el => `• **${el.name}** - ${el.description}`).join('\n')
        : "Available pages:\n" +
          uiElements.map(el => `• ${el.name}: ${el.path}`).join('\n');

      return {
        agentId: this.id,
        success: true,
        response,
        provenance: {
          agent: this.id,
          inputs: [query],
          confidence: 0.6,
          timestamp: new Date().toISOString(),
          operation: 'navigation_help',
        },
        processingTimeMs: Date.now() - startTime,
      };
    }

    const target = matches[0];
    const response = context.persona === 'friendly'
      ? `Taking you to **${target.name}**! 🚀\n\n${target.description}`
      : `Navigating to ${target.name} (${target.path})`;

    return {
      agentId: this.id,
      success: true,
      response,
      actions: [{
        id: `action-${Date.now()}`,
        type: 'navigate',
        payload: { path: target.path },
        requiresConfirmation: false,
        previewText: `Go to ${target.name}`,
      }],
      provenance: {
        agent: this.id,
        inputs: [query, target.path],
        confidence: 0.9,
        timestamp: new Date().toISOString(),
        operation: 'navigation',
      },
      processingTimeMs: Date.now() - startTime,
    };
  }

  private handleHelp(
    context: RuntimeContext,
    query: string,
    startTime: number
  ): AgentResult {
    // Determine help topic
    let topic = 'general';
    if (query.includes('tracker') || query.includes('habit')) topic = 'trackers';
    else if (query.includes('automation') || query.includes('trigger')) topic = 'automations';
    else if (query.includes('analytic') || query.includes('insight')) topic = 'analytics';

    const content = helpTopics[topic] || helpTopics.general;

    let response = content;
    if (context.persona === 'friendly' && topic === 'general') {
      response = "Happy to help! 😊\n\n" + content;
    }

    return {
      agentId: this.id,
      success: true,
      response,
      provenance: {
        agent: this.id,
        inputs: [query, topic],
        confidence: 0.85,
        timestamp: new Date().toISOString(),
        operation: 'help',
      },
      processingTimeMs: Date.now() - startTime,
    };
  }

  private handleUIQuestion(
    context: RuntimeContext,
    query: string,
    startTime: number
  ): AgentResult {
    // Provide UI guidance
    let response: string;

    if (query.includes('sidebar')) {
      response = 'The **sidebar** on the left shows all main sections. Click any icon to navigate there. On mobile, tap the menu icon to show it.';
    } else if (query.includes('button')) {
      response = 'Most action buttons are in the top-right of each page. Look for "+" icons to add new items, or "⚡" for quick actions.';
    } else {
      response = 'The app has a **sidebar** for navigation, a **main content area** for your data, and **action buttons** for common tasks. What specific element do you need help with?';
    }

    if (context.persona === 'friendly') {
      response += ' 🎨';
    }

    return {
      agentId: this.id,
      success: true,
      response,
      provenance: {
        agent: this.id,
        inputs: [query],
        confidence: 0.75,
        timestamp: new Date().toISOString(),
        operation: 'ui_guidance',
      },
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: UIAgent | null = null;

export function getUIAgent(): UIAgent {
  if (!instance) {
    instance = new UIAgent();
  }
  return instance;
}

export default UIAgent;

