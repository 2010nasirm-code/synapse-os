/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - TOOL AGENT
 * ============================================================================
 * 
 * Provides access to app tools and data operations.
 * 
 * @module nexus/assistant-v3/agents/toolAgent
 * @version 3.0.0
 */

import { AgentResult, ActionDraft, Insight } from '../core/types';
import { RuntimeContext } from '../core/contextBuilder';
import { IntentAnalysis } from '../core/router';
import { IAgent } from '../core/coordinator';

// ============================================================================
// TOOL DEFINITIONS
// ============================================================================

interface ToolDefinition {
  name: string;
  description: string;
  execute: (params: Record<string, unknown>, context: RuntimeContext) => Promise<ToolResult>;
}

interface ToolResult {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: string;
}

// ============================================================================
// AVAILABLE TOOLS
// ============================================================================

const tools: Record<string, ToolDefinition> = {
  searchAppData: {
    name: 'searchAppData',
    description: 'Search through user data (trackers, items, notes)',
    execute: async (params, context) => {
      const query = params.query as string;
      
      // Mock search - in production would query Supabase
      const mockResults = [
        { type: 'tracker', name: 'Sleep Tracker', relevance: 0.9 },
        { type: 'tracker', name: 'Focus Timer', relevance: 0.7 },
        { type: 'item', name: 'Complete project', relevance: 0.5 },
      ];

      return {
        success: true,
        data: mockResults,
        message: `Found ${mockResults.length} results for "${query}"`,
      };
    },
  },

  queryTrackers: {
    name: 'queryTrackers',
    description: 'Get tracker data and statistics',
    execute: async (params, context) => {
      const trackerId = params.trackerId as string;
      const timeRange = params.timeRange as string || '7d';

      // Mock tracker data
      const mockData = {
        tracker: {
          id: trackerId || 'sleep',
          name: 'Sleep Tracker',
          type: 'numeric',
        },
        stats: {
          average: 7.2,
          min: 5.5,
          max: 9,
          trend: 'improving',
        },
        recentEntries: [
          { date: '2024-01-07', value: 7.5 },
          { date: '2024-01-06', value: 6.5 },
          { date: '2024-01-05', value: 8 },
        ],
      };

      return {
        success: true,
        data: mockData,
        message: `Retrieved data for ${mockData.tracker.name}`,
      };
    },
  },

  runStats: {
    name: 'runStats',
    description: 'Run statistical analysis on data',
    execute: async (params, context) => {
      const dataType = params.type as string;

      // Mock stats
      const mockStats = {
        summary: {
          totalTrackers: 5,
          totalEntries: 142,
          activeStreak: 12,
          completionRate: 0.78,
        },
        insights: [
          'Sleep quality improved 15% this week',
          'Most productive hours: 10am - 2pm',
          'Exercise correlates with better focus (+0.7)',
        ],
      };

      return {
        success: true,
        data: mockStats,
        message: 'Statistics calculated successfully',
      };
    },
  },

  generateTemplate: {
    name: 'generateTemplate',
    description: 'Generate templates for trackers, automations, etc.',
    execute: async (params, context) => {
      const type = params.type as string;
      const name = params.name as string;

      const templates: Record<string, object> = {
        tracker: {
          name: name || 'New Tracker',
          type: 'numeric',
          icon: '📊',
          goal: null,
          reminders: [],
        },
        automation: {
          name: name || 'New Automation',
          trigger: { type: 'manual' },
          actions: [],
          enabled: true,
        },
        habit: {
          name: name || 'New Habit',
          frequency: 'daily',
          targetStreak: 30,
          reminders: [{ time: '09:00', days: [1, 2, 3, 4, 5] }],
        },
      };

      const template = templates[type] || templates.tracker;

      return {
        success: true,
        data: template,
        message: `Generated ${type} template`,
      };
    },
  },

  listTrackers: {
    name: 'listTrackers',
    description: 'List all user trackers',
    execute: async (params, context) => {
      // Mock trackers
      const trackers = [
        { id: '1', name: 'Sleep', type: 'numeric', icon: '😴' },
        { id: '2', name: 'Exercise', type: 'boolean', icon: '🏃' },
        { id: '3', name: 'Focus', type: 'numeric', icon: '🎯' },
        { id: '4', name: 'Mood', type: 'scale', icon: '😊' },
        { id: '5', name: 'Water', type: 'counter', icon: '💧' },
      ];

      return {
        success: true,
        data: trackers,
        message: `Found ${trackers.length} trackers`,
      };
    },
  },
};

// ============================================================================
// TOOL SELECTOR
// ============================================================================

function selectTools(intent: IntentAnalysis, query: string): string[] {
  const selected: string[] = [];
  const lower = query.toLowerCase();

  // Always include search for relevant queries
  if (/\b(find|search|look for|where)\b/.test(lower)) {
    selected.push('searchAppData');
  }

  // Tracker queries
  if (/\b(tracker|track|habit|data|sleep|exercise|focus)\b/.test(lower)) {
    selected.push('queryTrackers');
  }

  // Statistics
  if (/\b(stats|statistics|analyze|analysis|insight|trend)\b/.test(lower)) {
    selected.push('runStats');
  }

  // Template/creation
  if (/\b(create|new|add|template|generate)\b/.test(lower)) {
    selected.push('generateTemplate');
  }

  // Listing
  if (/\b(list|show|all|view)\s*(my)?\s*(trackers?|items?|data)\b/.test(lower)) {
    selected.push('listTrackers');
  }

  // Default to search if nothing specific
  if (selected.length === 0 && intent.primary !== 'help') {
    selected.push('searchAppData');
  }

  return selected;
}

// ============================================================================
// TOOL AGENT
// ============================================================================

export class ToolAgent implements IAgent {
  id = 'tool';
  name = 'Tool Agent';
  priority = 8;
  canParallelize = true;

  async execute(context: RuntimeContext, intent: IntentAnalysis): Promise<AgentResult> {
    const startTime = Date.now();
    const results: ToolResult[] = [];
    const insights: Insight[] = [];
    const actions: ActionDraft[] = [];

    try {
      // Select tools to use
      const selectedTools = selectTools(intent, context.request.query);

      // Execute tools
      for (const toolName of selectedTools) {
        const tool = tools[toolName];
        if (!tool) continue;

        try {
          const params = this.extractParams(toolName, context.request.query, intent);
          const result = await tool.execute(params, context);
          results.push(result);

          // Extract insights from stats
          if (toolName === 'runStats' && result.success && result.data) {
            const data = result.data as { insights?: string[] };
            if (data.insights) {
              for (const insight of data.insights) {
                insights.push({
                  id: `insight-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  type: 'pattern',
                  title: 'Analysis Insight',
                  description: insight,
                  confidence: 0.75,
                });
              }
            }
          }

          // Create action for template generation
          if (toolName === 'generateTemplate' && result.success && result.data) {
            actions.push({
              id: `action-${Date.now()}`,
              type: 'create_tracker',
              payload: result.data as Record<string, unknown>,
              requiresConfirmation: true,
              previewText: `Create new ${intent.entities[0] || 'tracker'}`,
            });
          }

        } catch (error) {
          console.error(`[ToolAgent] Tool ${toolName} failed:`, error);
        }
      }

      // Format response
      const response = this.formatResponse(results, context);

      return {
        agentId: this.id,
        success: true,
        response,
        actions: actions.length > 0 ? actions : undefined,
        insights: insights.length > 0 ? insights : undefined,
        provenance: {
          agent: this.id,
          inputs: selectedTools,
          confidence: results.every(r => r.success) ? 0.9 : 0.6,
          timestamp: new Date().toISOString(),
          operation: 'tool_execution',
        },
        processingTimeMs: Date.now() - startTime,
      };

    } catch (error) {
      return {
        agentId: this.id,
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        provenance: {
          agent: this.id,
          inputs: [],
          confidence: 0,
          timestamp: new Date().toISOString(),
          operation: 'error',
        },
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  private extractParams(
    toolName: string,
    query: string,
    intent: IntentAnalysis
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {};

    // Extract based on tool
    switch (toolName) {
      case 'searchAppData':
        params.query = query;
        break;

      case 'queryTrackers':
        // Try to find tracker name
        const trackerMatch = query.match(/\b(sleep|exercise|focus|mood|water|habit)\b/i);
        if (trackerMatch) {
          params.trackerId = trackerMatch[1].toLowerCase();
        }
        // Time range
        const timeMatch = query.match(/\b(\d+)\s*(day|week|month)s?\b/i);
        if (timeMatch) {
          params.timeRange = `${timeMatch[1]}${timeMatch[2][0]}`;
        }
        break;

      case 'generateTemplate':
        // Determine type
        if (/automation/i.test(query)) {
          params.type = 'automation';
        } else if (/habit/i.test(query)) {
          params.type = 'habit';
        } else {
          params.type = 'tracker';
        }
        // Extract name
        const nameMatch = query.match(/(?:called?|named?)\s+"?([^"]+)"?/i);
        if (nameMatch) {
          params.name = nameMatch[1].trim();
        } else if (intent.entities.length > 0) {
          params.name = intent.entities[0];
        }
        break;
    }

    return params;
  }

  private formatResponse(results: ToolResult[], context: RuntimeContext): string | undefined {
    if (results.length === 0) return undefined;

    const successResults = results.filter(r => r.success);
    if (successResults.length === 0) return undefined;

    // Combine messages
    return successResults
      .map(r => r.message)
      .filter(Boolean)
      .join('\n\n');
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: ToolAgent | null = null;

export function getToolAgent(): ToolAgent {
  if (!instance) {
    instance = new ToolAgent();
  }
  return instance;
}

export default ToolAgent;

