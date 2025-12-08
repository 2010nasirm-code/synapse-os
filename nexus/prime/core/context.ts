/**
 * ============================================================================
 * NEXUS PRIME - CONTEXT ENGINE
 * ============================================================================
 * 
 * Builds comprehensive context for AI requests including:
 * - User identity and preferences
 * - Current UI state
 * - Active data context
 * - Relevant memories (rank-based retrieval)
 * - Session state
 * - Feature flags
 * - Safety tier
 * 
 * @module nexus/prime/core/context
 * @version 1.0.0
 */

import {
  SystemContext,
  NexusMemoryItem,
  AIRequest,
  MemorySearchResult,
} from './types';

// ============================================================================
// CONTEXT BUILDER
// ============================================================================

export class ContextBuilder {
  private context: Partial<SystemContext> = {};

  /**
   * Set user information
   */
  withUser(user: {
    id: string;
    email?: string;
    name?: string;
    preferences?: Record<string, unknown>;
  }): this {
    this.context.user = user;
    return this;
  }

  /**
   * Set UI state
   */
  withUI(ui: {
    currentPage: string;
    currentRoute: string;
    selectedItems?: string[];
    openPanels?: string[];
    theme: 'light' | 'dark';
  }): this {
    this.context.ui = ui;
    return this;
  }

  /**
   * Set data context
   */
  withData(data: {
    activeTrackerId?: string;
    activeItemId?: string;
    visibleItems?: string[];
    recentQueries?: string[];
  }): this {
    this.context.data = data;
    return this;
  }

  /**
   * Set memories
   */
  withMemories(memories: NexusMemoryItem[]): this {
    this.context.memories = memories;
    return this;
  }

  /**
   * Set session info
   */
  withSession(session: {
    id: string;
    startedAt: number;
    messageCount: number;
  }): this {
    this.context.session = session;
    return this;
  }

  /**
   * Set feature flags
   */
  withFeatures(features: Record<string, boolean>): this {
    this.context.features = features;
    return this;
  }

  /**
   * Set safety tier
   */
  withSafetyTier(tier: 1 | 2 | 3): this {
    this.context.safetyTier = tier;
    return this;
  }

  /**
   * Build the context
   */
  build(): SystemContext {
    const now = Date.now();

    return {
      user: this.context.user || {
        id: 'anonymous',
      },
      ui: this.context.ui || {
        currentPage: 'unknown',
        currentRoute: '/',
        theme: 'light',
      },
      data: this.context.data || {},
      memories: this.context.memories || [],
      session: this.context.session || {
        id: `session-${now}`,
        startedAt: now,
        messageCount: 0,
      },
      features: this.context.features || {},
      safetyTier: this.context.safetyTier || 2,
      timestamp: now,
    };
  }
}

// ============================================================================
// MEMORY RETRIEVAL
// ============================================================================

/**
 * Memory retrieval configuration
 */
interface MemoryRetrievalConfig {
  /** Maximum memories to retrieve */
  limit: number;
  /** Weight for vector similarity (0-1) */
  vectorWeight: number;
  /** Weight for recency (0-1) */
  recencyWeight: number;
  /** Weight for importance (0-1) */
  importanceWeight: number;
  /** Weight for access frequency (0-1) */
  frequencyWeight: number;
  /** Minimum score threshold */
  minScore: number;
}

const DEFAULT_RETRIEVAL_CONFIG: MemoryRetrievalConfig = {
  limit: 5,
  vectorWeight: 0.4,
  recencyWeight: 0.3,
  importanceWeight: 0.2,
  frequencyWeight: 0.1,
  minScore: 0.3,
};

/**
 * Rank-based memory retrieval
 * Combines vector similarity, recency, importance, and access frequency
 */
export function rankMemories(
  memories: NexusMemoryItem[],
  query: string,
  queryEmbedding?: number[],
  config: Partial<MemoryRetrievalConfig> = {}
): MemorySearchResult[] {
  const cfg = { ...DEFAULT_RETRIEVAL_CONFIG, ...config };
  const now = Date.now();

  const results: MemorySearchResult[] = memories.map(memory => {
    let score = 0;
    let matchType: MemorySearchResult['matchType'] = 'hybrid';

    // Vector similarity score (if embeddings available)
    if (queryEmbedding && memory.embedding?.values) {
      const similarity = cosineSimilarity(queryEmbedding, memory.embedding.values);
      score += similarity * cfg.vectorWeight;
      if (similarity > 0.8) matchType = 'vector';
    } else {
      // Fallback to keyword matching
      const keywordScore = keywordMatch(query, memory.content);
      score += keywordScore * cfg.vectorWeight;
      if (keywordScore > 0.5) matchType = 'keyword';
    }

    // Recency score (decay over time)
    const age = now - memory.lastAccessedAt;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    const recencyScore = Math.max(0, 1 - (age / maxAge));
    score += recencyScore * cfg.recencyWeight;
    if (recencyScore > 0.9) matchType = 'recency';

    // Importance score
    score += memory.importance * cfg.importanceWeight;

    // Frequency score (normalized)
    const freqScore = Math.min(1, memory.accessCount / 100);
    score += freqScore * cfg.frequencyWeight;

    return {
      item: memory,
      relevance: score,
      matchType,
    };
  });

  // Filter and sort
  return results
    .filter(r => r.relevance >= cfg.minScore)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, cfg.limit);
}

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Simple keyword matching score
 */
function keywordMatch(query: string, content: string): number {
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const contentLower = content.toLowerCase();
  
  if (queryWords.length === 0) return 0;

  let matches = 0;
  for (const word of queryWords) {
    if (contentLower.includes(word)) {
      matches++;
    }
  }

  return matches / queryWords.length;
}

// ============================================================================
// CONTEXT FACTORY
// ============================================================================

/**
 * Build context from request and additional data
 */
export async function buildContext(
  request: AIRequest,
  options: {
    memories?: NexusMemoryItem[];
    queryEmbedding?: number[];
    userId?: string;
    currentPage?: string;
    currentRoute?: string;
    theme?: 'light' | 'dark';
    activeTrackerId?: string;
    features?: Record<string, boolean>;
  } = {}
): Promise<SystemContext> {
  // Retrieve relevant memories if available
  let relevantMemories: NexusMemoryItem[] = [];
  if (options.memories && options.memories.length > 0) {
    const rankedResults = rankMemories(
      options.memories,
      request.prompt,
      options.queryEmbedding,
      { limit: 5 }
    );
    relevantMemories = rankedResults.map(r => r.item);
  }

  // Build context
  const builder = new ContextBuilder()
    .withUser({
      id: options.userId || request.context?.user?.id || 'anonymous',
    })
    .withUI({
      currentPage: options.currentPage || 'unknown',
      currentRoute: options.currentRoute || '/',
      theme: options.theme || 'light',
    })
    .withData({
      activeTrackerId: options.activeTrackerId,
      recentQueries: request.conversationHistory
        ?.filter(m => m.role === 'user')
        .slice(-5)
        .map(m => m.content),
    })
    .withMemories(relevantMemories)
    .withSession({
      id: request.id,
      startedAt: Date.now(),
      messageCount: request.conversationHistory?.length || 0,
    })
    .withFeatures(options.features || {})
    .withSafetyTier(determineSafetyTier(request));

  // Merge with request context if provided
  if (request.context) {
    if (request.context.user) builder.withUser({ ...builder['context'].user, ...request.context.user });
    if (request.context.ui) builder.withUI({ ...builder['context'].ui, ...request.context.ui } as any);
    if (request.context.data) builder.withData({ ...builder['context'].data, ...request.context.data });
  }

  return builder.build();
}

/**
 * Determine safety tier based on request
 */
function determineSafetyTier(request: AIRequest): 1 | 2 | 3 {
  // Tier 1: Low security (internal/automated requests)
  if (request.metadata?.source === 'internal') {
    return 1;
  }

  // Tier 3: High security (destructive operations, code changes)
  const highRiskPatterns = [
    /delete/i,
    /remove/i,
    /modify.*code/i,
    /change.*setting/i,
    /automation.*create/i,
  ];

  for (const pattern of highRiskPatterns) {
    if (pattern.test(request.prompt)) {
      return 3;
    }
  }

  // Tier 2: Default
  return 2;
}

/**
 * Extract context summary for logging (sanitized)
 */
export function summarizeContext(context: SystemContext): Record<string, unknown> {
  return {
    userId: context.user.id,
    currentPage: context.ui.currentPage,
    memoriesCount: context.memories.length,
    sessionMessageCount: context.session.messageCount,
    safetyTier: context.safetyTier,
    timestamp: context.timestamp,
  };
}

export default ContextBuilder;

