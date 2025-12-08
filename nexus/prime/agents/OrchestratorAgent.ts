/**
 * ============================================================================
 * NEXUS PRIME - ORCHESTRATOR AGENT
 * ============================================================================
 * 
 * Central coordinator that:
 * - Takes user prompt + UI context
 * - Routes tasks to other agents
 * - Merges and ranks results
 * - Produces final, structured output
 * 
 * @module nexus/prime/agents/OrchestratorAgent
 * @version 1.0.0
 */

import { AgentConfig, AgentResult, AIRequest, SystemContext, AgentType } from '../core/types';
import { BaseAgent } from './BaseAgent';
import { getRegistry } from '../core/registry';

// ============================================================================
// ORCHESTRATOR AGENT
// ============================================================================

export class OrchestratorAgent extends BaseAgent {
  readonly config: AgentConfig = {
    id: 'orchestrator',
    name: 'Orchestrator Agent',
    description: 'Routes tasks to other agents and merges results',
    capabilities: ['routing', 'coordination', 'synthesis', 'planning'],
    rateLimit: 60,
    safetyTier: 1,
    canProduceActions: false,
    requiresContext: true,
    timeout: 30000,
  };

  /**
   * Intent classification patterns
   */
  private intentPatterns: Array<{
    pattern: RegExp;
    intent: string;
    agents: AgentType[];
  }> = [
    // Analysis & Insights
    { pattern: /analyze|insight|trend|pattern/i, intent: 'analysis', agents: ['insight'] },
    { pattern: /what.*(happening|going|trend)/i, intent: 'analysis', agents: ['insight'] },
    
    // Creation & Building
    { pattern: /create|build|make|add|new/i, intent: 'create', agents: ['builder'] },
    { pattern: /tracker|dashboard|layout/i, intent: 'create', agents: ['builder'] },
    
    // Repair & Debugging
    { pattern: /fix|repair|debug|error|broken/i, intent: 'repair', agents: ['repair'] },
    
    // Navigation & UI
    { pattern: /navigate|show|where|find|help/i, intent: 'navigate', agents: ['ui'] },
    { pattern: /how do i|where is/i, intent: 'navigate', agents: ['ui'] },
    
    // Automation
    { pattern: /automate|automation|trigger|when.*then/i, intent: 'automate', agents: ['automation'] },
    { pattern: /remind|notify|alert/i, intent: 'automate', agents: ['automation'] },
    
    // Memory
    { pattern: /remember|recall|what did i/i, intent: 'memory', agents: ['memory'] },
    
    // Evolution
    { pattern: /improve|suggest|optimize/i, intent: 'evolve', agents: ['evolution'] },
  ];

  async process(request: AIRequest, context: SystemContext): Promise<AgentResult> {
    return this.executeWithTracking(request, context, 'orchestrate', async () => {
      // Step 1: Classify intent
      const intents = this.classifyIntent(request.prompt);
      
      // Step 2: Determine agents to invoke
      const targetAgents = this.selectAgents(intents);
      
      // Step 3: If no specific agents, provide general response
      if (targetAgents.length === 0) {
        return this.createSuccessResult(
          this.generateGeneralResponse(request, context),
          { confidence: 0.7 }
        );
      }

      // Step 4: Execute selected agents
      const results = await this.executeAgents(request, context, targetAgents);
      
      // Step 5: Synthesize results
      return this.synthesizeResults(request, intents, results);
    });
  }

  /**
   * Classify the intent of the prompt
   */
  private classifyIntent(prompt: string): Array<{ intent: string; confidence: number; agents: AgentType[] }> {
    const intents: Array<{ intent: string; confidence: number; agents: AgentType[] }> = [];

    for (const { pattern, intent, agents } of this.intentPatterns) {
      if (pattern.test(prompt)) {
        intents.push({
          intent,
          confidence: 0.8,
          agents,
        });
      }
    }

    return intents;
  }

  /**
   * Select agents based on classified intents
   */
  private selectAgents(intents: Array<{ intent: string; agents: AgentType[] }>): AgentType[] {
    const registry = getRegistry();
    const selected = new Set<AgentType>();

    for (const { agents } of intents) {
      for (const agent of agents) {
        if (registry.has(agent)) {
          selected.add(agent);
        }
      }
    }

    return Array.from(selected);
  }

  /**
   * Execute selected agents
   */
  private async executeAgents(
    request: AIRequest,
    context: SystemContext,
    agentIds: AgentType[]
  ): Promise<AgentResult[]> {
    const registry = getRegistry();
    const results: AgentResult[] = [];

    // Execute in parallel
    const promises = agentIds.map(async (agentId) => {
      const agent = registry.get(agentId);
      if (!agent) return null;

      try {
        return await agent.process(request, context);
      } catch (error) {
        console.error(`[Orchestrator] Agent ${agentId} failed:`, error);
        return null;
      }
    });

    const agentResults = await Promise.all(promises);
    for (const result of agentResults) {
      if (result) results.push(result);
    }

    return results;
  }

  /**
   * Synthesize results from multiple agents
   */
  private synthesizeResults(
    request: AIRequest,
    intents: Array<{ intent: string; confidence: number }>,
    results: AgentResult[]
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      return this.createSuccessResult(
        "I wasn't able to process your request. Please try rephrasing or be more specific.",
        { confidence: 0.3 }
      );
    }

    // Merge answers
    const answers = successfulResults
      .map(r => r.answer)
      .filter(a => a.length > 0);

    let combinedAnswer: string;
    if (answers.length === 1) {
      combinedAnswer = answers[0];
    } else if (answers.length > 1) {
      combinedAnswer = this.mergeAnswers(answers, intents);
    } else {
      combinedAnswer = "I processed your request but have no specific response.";
    }

    // Collect all insights
    const allInsights = successfulResults.flatMap(r => r.insights);
    
    // Collect all action drafts
    const allActions = successfulResults.flatMap(r => r.actionDrafts);

    // Calculate combined confidence
    const avgConfidence = successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length;

    return this.createSuccessResult(combinedAnswer, {
      insights: this.rankInsights(allInsights),
      actionDrafts: this.rankActions(allActions),
      confidence: avgConfidence,
      metadata: {
        agentsUsed: successfulResults.map(r => r.agentId),
        intentsDetected: intents.map(i => i.intent),
      },
    });
  }

  /**
   * Merge multiple answers intelligently
   */
  private mergeAnswers(
    answers: string[],
    intents: Array<{ intent: string; confidence: number }>
  ): string {
    // For now, concatenate with context
    if (intents.length > 1) {
      const intentNames = intents.map(i => i.intent).join(', ');
      return `Based on your request about ${intentNames}:\n\n${answers.join('\n\n')}`;
    }
    return answers.join('\n\n');
  }

  /**
   * Rank insights by relevance
   */
  private rankInsights(insights: AgentResult['insights']): AgentResult['insights'] {
    return insights.sort((a, b) => {
      // Sort by level, then confidence
      const levelOrder = { critical: 0, warning: 1, info: 2, success: 3 };
      const levelDiff = levelOrder[a.level] - levelOrder[b.level];
      if (levelDiff !== 0) return levelDiff;
      return b.confidence - a.confidence;
    }).slice(0, 10);
  }

  /**
   * Rank actions by priority
   */
  private rankActions(actions: AgentResult['actionDrafts']): AgentResult['actionDrafts'] {
    return actions.sort((a, b) => {
      // Safe actions first, then by creation time
      const safetyOrder = { low: 0, medium: 1, high: 2 };
      const safetyDiff = safetyOrder[a.safetyLevel] - safetyOrder[b.safetyLevel];
      if (safetyDiff !== 0) return safetyDiff;
      return a.createdAt - b.createdAt;
    }).slice(0, 5);
  }

  /**
   * Generate a general response when no specific agents match
   */
  private generateGeneralResponse(request: AIRequest, context: SystemContext): string {
    const page = context.ui.currentPage;
    const hasMemories = context.memories.length > 0;

    let response = "I'm here to help! ";

    if (page !== 'unknown') {
      response += `I can see you're on the ${page} page. `;
    }

    response += "Here's what I can do:\n\n";
    response += "• **Analyze** your data for insights and trends\n";
    response += "• **Create** new trackers, dashboards, or layouts\n";
    response += "• **Automate** tasks with if/then rules\n";
    response += "• **Navigate** to any part of the app\n";
    response += "• **Remember** important information for later\n";

    if (hasMemories) {
      response += `\nI also have ${context.memories.length} memories from our previous conversations.`;
    }

    response += "\n\nWhat would you like me to help with?";

    return response;
  }

  canHandle(_request: AIRequest): boolean {
    // Orchestrator can handle any request
    return true;
  }
}

export default OrchestratorAgent;

