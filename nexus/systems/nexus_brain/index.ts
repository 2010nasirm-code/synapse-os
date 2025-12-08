// ============================================================================
// NEXUS BRAIN - Main Intelligence Core Export
// ============================================================================

export * from './reasoning-router';
export * from './context-synthesizer';
export * from './pattern-miner';
export * from './insight-generator';

import { reasoningRouter, ReasoningRouter } from './reasoning-router';
import { contextSynthesizer, ContextSynthesizer, ContextSource, SynthesizedContext } from './context-synthesizer';
import { patternMiner, PatternMiner, PatternInput, DetectedPattern } from './pattern-miner';
import { insightGenerator, InsightGenerator, InsightContext } from './insight-generator';
import { ReasoningContext, ReasoningMode, MemoryItem, Insight } from '../../types';
import { generateUUID, now } from '../../utils';

export interface BrainQuery {
  query: string;
  mode?: ReasoningMode;
  context?: ContextSource[];
  memory?: MemoryItem[];
  constraints?: string[];
}

export interface BrainResponse {
  id: string;
  query: string;
  conclusion: string;
  confidence: number;
  reasoning: string[];
  insights: Insight[];
  patterns: DetectedPattern[];
  suggestions: string[];
  processingTime: number;
  timestamp: number;
}

// Main Nexus Brain class that orchestrates all components
export class NexusBrain {
  readonly router: ReasoningRouter;
  readonly synthesizer: ContextSynthesizer;
  readonly miner: PatternMiner;
  readonly generator: InsightGenerator;

  constructor() {
    this.router = reasoningRouter;
    this.synthesizer = contextSynthesizer;
    this.miner = patternMiner;
    this.generator = insightGenerator;
  }

  // ----------------------------- Main Processing ----------------------------
  async process(query: BrainQuery): Promise<BrainResponse> {
    const startTime = now();
    const responseId = generateUUID();

    // Step 1: Synthesize context
    const contextSources: ContextSource[] = query.context || [];
    
    // Add memory as context source
    if (query.memory) {
      for (const mem of query.memory) {
        contextSources.push({
          id: mem.id,
          type: 'memory',
          data: mem,
          relevance: mem.importance,
          timestamp: mem.lastAccessed,
        });
      }
    }

    const synthesized = await this.synthesizer.synthesize(query.query, contextSources);

    // Step 2: Create reasoning context
    const reasoningContext = this.synthesizer.toReasoningContext(
      synthesized,
      query.mode || 'analytical',
      query.constraints
    );

    // Step 3: Route to appropriate reasoning strategy
    const reasoningResult = await this.router.route(reasoningContext);

    // Step 4: Mine patterns from context
    const patterns = await this.miner.minePatterns({
      customData: contextSources
        .filter(s => s.type === 'history')
        .map(s => s.data as Record<string, unknown>),
    });

    // Step 5: Generate insights from patterns
    const insightContext: InsightContext = {
      patterns,
      userProfile: synthesized.userContext,
    };
    const insights = await this.generator.generateInsights(insightContext);

    // Build response
    return {
      id: responseId,
      query: query.query,
      conclusion: reasoningResult.conclusion,
      confidence: reasoningResult.confidence,
      reasoning: reasoningResult.reasoning,
      insights,
      patterns,
      suggestions: reasoningResult.suggestions || [],
      processingTime: now() - startTime,
      timestamp: now(),
    };
  }

  // ----------------------------- Quick Methods ------------------------------
  async analyze(data: unknown[]): Promise<{ patterns: DetectedPattern[]; insights: Insight[] }> {
    const patterns = await this.miner.minePatterns({
      customData: data as Record<string, unknown>[],
    });

    const insights = await this.generator.generateInsights({ patterns });

    return { patterns, insights };
  }

  async reason(query: string, mode: ReasoningMode = 'analytical'): Promise<string> {
    const result = await this.router.route({
      query,
      mode,
      memory: [],
    });
    return result.conclusion;
  }

  async synthesizeContext(
    query: string,
    sources: ContextSource[]
  ): Promise<SynthesizedContext> {
    return this.synthesizer.synthesize(query, sources);
  }

  // ----------------------------- Statistics ---------------------------------
  getStats() {
    return {
      router: this.router.getStats(),
      patterns: this.miner.getStats(),
      insights: this.generator.getStats(),
    };
  }

  // ----------------------------- Cleanup ------------------------------------
  clear() {
    this.miner.clearPatterns();
    this.generator.clearInsights();
  }
}

// Singleton instance
export const nexusBrain = new NexusBrain();
export default nexusBrain;


