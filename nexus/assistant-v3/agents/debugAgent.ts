/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - DEBUG AGENT
 * ============================================================================
 * 
 * Provides smart debug suggestions (PR drafts only, not auto-apply).
 * 
 * @module nexus/assistant-v3/agents/debugAgent
 * @version 3.0.0
 */

import { AgentResult, ActionDraft } from '../core/types';
import { RuntimeContext } from '../core/contextBuilder';
import { IntentAnalysis } from '../core/router';
import { IAgent } from '../core/coordinator';

// ============================================================================
// DEBUG PATTERNS
// ============================================================================

interface DebugPattern {
  pattern: RegExp;
  type: string;
  suggestions: string[];
  solution?: string;
}

const debugPatterns: DebugPattern[] = [
  {
    pattern: /\b(not\s+working|broken|doesn't\s+work|error)\b/i,
    type: 'general_error',
    suggestions: [
      'Check the browser console for error messages',
      'Verify your data is saved correctly',
      'Try refreshing the page',
      'Clear browser cache if issues persist',
    ],
  },
  {
    pattern: /\b(tracker\s+not|can't\s+track|tracking\s+broken)\b/i,
    type: 'tracker_issue',
    suggestions: [
      'Ensure the tracker is properly configured',
      'Check if you have permission to edit',
      'Verify the data type matches your input',
      'Try creating a new tracker to test',
    ],
    solution: 'Most tracker issues are resolved by checking the configuration settings.',
  },
  {
    pattern: /\b(automation\s+not|trigger\s+not|workflow\s+broken)\b/i,
    type: 'automation_issue',
    suggestions: [
      'Verify the trigger conditions are met',
      'Check if the automation is enabled',
      'Review the action configuration',
      'Test with a manual trigger first',
    ],
    solution: 'Automation issues often stem from misconfigured triggers or conditions.',
  },
  {
    pattern: /\b(slow|lag|performance|loading)\b/i,
    type: 'performance_issue',
    suggestions: [
      'Clear browser cache and cookies',
      'Check your internet connection',
      'Reduce the amount of data loaded at once',
      'Close unused browser tabs',
    ],
  },
  {
    pattern: /\b(login|auth|sign\s*in|password)\b/i,
    type: 'auth_issue',
    suggestions: [
      'Verify your email/password is correct',
      'Try resetting your password',
      'Clear cookies and try again',
      'Check if your account is verified',
    ],
  },
  {
    pattern: /\b(sync|cloud|data\s+lost|missing\s+data)\b/i,
    type: 'sync_issue',
    suggestions: [
      'Check your internet connection',
      'Verify you are logged into the correct account',
      'Try force-syncing from settings',
      'Wait a few minutes and refresh',
    ],
    solution: 'Data sync issues usually resolve after reconnecting or refreshing.',
  },
];

// ============================================================================
// DEBUG AGENT
// ============================================================================

export class DebugAgent implements IAgent {
  id = 'debug';
  name = 'Debug Agent';
  priority = 4;
  canParallelize = true;

  async execute(context: RuntimeContext, intent: IntentAnalysis): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const query = context.request.query;
      
      // Find matching debug pattern
      const matchedPattern = this.findPattern(query);

      if (!matchedPattern) {
        return this.generalDebugHelp(context, startTime);
      }

      // Generate debug response
      const response = this.formatDebugResponse(matchedPattern, context);

      // Create action draft for complex fixes (not auto-apply)
      const actions: ActionDraft[] = [];
      
      if (matchedPattern.type === 'tracker_issue') {
        actions.push({
          id: `action-${Date.now()}`,
          type: 'patch_code' as const,
          payload: {
            target: 'tracker_config',
            suggestion: 'Reset tracker configuration to defaults',
          },
          requiresConfirmation: true,
          previewText: 'Reset tracker configuration',
          explanation: 'This will reset your tracker settings. Your data will be preserved.',
          impact: 'medium',
        });
      }

      return {
        agentId: this.id,
        success: true,
        response,
        actions: actions.length > 0 ? actions : undefined,
        insights: [{
          id: `insight-${Date.now()}`,
          type: 'suggestion',
          title: `Debug: ${matchedPattern.type.replace(/_/g, ' ')}`,
          description: `Identified potential ${matchedPattern.type.replace(/_/g, ' ')} issue`,
          confidence: 0.75,
        }],
        provenance: {
          agent: this.id,
          inputs: [query, matchedPattern.type],
          confidence: 0.8,
          timestamp: new Date().toISOString(),
          operation: 'debug_analysis',
        },
        processingTimeMs: Date.now() - startTime,
      };

    } catch (error) {
      return {
        agentId: this.id,
        success: false,
        error: error instanceof Error ? error.message : 'Debug failed',
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

  private findPattern(query: string): DebugPattern | null {
    for (const pattern of debugPatterns) {
      if (pattern.pattern.test(query)) {
        return pattern;
      }
    }
    return null;
  }

  private formatDebugResponse(pattern: DebugPattern, context: RuntimeContext): string {
    const persona = context.persona;
    let response = '';

    if (persona === 'friendly') {
      response = `I see you're having some trouble! 🔧 Let me help you fix that.\n\n`;
    } else if (persona === 'teacher') {
      response = `Let's troubleshoot this issue together. Here's a systematic approach:\n\n`;
    } else {
      response = `Debug suggestions for ${pattern.type.replace(/_/g, ' ')}:\n\n`;
    }

    // Add suggestions
    response += '**Try these steps:**\n';
    pattern.suggestions.forEach((suggestion, i) => {
      response += `${i + 1}. ${suggestion}\n`;
    });

    // Add solution if available
    if (pattern.solution) {
      response += `\n💡 **Quick tip:** ${pattern.solution}`;
    }

    // Add persona-specific closing
    if (persona === 'friendly') {
      response += '\n\nLet me know if you need more help! 😊';
    } else if (persona === 'teacher') {
      response += '\n\nWould you like me to explain any of these steps in more detail?';
    }

    return response;
  }

  private generalDebugHelp(context: RuntimeContext, startTime: number): AgentResult {
    const response = context.persona === 'friendly'
      ? `I'd be happy to help you debug! 🔍\n\nCould you tell me more about:\n• What exactly isn't working?\n• When did it start?\n• Any error messages?\n\nThe more details, the better I can help!`
      : `To help debug your issue, please provide:\n1. Description of the problem\n2. Expected vs actual behavior\n3. Any error messages\n4. Steps to reproduce`;

    return {
      agentId: this.id,
      success: true,
      response,
      provenance: {
        agent: this.id,
        inputs: [context.request.query],
        confidence: 0.5,
        timestamp: new Date().toISOString(),
        operation: 'debug_inquiry',
      },
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: DebugAgent | null = null;

export function getDebugAgent(): DebugAgent {
  if (!instance) {
    instance = new DebugAgent();
  }
  return instance;
}

export default DebugAgent;

