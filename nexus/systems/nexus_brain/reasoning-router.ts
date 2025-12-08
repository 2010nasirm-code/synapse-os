// ============================================================================
// NEXUS BRAIN - Reasoning Router
// Routes queries to appropriate reasoning strategies
// ============================================================================

import { ReasoningContext, ReasoningResult, ReasoningMode, MemoryItem } from '../../types';
import { generateUUID, now } from '../../utils';
import { getConfig } from '../../config';

export interface ReasoningStrategy {
  name: string;
  mode: ReasoningMode;
  process: (context: ReasoningContext) => Promise<ReasoningResult>;
  canHandle: (context: ReasoningContext) => boolean;
  priority: number;
}

export interface RouterDecision {
  strategy: string;
  confidence: number;
  reasoning: string[];
}

export class ReasoningRouter {
  private strategies: Map<string, ReasoningStrategy> = new Map();
  private history: { query: string; strategy: string; success: boolean; timestamp: number }[] = [];

  // ----------------------------- Strategy Registration ----------------------
  registerStrategy(strategy: ReasoningStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  unregisterStrategy(name: string): boolean {
    return this.strategies.delete(name);
  }

  // ----------------------------- Query Analysis -----------------------------
  analyzeQuery(query: string): {
    intent: string;
    entities: string[];
    complexity: number;
    suggestedMode: ReasoningMode;
  } {
    const words = query.toLowerCase().split(/\s+/);
    
    // Detect intent
    let intent = 'general';
    if (words.some(w => ['why', 'how', 'explain'].includes(w))) {
      intent = 'explanation';
    } else if (words.some(w => ['create', 'make', 'build', 'generate'].includes(w))) {
      intent = 'creation';
    } else if (words.some(w => ['analyze', 'compare', 'evaluate'].includes(w))) {
      intent = 'analysis';
    } else if (words.some(w => ['find', 'search', 'locate'].includes(w))) {
      intent = 'search';
    } else if (words.some(w => ['predict', 'forecast', 'estimate'].includes(w))) {
      intent = 'prediction';
    } else if (words.some(w => ['suggest', 'recommend', 'advise'].includes(w))) {
      intent = 'recommendation';
    }

    // Extract entities (simplified)
    const entities: string[] = [];
    const entityPatterns = [
      /["']([^"']+)["']/g,  // Quoted strings
      /@(\w+)/g,           // @mentions
      /#(\w+)/g,           // #tags
    ];
    
    for (const pattern of entityPatterns) {
      let match;
      while ((match = pattern.exec(query)) !== null) {
        entities.push(match[1]);
      }
    }

    // Calculate complexity
    const complexity = Math.min(1, (
      words.length / 20 +  // Length factor
      (query.includes('and') || query.includes('or') ? 0.2 : 0) +  // Logical operators
      (query.match(/[?]/g)?.length || 0) * 0.1 +  // Questions
      entities.length * 0.1  // Entities
    ));

    // Suggest reasoning mode
    let suggestedMode: ReasoningMode = 'analytical';
    if (intent === 'creation') {
      suggestedMode = 'creative';
    } else if (intent === 'analysis' || complexity > 0.7) {
      suggestedMode = 'critical';
    } else if (intent === 'recommendation') {
      suggestedMode = 'practical';
    }

    return { intent, entities, complexity, suggestedMode };
  }

  // ----------------------------- Routing Logic ------------------------------
  selectStrategy(context: ReasoningContext): RouterDecision {
    const analysis = this.analyzeQuery(context.query);
    const candidates: { strategy: ReasoningStrategy; score: number }[] = [];

    for (const strategy of this.strategies.values()) {
      if (!strategy.canHandle(context)) continue;

      let score = 0;
      
      // Mode match
      if (strategy.mode === context.mode) {
        score += 50;
      } else if (strategy.mode === analysis.suggestedMode) {
        score += 30;
      }
      
      // Priority
      score += strategy.priority * 10;
      
      // Historical success
      const strategyHistory = this.history.filter(h => h.strategy === strategy.name);
      if (strategyHistory.length > 0) {
        const successRate = strategyHistory.filter(h => h.success).length / strategyHistory.length;
        score += successRate * 20;
      }

      candidates.push({ strategy, score });
    }

    if (candidates.length === 0) {
      // Fallback to default strategy
      const defaultStrategy = this.strategies.get('default');
      if (defaultStrategy) {
        return {
          strategy: 'default',
          confidence: 0.5,
          reasoning: ['No suitable strategy found, using default'],
        };
      }
      throw new Error('No reasoning strategy available');
    }

    // Sort by score
    candidates.sort((a, b) => b.score - a.score);
    const selected = candidates[0];
    const maxScore = 100;

    return {
      strategy: selected.strategy.name,
      confidence: Math.min(1, selected.score / maxScore),
      reasoning: [
        `Selected strategy: ${selected.strategy.name}`,
        `Query mode: ${context.mode}`,
        `Suggested mode: ${analysis.suggestedMode}`,
        `Query complexity: ${analysis.complexity.toFixed(2)}`,
        `Score: ${selected.score.toFixed(0)}`,
      ],
    };
  }

  // ----------------------------- Execution ----------------------------------
  async route(context: ReasoningContext): Promise<ReasoningResult> {
    const decision = this.selectStrategy(context);
    const strategy = this.strategies.get(decision.strategy);
    
    if (!strategy) {
      throw new Error(`Strategy not found: ${decision.strategy}`);
    }

    const startTime = now();
    let success = false;

    try {
      const result = await strategy.process(context);
      success = result.confidence > 0.3;
      
      // Add routing info to result
      result.metadata = {
        ...result.metadata,
        routingDecision: decision,
        processingTime: now() - startTime,
      };
      
      return result;
    } finally {
      // Record history
      this.history.push({
        query: context.query,
        strategy: decision.strategy,
        success,
        timestamp: now(),
      });

      // Trim history
      if (this.history.length > 1000) {
        this.history = this.history.slice(-500);
      }
    }
  }

  // ----------------------------- Multi-Strategy -----------------------------
  async routeMultiple(
    context: ReasoningContext,
    maxStrategies: number = 3
  ): Promise<ReasoningResult[]> {
    const results: ReasoningResult[] = [];
    const candidates: { strategy: ReasoningStrategy; score: number }[] = [];

    for (const strategy of this.strategies.values()) {
      if (strategy.canHandle(context)) {
        candidates.push({ strategy, score: strategy.priority });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const selected = candidates.slice(0, maxStrategies);

    await Promise.all(
      selected.map(async ({ strategy }) => {
        try {
          const result = await strategy.process(context);
          results.push(result);
        } catch (error) {
          console.error(`Strategy ${strategy.name} failed:`, error);
        }
      })
    );

    return results;
  }

  // ----------------------------- Statistics ---------------------------------
  getStats() {
    const strategyStats = new Map<string, { total: number; success: number }>();
    
    for (const entry of this.history) {
      const stats = strategyStats.get(entry.strategy) || { total: 0, success: 0 };
      stats.total++;
      if (entry.success) stats.success++;
      strategyStats.set(entry.strategy, stats);
    }

    return {
      totalQueries: this.history.length,
      strategies: this.strategies.size,
      strategyPerformance: Object.fromEntries(
        Array.from(strategyStats.entries()).map(([name, stats]) => [
          name,
          {
            total: stats.total,
            successRate: stats.total > 0 ? stats.success / stats.total : 0,
          },
        ])
      ),
    };
  }
}

// Singleton instance
export const reasoningRouter = new ReasoningRouter();

// ----------------------------- Built-in Strategies --------------------------
// Default analytical strategy
reasoningRouter.registerStrategy({
  name: 'default',
  mode: 'analytical',
  priority: 0,
  canHandle: () => true,
  process: async (context) => {
    return {
      conclusion: `Analyzed query: ${context.query}`,
      confidence: 0.5,
      reasoning: [
        'Using default analytical approach',
        `Processing query with ${context.memory.length} memory items`,
      ],
      sources: context.memory.map(m => m.id),
    };
  },
});

// Creative strategy
reasoningRouter.registerStrategy({
  name: 'creative',
  mode: 'creative',
  priority: 5,
  canHandle: (context) => context.mode === 'creative',
  process: async (context) => {
    // Simulate creative reasoning
    const ideas = [
      'Consider unconventional approaches',
      'Combine disparate concepts',
      'Challenge assumptions',
    ];
    
    return {
      conclusion: `Creative exploration of: ${context.query}`,
      confidence: 0.7,
      reasoning: ideas,
      sources: [],
      suggestions: [
        'Try brainstorming with mind maps',
        'Look for analogies in unrelated fields',
      ],
    };
  },
});

// Critical strategy
reasoningRouter.registerStrategy({
  name: 'critical',
  mode: 'critical',
  priority: 5,
  canHandle: (context) => context.mode === 'critical',
  process: async (context) => {
    return {
      conclusion: `Critical analysis of: ${context.query}`,
      confidence: 0.8,
      reasoning: [
        'Evaluating evidence quality',
        'Checking for logical fallacies',
        'Considering alternative interpretations',
      ],
      sources: context.memory.slice(0, 5).map(m => m.id),
    };
  },
});

// Practical strategy
reasoningRouter.registerStrategy({
  name: 'practical',
  mode: 'practical',
  priority: 5,
  canHandle: (context) => context.mode === 'practical',
  process: async (context) => {
    return {
      conclusion: `Practical recommendations for: ${context.query}`,
      confidence: 0.75,
      reasoning: [
        'Focusing on actionable insights',
        'Prioritizing feasibility',
        'Considering resource constraints',
      ],
      sources: [],
      suggestions: [
        'Start with the simplest solution',
        'Test assumptions early',
        'Get feedback quickly',
      ],
    };
  },
});


