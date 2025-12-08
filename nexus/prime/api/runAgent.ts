/**
 * ============================================================================
 * NEXUS PRIME - RUN AGENT API
 * ============================================================================
 * 
 * Run a specific agent with given parameters:
 * - Rate limited
 * - Direct agent execution
 * 
 * @module nexus/prime/api/runAgent
 * @version 1.0.0
 */

import { AIRequest, AgentResult, AgentType, SystemContext } from '../core/types';
import { getRegistry, initializeAgents } from '../agents';
import { isRequestAllowed, recordRequest } from '../core/rateLimit';
import { buildContext } from '../core/context';

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface RunAgentRequest {
  agentId: AgentType;
  prompt: string;
  userId?: string;
  context?: Partial<SystemContext>;
  options?: Record<string, unknown>;
}

export interface RunAgentResponse {
  success: boolean;
  result?: AgentResult;
  error?: string;
  processingTime: number;
}

// ============================================================================
// HANDLER
// ============================================================================

export async function handleRunAgentRequest(
  request: RunAgentRequest
): Promise<RunAgentResponse> {
  const startTime = Date.now();

  try {
    // Initialize agents
    initializeAgents();

    const userId = request.userId || 'anonymous';

    // Check rate limit (specific to agent)
    const rateLimitCheck = isRequestAllowed(userId, request.agentId);
    
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded for agent ${request.agentId}`,
        processingTime: Date.now() - startTime,
      };
    }

    // Get agent
    const registry = getRegistry();
    const agent = registry.get(request.agentId);

    if (!agent) {
      return {
        success: false,
        error: `Agent not found: ${request.agentId}`,
        processingTime: Date.now() - startTime,
      };
    }

    // Record request
    recordRequest(userId, request.agentId);

    // Build AIRequest
    const aiRequest: AIRequest = {
      id: `agent-req-${Date.now()}`,
      prompt: request.prompt,
      targetAgent: request.agentId,
      metadata: {
        userId,
        source: 'direct',
        timestamp: Date.now(),
      },
    };

    // Build context
    const context = await buildContext(aiRequest, {
      userId,
    });

    // Execute agent
    const result = await agent.process(aiRequest, context);

    return {
      success: result.success,
      result,
      processingTime: Date.now() - startTime,
    };

  } catch (error) {
    console.error('[RUN AGENT API] Error:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    };
  }
}

// ============================================================================
// BATCH HANDLER
// ============================================================================

export interface BatchAgentRequest {
  agents: Array<{
    agentId: AgentType;
    prompt: string;
  }>;
  userId?: string;
  context?: Partial<SystemContext>;
  parallel?: boolean;
}

export interface BatchAgentResponse {
  success: boolean;
  results: Array<{
    agentId: AgentType;
    result?: AgentResult;
    error?: string;
  }>;
  processingTime: number;
}

export async function handleBatchAgentRequest(
  request: BatchAgentRequest
): Promise<BatchAgentResponse> {
  const startTime = Date.now();

  try {
    initializeAgents();

    const userId = request.userId || 'anonymous';
    const registry = getRegistry();

    const executeAgent = async (agentReq: { agentId: AgentType; prompt: string }) => {
      const agent = registry.get(agentReq.agentId);
      if (!agent) {
        return { agentId: agentReq.agentId, error: `Agent not found: ${agentReq.agentId}` };
      }

      const rateLimitCheck = isRequestAllowed(userId, agentReq.agentId);
      if (!rateLimitCheck.allowed) {
        return { agentId: agentReq.agentId, error: 'Rate limit exceeded' };
      }

      recordRequest(userId, agentReq.agentId);

      const aiRequest: AIRequest = {
        id: `batch-req-${Date.now()}-${agentReq.agentId}`,
        prompt: agentReq.prompt,
        targetAgent: agentReq.agentId,
      };

      const context = await buildContext(aiRequest, { userId });

      try {
        const result = await agent.process(aiRequest, context);
        return { agentId: agentReq.agentId, result };
      } catch (error) {
        return { 
          agentId: agentReq.agentId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    };

    let results;
    if (request.parallel) {
      results = await Promise.all(request.agents.map(executeAgent));
    } else {
      results = [];
      for (const agentReq of request.agents) {
        results.push(await executeAgent(agentReq));
      }
    }

    return {
      success: results.every(r => !r.error),
      results,
      processingTime: Date.now() - startTime,
    };

  } catch (error) {
    console.error('[BATCH AGENT API] Error:', error);
    
    return {
      success: false,
      results: [],
      processingTime: Date.now() - startTime,
    };
  }
}

export default handleRunAgentRequest;

