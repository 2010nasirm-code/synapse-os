/**
 * ============================================================================
 * NEXUS PRIME - REQUEST ROUTER
 * ============================================================================
 * 
 * Routes AI requests to appropriate agents based on intent analysis.
 * Supports multi-agent execution and result synthesis.
 * 
 * @module nexus/prime/core/router
 * @version 1.0.0
 */

import {
  AIRequest,
  AIResponse,
  AgentResult,
  AgentType,
  Insight,
  ActionDraft,
  ProvenanceRecord,
} from './types';
import { AgentRegistry, INexusAgent, getRegistry } from './registry';
import { createProvenance } from './provenance';
import { isRequestAllowed, recordRequest } from './rateLimit';
import { filterUnsafeActions } from './safety';
import { Validator } from './validator';
import { buildContext } from './context';

// ============================================================================
// ROUTING CONFIGURATION
// ============================================================================

/**
 * Intent patterns for routing
 */
const INTENT_PATTERNS: Array<{
  pattern: RegExp;
  agents: AgentType[];
  priority: number;
}> = [
  // Insight-related
  { pattern: /analyze|insight|trend|pattern|anomaly|predict/i, agents: ['insight'], priority: 1 },
  { pattern: /what.*(happening|going on|trend)/i, agents: ['insight'], priority: 1 },
  
  // Building-related
  { pattern: /create|build|make|add|new/i, agents: ['builder'], priority: 2 },
  { pattern: /tracker|dashboard|layout/i, agents: ['builder'], priority: 2 },
  
  // Repair-related
  { pattern: /fix|repair|debug|error|broken|not working/i, agents: ['repair'], priority: 1 },
  { pattern: /why.*(fail|error|broken)/i, agents: ['repair'], priority: 1 },
  
  // UI-related
  { pattern: /navigate|go to|show|where|find|help/i, agents: ['ui'], priority: 1 },
  { pattern: /how do i|where is|can you show/i, agents: ['ui'], priority: 1 },
  
  // Automation-related
  { pattern: /automate|automation|trigger|when|if.*then/i, agents: ['automation'], priority: 2 },
  { pattern: /remind|notify|alert/i, agents: ['automation'], priority: 2 },
  
  // Memory-related
  { pattern: /remember|recall|forget|what did i/i, agents: ['memory'], priority: 1 },
  { pattern: /save|store|note/i, agents: ['memory'], priority: 2 },
  
  // Evolution-related
  { pattern: /improve|suggest.*feature|optimize|evolve/i, agents: ['evolution'], priority: 3 },
];

/**
 * Default agents for fallback
 */
const DEFAULT_AGENTS: AgentType[] = ['orchestrator'];

// ============================================================================
// ROUTER CLASS
// ============================================================================

export class RequestRouter {
  private static instance: RequestRouter;
  private registry: AgentRegistry;

  private constructor() {
    this.registry = getRegistry();
  }

  static getInstance(): RequestRouter {
    if (!RequestRouter.instance) {
      RequestRouter.instance = new RequestRouter();
    }
    return RequestRouter.instance;
  }

  /**
   * Route and process a request
   */
  async route(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const provenance: ProvenanceRecord[] = [];

    // Create provenance for routing
    const routeProv = createProvenance(request.id, 'orchestrator', 'route')
      .withInput({ prompt: request.prompt.slice(0, 200) });

    try {
      // Validate request
      const validation = Validator.validateAIRequest(request);
      if (!validation.valid) {
        throw new Error(`Invalid request: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // Check rate limits
      const userId = request.context?.user?.id || 'anonymous';
      const rateLimitCheck = isRequestAllowed(userId);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}. Retry after ${rateLimitCheck.retryAfter}ms`);
      }

      // Record request
      recordRequest(userId);

      // Build context
      const context = await buildContext(request);

      // Determine target agents
      const targetAgents = this.determineAgents(request);
      
      // If specific agent requested, use only that
      if (request.targetAgent) {
        targetAgents.length = 0;
        targetAgents.push(request.targetAgent);
      }

      // Execute agents
      const results = await this.executeAgents(request, context, targetAgents);
      
      // Collect provenance from results
      for (const result of results) {
        provenance.push(result.provenance);
      }

      // Synthesize results
      const response = this.synthesizeResults(request, results, startTime);
      
      routeProv.withOutput({ agentsUsed: targetAgents, success: true }).success().build();
      provenance.unshift(routeProv.build());
      response.provenance = provenance;

      return response;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      routeProv.failure(errorMessage).build();
      provenance.push(routeProv.build());

      return {
        requestId: request.id,
        answer: `I encountered an error: ${errorMessage}`,
        insights: [],
        actionDrafts: [],
        agentsUsed: [],
        provenance,
        confidence: 0,
        processingTime: Date.now() - startTime,
        warnings: [errorMessage],
      };
    }
  }

  /**
   * Determine which agents should handle the request
   */
  private determineAgents(request: AIRequest): AgentType[] {
    const matches: Array<{ agent: AgentType; priority: number }> = [];

    // Check intent patterns
    for (const { pattern, agents, priority } of INTENT_PATTERNS) {
      if (pattern.test(request.prompt)) {
        for (const agent of agents) {
          if (this.registry.has(agent)) {
            matches.push({ agent, priority });
          }
        }
      }
    }

    // Sort by priority and deduplicate
    const sorted = matches
      .sort((a, b) => a.priority - b.priority)
      .map(m => m.agent);

    const unique = [...new Set(sorted)];

    // Return matches or default
    return unique.length > 0 ? unique : DEFAULT_AGENTS;
  }

  /**
   * Execute multiple agents
   */
  private async executeAgents(
    request: AIRequest,
    context: any,
    agentIds: AgentType[]
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];

    // Execute agents in parallel where possible
    const promises = agentIds.map(async (agentId) => {
      const agent = this.registry.get(agentId);
      if (!agent) {
        return this.createErrorResult(agentId, `Agent ${agentId} not found`);
      }

      // Check rate limit for agent
      const rateLimitCheck = isRequestAllowed(context.user.id, agentId);
      if (!rateLimitCheck.allowed) {
        return this.createErrorResult(agentId, `Agent rate limit exceeded`);
      }

      try {
        recordRequest(context.user.id, agentId);
        
        // Execute with timeout
        const timeoutMs = agent.config.timeout;
        const result = await Promise.race([
          agent.process(request, context),
          this.timeout(timeoutMs, agentId),
        ]);

        return result;

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return this.createErrorResult(agentId, message);
      }
    });

    const agentResults = await Promise.all(promises);
    results.push(...agentResults);

    return results;
  }

  /**
   * Create timeout promise
   */
  private timeout(ms: number, agentId: AgentType): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Agent ${agentId} timed out after ${ms}ms`)), ms);
    });
  }

  /**
   * Create error result
   */
  private createErrorResult(agentId: AgentType, error: string): AgentResult {
    return {
      agentId,
      success: false,
      answer: '',
      insights: [],
      actionDrafts: [],
      provenance: createProvenance('', agentId, 'process').failure(error).build(),
      confidence: 0,
      processingTimeMs: 0,
      error,
    };
  }

  /**
   * Synthesize results from multiple agents
   */
  private synthesizeResults(
    request: AIRequest,
    results: AgentResult[],
    startTime: number
  ): AIResponse {
    const successfulResults = results.filter(r => r.success);
    const allInsights: Insight[] = [];
    const allActionDrafts: ActionDraft[] = [];
    const allAgents: AgentType[] = [];
    let combinedAnswer = '';
    let totalConfidence = 0;

    for (const result of successfulResults) {
      allAgents.push(result.agentId);
      allInsights.push(...result.insights);
      allActionDrafts.push(...result.actionDrafts);
      totalConfidence += result.confidence;

      if (result.answer) {
        if (combinedAnswer) {
          combinedAnswer += '\n\n';
        }
        combinedAnswer += result.answer;
      }
    }

    // Filter actions by safety
    const { safe, needsConfirmation, blocked } = filterUnsafeActions(allActionDrafts);

    // Prepare warnings
    const warnings: string[] = [];
    const failedAgents = results.filter(r => !r.success);
    if (failedAgents.length > 0) {
      warnings.push(`${failedAgents.length} agent(s) failed: ${failedAgents.map(r => r.agentId).join(', ')}`);
    }
    if (blocked.length > 0) {
      warnings.push(`${blocked.length} action(s) blocked and converted to PR drafts`);
    }

    // Calculate average confidence
    const avgConfidence = successfulResults.length > 0
      ? totalConfidence / successfulResults.length
      : 0;

    return {
      requestId: request.id,
      answer: combinedAnswer || 'No response generated',
      insights: allInsights,
      actionDrafts: [...safe, ...needsConfirmation],
      agentsUsed: allAgents,
      provenance: results.map(r => r.provenance),
      confidence: avgConfidence,
      processingTime: Date.now() - startTime,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get router instance
 */
export function getRouter(): RequestRouter {
  return RequestRouter.getInstance();
}

/**
 * Route a request
 */
export async function routeRequest(request: AIRequest): Promise<AIResponse> {
  return RequestRouter.getInstance().route(request);
}

export default RequestRouter;

