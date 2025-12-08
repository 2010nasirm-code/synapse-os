/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - AGENT RUN API
 * ============================================================================
 * 
 * Run a specific agent directly.
 * 
 * @module nexus/assistant-v3/api/agentRun
 * @version 3.0.0
 */

import { AgentResult } from '../core/types';
import { ContextBuilder, RuntimeContext } from '../core/contextBuilder';
import { analyzeIntent, IntentAnalysis } from '../core/router';
import { checkRateLimit, recordRequest } from '../core/rateLimit';
import { SafetyChecker } from '../core/safety';
import { initializeAgents, getAllAgents } from '../agents';

// ============================================================================
// INITIALIZATION
// ============================================================================

let initialized = false;

function initialize(): void {
  if (initialized) return;
  initializeAgents();
  initialized = true;
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export interface AgentRunRequest {
  agentId: string;
  query: string;
  userId?: string;
  sessionId?: string;
  context?: Record<string, unknown>;
}

export interface AgentRunResponse {
  success: boolean;
  result?: AgentResult;
  error?: string;
}

export async function handleAgentRun(request: AgentRunRequest): Promise<AgentRunResponse> {
  initialize();

  try {
    // Validate
    if (!request.agentId) {
      return { success: false, error: 'Agent ID is required' };
    }

    if (!request.query) {
      return { success: false, error: 'Query is required' };
    }

    // Safety check
    const safetyCheck = SafetyChecker.validateRequest({
      query: request.query,
      userId: request.userId,
    });

    if (!safetyCheck.valid) {
      return { success: false, error: safetyCheck.reason || 'Request blocked' };
    }

    // Rate limit
    const userId = request.userId || 'anonymous';
    const rateLimitStatus = checkRateLimit(userId);
    if (!rateLimitStatus.allowed) {
      return { success: false, error: rateLimitStatus.reason || 'Rate limited' };
    }
    recordRequest(userId);

    // Find agent
    const agents = getAllAgents();
    const agent = agents.find(a => a.id === request.agentId);

    if (!agent) {
      const available = agents.map(a => a.id).join(', ');
      return { 
        success: false, 
        error: `Agent "${request.agentId}" not found. Available: ${available}` 
      };
    }

    // Build context
    const context = await ContextBuilder.build({
      query: request.query,
      userId,
      sessionId: request.sessionId,
    });

    // Analyze intent
    const intent = analyzeIntent(request.query);

    // Execute agent
    const result = await agent.execute(context, intent);

    return {
      success: true,
      result,
    };

  } catch (error) {
    console.error('[AgentRun API] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Agent execution failed',
    };
  }
}

/**
 * List available agents
 */
export function listAgents(): Array<{ id: string; name: string; priority: number }> {
  initialize();
  return getAllAgents().map(a => ({
    id: a.id,
    name: a.name,
    priority: a.priority,
  }));
}

export default handleAgentRun;

