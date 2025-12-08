/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - REQUEST ROUTER
 * ============================================================================
 * 
 * Routes requests to appropriate agents based on intent analysis.
 * 
 * @module nexus/assistant-v3/core/router
 * @version 3.0.0
 */

import {
  AIRequest,
  AIResponse,
  AgentResult,
  ResponseMessage,
  Provenance,
  ActionDraft,
  KnowledgeQuery,
} from './types';
import { RuntimeContext, ContextBuilder } from './contextBuilder';
import { SafetyChecker, ContentFilter } from './safety';
import { ProvenanceManager, createProvenance } from './provenance';
import { checkRateLimit, recordRequest } from './rateLimit';

// ============================================================================
// INTENT DETECTION
// ============================================================================

export type IntentType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'analyze'
  | 'automate'
  | 'help'
  | 'search'
  | 'knowledge'
  | 'general';

export interface IntentAnalysis {
  primary: IntentType;
  secondary: IntentType[];
  confidence: number;
  requiresWebSearch: boolean;
  requiresMemory: boolean;
  entities: string[];
}

const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
  create: [
    /\b(create|add|new|make|build|set up)\b/i,
    /\bstart\s+(a|an|new)\b/i,
  ],
  read: [
    /\b(show|list|display|view|get|see)\b/i,
    /\bwhat\s+(is|are)\s+my\b/i,
  ],
  update: [
    /\b(update|edit|change|modify|adjust)\b/i,
    /\bset\s+\w+\s+to\b/i,
  ],
  delete: [
    /\b(delete|remove|clear|reset)\b/i,
  ],
  analyze: [
    /\b(analyze|insight|pattern|trend|correlation)\b/i,
    /\bhow\s+(is|does|do)\s+my\b/i,
    /\baffect(ing|s)?\b/i,
  ],
  automate: [
    /\b(automate|automation|trigger|when|if\s+.+\s+then)\b/i,
    /\bremind(er)?\s+me\b/i,
    /\bnotify\s+me\b/i,
  ],
  help: [
    /\b(help|how\s+do\s+i|how\s+to|can\s+you)\b/i,
    /\bwhat\s+can\s+(you|nexus)\b/i,
  ],
  search: [
    /\b(search|find|look\s+up|look\s+for)\b/i,
    /\bwhere\s+(is|are)\b/i,
  ],
  knowledge: [
    /\b(what\s+is|who\s+is|when\s+did|why\s+does|explain)\b/i,
    /\bdefine\b/i,
    /\btell\s+me\s+about\b/i,
  ],
  general: [],
};

// Patterns that suggest web search is needed
const WEB_SEARCH_PATTERNS = [
  /\b(latest|recent|current|today|news)\b/i,
  /\b(2024|2025)\b/i,
  /\bwhat\s+(is|are)\s+(?!my\b)/i,
  /\bwho\s+(is|was)\b/i,
  /\bhow\s+to\b/i,
  /\bwhat\s+happened\b/i,
];

// Patterns for knowledge queries
const KNOWLEDGE_PATTERNS = [
  { pattern: /\bwhat\s+is\b/i, type: 'definition' as const },
  { pattern: /\bhow\s+to\b/i, type: 'howto' as const },
  { pattern: /\b(news|latest|recent)\b/i, type: 'news' as const },
  { pattern: /\b(explain|tell\s+me\s+about)\b/i, type: 'general' as const },
];

/**
 * Analyze intent from query
 */
export function analyzeIntent(query: string): IntentAnalysis {
  const intents: { type: IntentType; score: number }[] = [];
  const entities: string[] = [];

  // Check each intent pattern
  for (const [intentType, patterns] of Object.entries(INTENT_PATTERNS) as [IntentType, RegExp[]][]) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(query)) {
        score += 1;
      }
    }
    if (score > 0) {
      intents.push({ type: intentType, score });
    }
  }

  // Sort by score
  intents.sort((a, b) => b.score - a.score);

  // Default to general if no intent detected
  if (intents.length === 0) {
    intents.push({ type: 'general', score: 0.5 });
  }

  // Check if web search might be needed
  const requiresWebSearch = WEB_SEARCH_PATTERNS.some(p => p.test(query));

  // Check if this is a knowledge query
  const isKnowledge = KNOWLEDGE_PATTERNS.some(k => k.pattern.test(query));
  if (isKnowledge && intents[0].type === 'general') {
    intents[0].type = 'knowledge';
  }

  // Extract potential entities (simple extraction)
  const entityPatterns = [
    /\b(tracker|automation|item|dashboard|note|reminder)\b/gi,
    /"([^"]+)"/g,
    /my\s+(\w+)\s+(tracker|data|items?)/gi,
  ];

  for (const pattern of entityPatterns) {
    const matches = query.matchAll(pattern);
    for (const match of matches) {
      entities.push(match[1] || match[0]);
    }
  }

  return {
    primary: intents[0].type,
    secondary: intents.slice(1).map(i => i.type),
    confidence: Math.min(1, intents[0].score / 2),
    requiresWebSearch,
    requiresMemory: ['analyze', 'automate', 'read'].includes(intents[0].type),
    entities: [...new Set(entities)],
  };
}

/**
 * Determine which agents should handle the request
 */
export function selectAgents(intent: IntentAnalysis): string[] {
  const agents: string[] = [];

  // Always include reasoning for complex queries
  if (intent.confidence < 0.7 || intent.secondary.length > 0) {
    agents.push('reasoning');
  }

  // Add intent-specific agents
  switch (intent.primary) {
    case 'create':
    case 'update':
    case 'delete':
      agents.push('planner', 'tool');
      break;
    case 'read':
      agents.push('tool');
      break;
    case 'analyze':
      agents.push('reasoning', 'tool', 'memory');
      break;
    case 'automate':
      agents.push('planner', 'tool');
      break;
    case 'help':
      agents.push('ui');
      break;
    case 'search':
      agents.push('tool');
      if (intent.requiresWebSearch) {
        agents.push('knowledge');
      }
      break;
    case 'knowledge':
      agents.push('knowledge', 'reasoning');
      break;
    case 'general':
      agents.push('reasoning');
      if (intent.requiresWebSearch) {
        agents.push('knowledge');
      }
      break;
  }

  // Add memory if needed
  if (intent.requiresMemory) {
    agents.push('memory');
  }

  // Deduplicate
  return [...new Set(agents)];
}

// ============================================================================
// REQUEST ROUTER
// ============================================================================

export interface AgentExecutor {
  id: string;
  execute: (context: RuntimeContext, intent: IntentAnalysis) => Promise<AgentResult>;
}

export class RequestRouter {
  private agents: Map<string, AgentExecutor> = new Map();

  /**
   * Register an agent
   */
  registerAgent(agent: AgentExecutor): void {
    this.agents.set(agent.id, agent);
  }

  /**
   * Route and process a request
   */
  async route(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const provenanceBuilder = ProvenanceManager.create(requestId);

    try {
      // Safety check
      const safetyCheck = SafetyChecker.validateRequest(request);
      if (!safetyCheck.valid) {
        return {
          id: requestId,
          success: false,
          error: safetyCheck.reason,
          messages: [],
        };
      }

      // Handle crisis detection
      if (safetyCheck.crisisCheck?.detected) {
        return {
          id: requestId,
          success: true,
          messages: [{
            role: 'assistant',
            text: SafetyChecker.getCrisisResponse(),
            timestamp: Date.now(),
          }],
        };
      }

      // Rate limit check
      const userId = request.userId || 'anonymous';
      const rateLimitStatus = checkRateLimit(userId);
      if (!rateLimitStatus.allowed) {
        return {
          id: requestId,
          success: false,
          error: rateLimitStatus.reason,
          messages: [],
        };
      }
      recordRequest(userId);

      // Build context
      const context = await ContextBuilder.build(request);
      provenanceBuilder.add('router', ['context_built'], { operation: 'build_context' });

      // Analyze intent
      const intent = analyzeIntent(request.query);
      provenanceBuilder.add('router', [request.query], { 
        operation: 'analyze_intent',
        confidence: intent.confidence,
      });

      // Select agents
      const selectedAgents = selectAgents(intent);
      provenanceBuilder.add('router', selectedAgents, { operation: 'select_agents' });

      // Execute agents
      const results: AgentResult[] = [];
      const messages: ResponseMessage[] = [];
      const actions: ActionDraft[] = [];
      const agentsUsed: string[] = [];

      for (const agentId of selectedAgents) {
        const agent = this.agents.get(agentId);
        if (!agent) continue;

        try {
          const agentStart = Date.now();
          const result = await agent.execute(context, intent);
          const agentDuration = Date.now() - agentStart;

          results.push(result);
          agentsUsed.push(agentId);

          provenanceBuilder.add(agentId, [request.query], {
            operation: 'execute',
            confidence: result.provenance.confidence,
            durationMs: agentDuration,
          });

          if (result.response) {
            messages.push({
              role: 'agent',
              text: result.response,
              agent: agentId,
              provenance: [result.provenance],
              timestamp: Date.now(),
            });
          }

          if (result.actions) {
            actions.push(...result.actions);
          }

        } catch (error) {
          console.error(`[Router] Agent ${agentId} failed:`, error);
          provenanceBuilder.add(agentId, ['error'], { operation: 'error' });
        }
      }

      // Synthesize final response
      const finalMessage = this.synthesizeResponse(results, context);
      
      // Save provenance
      provenanceBuilder.save();

      // Sanitize response
      const sanitizedMessage = ContentFilter.sanitizeResponse(finalMessage);

      return {
        id: requestId,
        success: true,
        messages: [{
          role: 'assistant',
          text: sanitizedMessage,
          provenance: provenanceBuilder.getChain(),
          timestamp: Date.now(),
        }],
        actions: actions.length > 0 ? actions : undefined,
        metadata: {
          processingTime: Date.now() - startTime,
          agentsUsed,
          persona: context.persona,
          skillLevel: context.skillAssessment.level,
          webSearchUsed: intent.requiresWebSearch,
        },
      };

    } catch (error) {
      console.error('[Router] Error:', error);
      provenanceBuilder.add('router', ['error'], { operation: 'error' });
      provenanceBuilder.save();

      return {
        id: requestId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        messages: [],
      };
    }
  }

  /**
   * Synthesize response from multiple agent results
   */
  private synthesizeResponse(results: AgentResult[], context: RuntimeContext): string {
    // If no results, provide fallback
    if (results.length === 0) {
      return this.getFallbackResponse(context);
    }

    // Combine successful responses
    const responses = results
      .filter(r => r.success && r.response)
      .map(r => r.response!)
      .filter(Boolean);

    if (responses.length === 0) {
      return this.getFallbackResponse(context);
    }

    // For single response, return as-is
    if (responses.length === 1) {
      return responses[0];
    }

    // For multiple responses, combine intelligently
    // Take the first (usually reasoning agent) as primary
    // Add supplementary info from others
    const primary = responses[0];
    const supplementary = responses.slice(1)
      .filter(r => !primary.includes(r.slice(0, 50))) // Avoid duplicates
      .join('\n\n');

    if (supplementary) {
      return `${primary}\n\n${supplementary}`;
    }

    return primary;
  }

  /**
   * Get fallback response
   */
  private getFallbackResponse(context: RuntimeContext): string {
    const persona = context.persona;
    
    const fallbacks: Record<string, string> = {
      friendly: "I'm not quite sure how to help with that! 🤔 Could you tell me more about what you're trying to do?",
      teacher: "I'd like to help you with that. Could you provide more details about what you're looking to accomplish? That way I can give you the most helpful guidance.",
      expert: "I need additional context to provide an accurate response. Please specify your requirements or rephrase your query.",
      concise: "Need more details. What exactly do you want to do?",
    };

    return fallbacks[persona] || fallbacks.friendly;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let routerInstance: RequestRouter | null = null;

export function getRouter(): RequestRouter {
  if (!routerInstance) {
    routerInstance = new RequestRouter();
  }
  return routerInstance;
}

export default RequestRouter;

