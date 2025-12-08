// ============================================================================
// NEXUS BRAIN - Context Synthesizer
// Combines information from multiple sources into coherent context
// ============================================================================

import { MemoryItem, UserProfile, ReasoningContext, ReasoningMode } from '../../types';
import { generateUUID, now, average } from '../../utils';
import { getConfig } from '../../config';

export interface ContextSource {
  id: string;
  type: 'memory' | 'user' | 'history' | 'external' | 'realtime';
  data: unknown;
  relevance: number;
  timestamp: number;
}

export interface SynthesizedContext {
  id: string;
  query: string;
  sources: ContextSource[];
  summary: string;
  relevantMemories: MemoryItem[];
  userContext?: UserProfile;
  temporalContext: {
    timeOfDay: string;
    dayOfWeek: string;
    recentActivity: string[];
  };
  semanticContext: {
    topics: string[];
    entities: string[];
    sentiment: number;
  };
  confidence: number;
  createdAt: number;
}

export interface SynthesizerOptions {
  maxSources?: number;
  maxMemories?: number;
  minRelevance?: number;
  includeUserProfile?: boolean;
  includeTemporalContext?: boolean;
  includeSemanticAnalysis?: boolean;
}

export class ContextSynthesizer {
  private defaultOptions: Required<SynthesizerOptions> = {
    maxSources: 20,
    maxMemories: 10,
    minRelevance: 0.3,
    includeUserProfile: true,
    includeTemporalContext: true,
    includeSemanticAnalysis: true,
  };

  // ----------------------------- Main Synthesis -----------------------------
  async synthesize(
    query: string,
    sources: ContextSource[],
    options: SynthesizerOptions = {}
  ): Promise<SynthesizedContext> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Filter and sort sources by relevance
    const filteredSources = sources
      .filter(s => s.relevance >= opts.minRelevance)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, opts.maxSources);

    // Extract memories
    const memories = this.extractMemories(filteredSources, opts.maxMemories);

    // Build context components
    const temporalContext = opts.includeTemporalContext 
      ? this.buildTemporalContext(filteredSources)
      : { timeOfDay: '', dayOfWeek: '', recentActivity: [] };

    const semanticContext = opts.includeSemanticAnalysis
      ? this.analyzeSemantics(query, filteredSources)
      : { topics: [], entities: [], sentiment: 0 };

    // Extract user profile if present
    const userContext = opts.includeUserProfile
      ? this.extractUserProfile(filteredSources)
      : undefined;

    // Generate summary
    const summary = this.generateSummary(query, filteredSources, memories);

    // Calculate overall confidence
    const confidence = this.calculateConfidence(filteredSources);

    return {
      id: generateUUID(),
      query,
      sources: filteredSources,
      summary,
      relevantMemories: memories,
      userContext,
      temporalContext,
      semanticContext,
      confidence,
      createdAt: now(),
    };
  }

  // ----------------------------- Memory Extraction --------------------------
  private extractMemories(sources: ContextSource[], maxCount: number): MemoryItem[] {
    const memories: MemoryItem[] = [];
    
    for (const source of sources) {
      if (source.type === 'memory' && source.data) {
        memories.push(source.data as MemoryItem);
      }
    }

    return memories
      .sort((a, b) => b.importance - a.importance)
      .slice(0, maxCount);
  }

  // ----------------------------- Temporal Context ---------------------------
  private buildTemporalContext(sources: ContextSource[]): SynthesizedContext['temporalContext'] {
    const now = new Date();
    const hour = now.getHours();
    
    let timeOfDay = 'night';
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[now.getDay()];

    // Extract recent activities from history sources
    const recentActivity: string[] = [];
    for (const source of sources) {
      if (source.type === 'history' && Array.isArray(source.data)) {
        recentActivity.push(...(source.data as string[]).slice(0, 5));
      }
    }

    return { timeOfDay, dayOfWeek, recentActivity: recentActivity.slice(0, 10) };
  }

  // ----------------------------- Semantic Analysis --------------------------
  private analyzeSemantics(
    query: string,
    sources: ContextSource[]
  ): SynthesizedContext['semanticContext'] {
    // Extract topics from query and sources
    const topics = this.extractTopics(query);
    
    // Extract entities
    const entities = this.extractEntities(query);
    
    // Analyze sentiment (simplified)
    const sentiment = this.analyzeSentiment(query);

    return { topics, entities, sentiment };
  }

  private extractTopics(text: string): string[] {
    // Simple keyword extraction
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of', 'in', 'for', 'on',
      'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'and',
      'but', 'if', 'or', 'because', 'until', 'while', 'this', 'that', 'these', 'those',
      'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she',
      'her', 'it', 'its', 'they', 'them', 'their', 'what', 'which', 'who', 'whom',
      'how', 'when', 'where', 'why']);

    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopWords.has(w));

    // Count frequencies
    const freq = new Map<string, number>();
    for (const word of words) {
      freq.set(word, (freq.get(word) || 0) + 1);
    }

    // Return top topics
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private extractEntities(text: string): string[] {
    const entities: string[] = [];
    
    // Extract capitalized words (potential proper nouns)
    const capitalizedPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g;
    let match;
    while ((match = capitalizedPattern.exec(text)) !== null) {
      entities.push(match[0]);
    }

    // Extract quoted strings
    const quotedPattern = /["']([^"']+)["']/g;
    while ((match = quotedPattern.exec(text)) !== null) {
      entities.push(match[1]);
    }

    // Extract URLs
    const urlPattern = /https?:\/\/[^\s]+/g;
    while ((match = urlPattern.exec(text)) !== null) {
      entities.push(match[0]);
    }

    return Array.from(new Set(entities)).slice(0, 10);
  }

  private analyzeSentiment(text: string): number {
    // Very simple sentiment analysis
    const positive = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
      'happy', 'love', 'like', 'best', 'better', 'awesome', 'nice', 'helpful'];
    const negative = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike',
      'worst', 'poor', 'ugly', 'wrong', 'error', 'fail', 'problem', 'issue'];

    const words = text.toLowerCase().split(/\s+/);
    let score = 0;

    for (const word of words) {
      if (positive.includes(word)) score += 1;
      if (negative.includes(word)) score -= 1;
    }

    // Normalize to -1 to 1
    return Math.max(-1, Math.min(1, score / Math.max(1, words.length / 10)));
  }

  // ----------------------------- User Profile -------------------------------
  private extractUserProfile(sources: ContextSource[]): UserProfile | undefined {
    for (const source of sources) {
      if (source.type === 'user' && source.data) {
        return source.data as UserProfile;
      }
    }
    return undefined;
  }

  // ----------------------------- Summary Generation -------------------------
  private generateSummary(
    query: string,
    sources: ContextSource[],
    memories: MemoryItem[]
  ): string {
    const parts: string[] = [];

    parts.push(`Query: "${query}"`);
    parts.push(`Context includes ${sources.length} sources and ${memories.length} relevant memories.`);

    if (memories.length > 0) {
      const topMemory = memories[0];
      parts.push(`Most relevant memory: "${topMemory.content.slice(0, 100)}..."`);
    }

    const avgRelevance = sources.length > 0
      ? sources.reduce((sum, s) => sum + s.relevance, 0) / sources.length
      : 0;
    parts.push(`Average source relevance: ${(avgRelevance * 100).toFixed(0)}%`);

    return parts.join(' ');
  }

  // ----------------------------- Confidence Calculation ---------------------
  private calculateConfidence(sources: ContextSource[]): number {
    if (sources.length === 0) return 0;

    const factors = [
      // Source count factor
      Math.min(1, sources.length / 10),
      // Average relevance
      sources.reduce((sum, s) => sum + s.relevance, 0) / sources.length,
      // Source diversity
      new Set(sources.map(s => s.type)).size / 5,
      // Recency factor
      this.calculateRecencyFactor(sources),
    ];

    return average(factors);
  }

  private calculateRecencyFactor(sources: ContextSource[]): number {
    if (sources.length === 0) return 0;
    
    const currentTime = now();
    const hourAgo = currentTime - 3600000;
    const dayAgo = currentTime - 86400000;

    let score = 0;
    for (const source of sources) {
      if (source.timestamp > hourAgo) score += 1;
      else if (source.timestamp > dayAgo) score += 0.5;
      else score += 0.2;
    }

    return score / sources.length;
  }

  // ----------------------------- Context to Reasoning -----------------------
  toReasoningContext(
    synthesized: SynthesizedContext,
    mode: ReasoningMode = 'analytical',
    constraints?: string[]
  ): ReasoningContext {
    return {
      query: synthesized.query,
      mode,
      memory: synthesized.relevantMemories,
      userProfile: synthesized.userContext,
      constraints,
      maxDepth: getConfig().brain.maxReasoningDepth,
    };
  }
}

// Singleton instance
export const contextSynthesizer = new ContextSynthesizer();


