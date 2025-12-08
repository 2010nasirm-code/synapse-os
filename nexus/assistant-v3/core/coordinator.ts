/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - COORDINATOR
 * ============================================================================
 * 
 * Orchestrates multi-agent execution with parallel and sequential modes.
 * 
 * @module nexus/assistant-v3/core/coordinator
 * @version 3.0.0
 */

import {
  AIRequest,
  AIResponse,
  AgentResult,
  ResponseMessage,
  ActionDraft,
  Insight,
} from './types';
import { RuntimeContext, ContextBuilder } from './contextBuilder';
import { IntentAnalysis, analyzeIntent, selectAgents } from './router';
import { ProvenanceManager } from './provenance';
import { SafetyChecker } from './safety';

// ============================================================================
// AGENT INTERFACE
// ============================================================================

export interface IAgent {
  id: string;
  name: string;
  priority: number;
  canParallelize: boolean;
  execute: (context: RuntimeContext, intent: IntentAnalysis) => Promise<AgentResult>;
}

// ============================================================================
// EXECUTION STRATEGIES
// ============================================================================

type ExecutionStrategy = 'parallel' | 'sequential' | 'adaptive';

interface ExecutionPlan {
  strategy: ExecutionStrategy;
  phases: Array<{
    agents: string[];
    parallel: boolean;
  }>;
}

/**
 * Create execution plan based on agents and intent
 */
function createExecutionPlan(agents: IAgent[], intent: IntentAnalysis): ExecutionPlan {
  // Sort by priority
  const sorted = [...agents].sort((a, b) => b.priority - a.priority);
  
  // Group parallelizable agents
  const parallelizable = sorted.filter(a => a.canParallelize);
  const sequential = sorted.filter(a => !a.canParallelize);

  const phases: ExecutionPlan['phases'] = [];

  // Sequential agents run first (they often provide context for others)
  for (const agent of sequential) {
    phases.push({ agents: [agent.id], parallel: false });
  }

  // Parallelizable agents run together
  if (parallelizable.length > 0) {
    phases.push({ agents: parallelizable.map(a => a.id), parallel: true });
  }

  return {
    strategy: sequential.length > 0 ? 'adaptive' : 'parallel',
    phases,
  };
}

// ============================================================================
// COORDINATOR
// ============================================================================

export class Coordinator {
  private agents: Map<string, IAgent> = new Map();
  private timeout: number = 30000; // 30 second timeout per agent

  /**
   * Register an agent
   */
  registerAgent(agent: IAgent): void {
    this.agents.set(agent.id, agent);
  }

  /**
   * Get registered agents
   */
  getAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Execute a coordinated multi-agent run
   */
  async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const provenanceBuilder = ProvenanceManager.create(requestId);

    try {
      // Build context
      const context = await ContextBuilder.build(request);

      // Analyze intent
      const intent = analyzeIntent(request.query);
      provenanceBuilder.add('coordinator', [request.query], { operation: 'analyze_intent' });

      // Select agents
      const selectedAgentIds = selectAgents(intent);
      const selectedAgents = selectedAgentIds
        .map(id => this.agents.get(id))
        .filter((a): a is IAgent => a !== undefined);

      if (selectedAgents.length === 0) {
        // Use fallback reasoning if no agents selected
        const reasoningAgent = this.agents.get('reasoning');
        if (reasoningAgent) {
          selectedAgents.push(reasoningAgent);
        }
      }

      provenanceBuilder.add('coordinator', selectedAgentIds, { operation: 'select_agents' });

      // Create execution plan
      const plan = createExecutionPlan(selectedAgents, intent);
      provenanceBuilder.add('coordinator', [plan.strategy], { operation: 'create_plan' });

      // Execute plan
      const allResults: AgentResult[] = [];
      const allActions: ActionDraft[] = [];
      const allInsights: Insight[] = [];
      const agentsUsed: string[] = [];

      for (const phase of plan.phases) {
        const phaseAgents = phase.agents
          .map(id => this.agents.get(id))
          .filter((a): a is IAgent => a !== undefined);

        if (phase.parallel) {
          // Execute in parallel
          const results = await this.executeParallel(phaseAgents, context, intent);
          allResults.push(...results);
        } else {
          // Execute sequentially
          for (const agent of phaseAgents) {
            const result = await this.executeAgent(agent, context, intent);
            if (result) {
              allResults.push(result);
            }
          }
        }
      }

      // Collect all results
      for (const result of allResults) {
        agentsUsed.push(result.agentId);
        if (result.actions) allActions.push(...result.actions);
        if (result.insights) allInsights.push(...result.insights);
        provenanceBuilder.add(result.agentId, [request.query], {
          confidence: result.provenance.confidence,
          durationMs: result.processingTimeMs,
        });
      }

      // Synthesize final response
      const messages = this.synthesizeMessages(allResults, context);

      // Save provenance
      provenanceBuilder.save();

      return {
        id: requestId,
        success: true,
        messages,
        actions: allActions.length > 0 ? allActions : undefined,
        metadata: {
          processingTime: Date.now() - startTime,
          agentsUsed,
          persona: context.persona,
          skillLevel: context.skillAssessment.level,
        },
      };

    } catch (error) {
      console.error('[Coordinator] Error:', error);
      provenanceBuilder.save();

      return {
        id: requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Coordination failed',
        messages: [],
      };
    }
  }

  /**
   * Execute a single agent with timeout
   */
  private async executeAgent(
    agent: IAgent,
    context: RuntimeContext,
    intent: IntentAnalysis
  ): Promise<AgentResult | null> {
    try {
      const result = await Promise.race([
        agent.execute(context, intent),
        new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Agent timeout')), this.timeout)
        ),
      ]);
      return result;
    } catch (error) {
      console.error(`[Coordinator] Agent ${agent.id} failed:`, error);
      return {
        agentId: agent.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        provenance: {
          agent: agent.id,
          inputs: [],
          confidence: 0,
          timestamp: new Date().toISOString(),
        },
        processingTimeMs: 0,
      };
    }
  }

  /**
   * Execute multiple agents in parallel
   */
  private async executeParallel(
    agents: IAgent[],
    context: RuntimeContext,
    intent: IntentAnalysis
  ): Promise<AgentResult[]> {
    const promises = agents.map(agent => this.executeAgent(agent, context, intent));
    const results = await Promise.all(promises);
    return results.filter((r): r is AgentResult => r !== null);
  }

  /**
   * Synthesize messages from agent results
   */
  private synthesizeMessages(
    results: AgentResult[],
    context: RuntimeContext
  ): ResponseMessage[] {
    const messages: ResponseMessage[] = [];
    const successfulResults = results.filter(r => r.success && r.response);

    if (successfulResults.length === 0) {
      // Fallback message
      messages.push({
        role: 'assistant',
        text: this.getFallbackMessage(context),
        timestamp: Date.now(),
      });
      return messages;
    }

    // Combine responses intelligently
    const combined = this.combineResponses(successfulResults, context);
    
    messages.push({
      role: 'assistant',
      text: combined,
      provenance: successfulResults.map(r => r.provenance),
      timestamp: Date.now(),
    });

    return messages;
  }

  /**
   * Combine multiple agent responses
   */
  private combineResponses(results: AgentResult[], context: RuntimeContext): string {
    if (results.length === 1) {
      return results[0].response!;
    }

    // Priority: reasoning > knowledge > tool > memory > ui
    const priority = ['reasoning', 'knowledge', 'tool', 'memory', 'ui', 'planner'];
    const sorted = [...results].sort((a, b) => {
      const aIdx = priority.indexOf(a.agentId);
      const bIdx = priority.indexOf(b.agentId);
      return (aIdx === -1 ? 100 : aIdx) - (bIdx === -1 ? 100 : bIdx);
    });

    // Take primary response
    const primary = sorted[0].response!;

    // Check for supplementary information
    const supplements: string[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const response = sorted[i].response!;
      // Only include if substantially different
      if (!primary.includes(response.slice(0, Math.min(50, response.length)))) {
        supplements.push(response);
      }
    }

    if (supplements.length > 0) {
      return `${primary}\n\n---\n\n${supplements.join('\n\n')}`;
    }

    return primary;
  }

  /**
   * Get fallback message based on persona
   */
  private getFallbackMessage(context: RuntimeContext): string {
    const messages: Record<string, string> = {
      friendly: "I'm here to help! 😊 Could you tell me more about what you need?",
      teacher: "I'd be happy to help you. Could you provide a bit more detail about what you're trying to accomplish?",
      expert: "Please provide additional context for your query.",
      concise: "More details needed.",
    };
    return messages[context.persona] || messages.friendly;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let coordinatorInstance: Coordinator | null = null;

export function getCoordinator(): Coordinator {
  if (!coordinatorInstance) {
    coordinatorInstance = new Coordinator();
  }
  return coordinatorInstance;
}

export default Coordinator;

