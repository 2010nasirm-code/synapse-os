/**
 * ============================================================================
 * NEXUS PRIME - UI AGENT
 * ============================================================================
 * 
 * Helps navigate and interact with the app:
 * - Navigation suggestions
 * - UI element suggestions
 * - Component recommendations (text-only)
 * 
 * @module nexus/prime/agents/UIAgent
 * @version 1.0.0
 */

import { AgentConfig, AgentResult, AIRequest, SystemContext } from '../core/types';
import { BaseAgent } from './BaseAgent';

// ============================================================================
// APP ROUTES
// ============================================================================

const APP_ROUTES: Record<string, { path: string; description: string; keywords: string[] }> = {
  dashboard: {
    path: '/dashboard',
    description: 'Main dashboard with overview and stats',
    keywords: ['home', 'main', 'overview', 'dashboard', 'start'],
  },
  tracker: {
    path: '/tracker',
    description: 'View and manage your tracked items',
    keywords: ['tracker', 'items', 'list', 'track', 'data'],
  },
  suggestions: {
    path: '/suggestions',
    description: 'AI-generated suggestions and recommendations',
    keywords: ['suggestions', 'recommend', 'ideas', 'ai'],
  },
  automations: {
    path: '/automations',
    description: 'Manage automation rules and triggers',
    keywords: ['automations', 'rules', 'triggers', 'auto'],
  },
  analytics: {
    path: '/analytics',
    description: 'Charts, trends, and data analysis',
    keywords: ['analytics', 'charts', 'graphs', 'stats', 'trends'],
  },
  knowledge: {
    path: '/knowledge',
    description: 'Knowledge graph and connections',
    keywords: ['knowledge', 'graph', 'connections', 'nodes'],
  },
  settings: {
    path: '/settings',
    description: 'App settings and preferences',
    keywords: ['settings', 'preferences', 'config', 'options'],
  },
  profile: {
    path: '/profile',
    description: 'Your profile and account',
    keywords: ['profile', 'account', 'me', 'user'],
  },
  nexus: {
    path: '/nexus',
    description: 'Nexus AI system and commands',
    keywords: ['nexus', 'ai', 'assistant', 'help'],
  },
};

// ============================================================================
// UI AGENT
// ============================================================================

export class UIAgent extends BaseAgent {
  readonly config: AgentConfig = {
    id: 'ui',
    name: 'UI Agent',
    description: 'Helps navigate and interact with the app',
    capabilities: ['navigation', 'suggestions', 'components', 'help', 'find', 'where'],
    rateLimit: 100,
    safetyTier: 1,
    canProduceActions: true,
    requiresContext: true,
    timeout: 10000,
  };

  async process(request: AIRequest, context: SystemContext): Promise<AgentResult> {
    return this.executeWithTracking(request, context, 'ui-assist', async () => {
      const assistType = this.determineAssistType(request.prompt);
      
      switch (assistType) {
        case 'navigate':
          return this.handleNavigation(request, context);
        case 'find':
          return this.handleFind(request, context);
        case 'how':
          return this.handleHowTo(request, context);
        case 'suggest':
          return this.suggestUIActions(request, context);
        default:
          return this.provideGeneralHelp(context);
      }
    });
  }

  /**
   * Determine the type of UI assistance needed
   */
  private determineAssistType(prompt: string): 'navigate' | 'find' | 'how' | 'suggest' | 'general' {
    const lower = prompt.toLowerCase();
    
    if (/go to|navigate|take me|open|show me/i.test(lower)) return 'navigate';
    if (/where is|find|locate|search/i.test(lower)) return 'find';
    if (/how do i|how to|how can i/i.test(lower)) return 'how';
    if (/suggest|recommend|what should/i.test(lower)) return 'suggest';
    
    return 'general';
  }

  /**
   * Handle navigation requests
   */
  private handleNavigation(
    request: AIRequest,
    context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const targetRoute = this.findMatchingRoute(request.prompt);

    if (targetRoute) {
      const actionDraft = this.createActionDraft(
        'navigate',
        `Go to ${targetRoute.path}`,
        targetRoute.description,
        { path: targetRoute.path },
        { requiresConfirmation: false }
      );

      return this.createSuccessResult(
        `I'll take you to **${targetRoute.path}**.\n\n${targetRoute.description}`,
        {
          actionDrafts: [actionDraft],
          confidence: 0.95,
        }
      );
    }

    // No match found - suggest options
    return this.createSuccessResult(
      `I'm not sure where you want to go. Here are the available sections:\n\n` +
      Object.entries(APP_ROUTES)
        .map(([name, info]) => `• **${name}** (${info.path}) - ${info.description}`)
        .join('\n'),
      { confidence: 0.7 }
    );
  }

  /**
   * Find a matching route
   */
  private findMatchingRoute(prompt: string): { path: string; description: string } | null {
    const lower = prompt.toLowerCase();
    
    for (const [_name, info] of Object.entries(APP_ROUTES)) {
      for (const keyword of info.keywords) {
        if (lower.includes(keyword)) {
          return info;
        }
      }
    }
    
    return null;
  }

  /**
   * Handle find requests
   */
  private handleFind(
    request: AIRequest,
    context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const searchTerm = this.extractSearchTerm(request.prompt);
    
    // Check routes
    const matchingRoutes = Object.entries(APP_ROUTES)
      .filter(([name, info]) => 
        name.includes(searchTerm) || 
        info.keywords.some(k => k.includes(searchTerm))
      );

    if (matchingRoutes.length > 0) {
      return this.createSuccessResult(
        `I found these sections matching "${searchTerm}":\n\n` +
        matchingRoutes.map(([name, info]) => 
          `• **${name}** (${info.path}) - ${info.description}`
        ).join('\n'),
        { confidence: 0.85 }
      );
    }

    // Check context for relevant data
    const currentPage = context.ui.currentPage;
    
    return this.createSuccessResult(
      `I couldn't find "${searchTerm}" in the available sections.\n\n` +
      `You're currently on **${currentPage}**. Try:\n` +
      `• Using the search bar at the top\n` +
      `• Checking the sidebar navigation\n` +
      `• Asking me to go to a specific section`,
      { confidence: 0.6 }
    );
  }

  /**
   * Extract search term from prompt
   */
  private extractSearchTerm(prompt: string): string {
    // Remove common words
    return prompt
      .toLowerCase()
      .replace(/where is|find|locate|search|the|for|a|an/gi, '')
      .trim()
      .split(/\s+/)[0] || '';
  }

  /**
   * Handle "how to" requests
   */
  private handleHowTo(
    request: AIRequest,
    _context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const lower = request.prompt.toLowerCase();
    
    // Common "how to" patterns
    if (/add|create|new/i.test(lower)) {
      return this.createSuccessResult(
        `## How to Add/Create Items\n\n` +
        `1. Go to the relevant section (Tracker, Automations, etc.)\n` +
        `2. Look for the **+ Add** or **Create** button\n` +
        `3. Fill in the required fields\n` +
        `4. Click **Save** to confirm\n\n` +
        `Or just tell me what you want to create and I'll help!`,
        { confidence: 0.85 }
      );
    }

    if (/delete|remove/i.test(lower)) {
      return this.createSuccessResult(
        `## How to Delete/Remove Items\n\n` +
        `1. Navigate to the item you want to delete\n` +
        `2. Click the **...** menu or trash icon\n` +
        `3. Select **Delete**\n` +
        `4. Confirm the deletion\n\n` +
        `_Note: Some deletions may be permanent._`,
        { confidence: 0.85 }
      );
    }

    if (/automate|automation/i.test(lower)) {
      return this.createSuccessResult(
        `## How to Create Automations\n\n` +
        `1. Go to **Automations** in the sidebar\n` +
        `2. Click **Create Automation**\n` +
        `3. Set a **Trigger** (when something happens)\n` +
        `4. Define **Actions** (what should happen)\n` +
        `5. Save and enable the automation\n\n` +
        `Or describe what you want automated and I'll create it for you!`,
        { confidence: 0.85 }
      );
    }

    return this.createSuccessResult(
      `I'd be happy to help! What specifically would you like to know how to do?\n\n` +
      `Common tasks:\n` +
      `• How to add items\n` +
      `• How to create automations\n` +
      `• How to view analytics\n` +
      `• How to customize settings`,
      { confidence: 0.7 }
    );
  }

  /**
   * Suggest UI actions
   */
  private suggestUIActions(
    _request: AIRequest,
    context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const currentPage = context.ui.currentPage;
    const suggestions: string[] = [];

    // Context-aware suggestions
    switch (currentPage) {
      case 'dashboard':
        suggestions.push(
          'View your analytics for deeper insights',
          'Check your pending automations',
          'Review recent AI suggestions',
        );
        break;
      case 'tracker':
        suggestions.push(
          'Create a new tracker for a different data type',
          'Export your data to CSV',
          'Set up an automation for this tracker',
        );
        break;
      default:
        suggestions.push(
          'Explore the dashboard for an overview',
          'Check out the knowledge graph',
          'Review your settings',
        );
    }

    const actionDrafts = suggestions.map(suggestion =>
      this.createActionDraft(
        'suggest',
        suggestion,
        'Suggested action based on your current context',
        { suggestion },
        { requiresConfirmation: false }
      )
    );

    return this.createSuccessResult(
      `Based on your current context (${currentPage}), here are some suggestions:\n\n` +
      suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n'),
      {
        actionDrafts,
        confidence: 0.75,
      }
    );
  }

  /**
   * Provide general help
   */
  private provideGeneralHelp(context: SystemContext): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const currentPage = context.ui.currentPage;

    return this.createSuccessResult(
      `## App Navigation Help\n\n` +
      `You're currently on **${currentPage}**.\n\n` +
      `### Quick Navigation\n` +
      `• Say "go to [section]" to navigate\n` +
      `• Say "find [item]" to search\n` +
      `• Say "how do I [action]" for instructions\n\n` +
      `### Available Sections\n` +
      Object.entries(APP_ROUTES)
        .map(([name, info]) => `• **${name}** - ${info.description}`)
        .join('\n'),
      { confidence: 0.9 }
    );
  }

  canHandle(request: AIRequest): boolean {
    return this.matchesPatterns(request.prompt, [
      /go to/i,
      /navigate/i,
      /where is/i,
      /find/i,
      /how do i/i,
      /show me/i,
      /help/i,
    ]);
  }
}

export default UIAgent;

