// ============================================================================
// NEXUS API - Query Handler
// ============================================================================

import { NexusFusion } from '../index';
import { generateUUID, now } from '../utils';

export interface QueryRequest {
  userId: string;
  query: string;
  mode?: 'analytical' | 'creative' | 'critical' | 'practical';
  context?: Record<string, unknown>;
  options?: {
    includeMemory?: boolean;
    includeSuggestions?: boolean;
    maxTokens?: number;
  };
}

export interface QueryResponse {
  id: string;
  query: string;
  answer: string;
  reasoning?: string;
  insights?: Array<{
    title: string;
    content: string;
    importance: number;
  }>;
  suggestions?: string[];
  provenance: Array<{
    source: string;
    confidence: number;
  }>;
  metadata: {
    processingTime: number;
    mode: string;
    timestamp: number;
  };
}

export async function handleQuery(
  nexus: NexusFusion,
  request: QueryRequest
): Promise<QueryResponse> {
  const startTime = now();
  const queryId = generateUUID();

  // Process through brain
  const brainResult = await nexus.brain.process({
    query: request.query,
    mode: request.mode,
    context: request.context as any,
    memory: request.options?.includeMemory 
      ? nexus.memory.longTerm.getAll() 
      : undefined,
  });

  // Build provenance
  const provenance = [{ source: 'Nexus Brain', confidence: brainResult.confidence || 0.9 }];

  // Generate suggestions if requested
  let suggestions: string[] | undefined;
  if (request.options?.includeSuggestions && brainResult.suggestions) {
    suggestions = brainResult.suggestions.map(s => 
      typeof s === 'string' ? s : String(s)
    );
  }

  // Store in memory for future reference
  if (request.options?.includeMemory !== false) {
    nexus.memory.store(
      `Query: ${request.query} | Answer: ${brainResult.conclusion || ''}`,
      'episodic',
      { metadata: { type: 'query', userId: request.userId, queryId } }
    );
  }

  const processingTime = now() - startTime;

  return {
    id: queryId,
    query: request.query,
    answer: brainResult.conclusion || 'I processed your query but could not generate a response.',
    reasoning: brainResult.reasoning?.join('\n'),
    insights: brainResult.insights?.map(i => ({
      title: i.title || 'Insight',
      content: i.description || String(i),
      importance: i.confidence || 0.5,
    })),
    suggestions,
    provenance,
    metadata: {
      processingTime,
      mode: request.mode || 'analytical',
      timestamp: now(),
    },
  };
}

// Batch query handler
export async function handleBatchQuery(
  nexus: NexusFusion,
  requests: QueryRequest[]
): Promise<QueryResponse[]> {
  return Promise.all(requests.map(req => handleQuery(nexus, req)));
}

// Streaming query handler (for real-time responses)
export async function* streamQuery(
  nexus: NexusFusion,
  request: QueryRequest
): AsyncGenerator<{ type: string; data: unknown }> {
  const startTime = now();
  const queryId = generateUUID();

  yield { type: 'start', data: { queryId, timestamp: now() } };

  // Stream reasoning steps
  yield { type: 'status', data: { step: 'analyzing', message: 'Analyzing query...' } };

  const brainResult = await nexus.brain.process({
    query: request.query,
    mode: request.mode,
    context: request.context as any,
  });

  yield { type: 'status', data: { step: 'synthesizing', message: 'Generating response...' } };

  // Stream partial results
  if (brainResult.reasoning) {
    yield { type: 'reasoning', data: brainResult.reasoning };
  }

  if (brainResult.insights) {
    for (const insight of brainResult.insights) {
      yield { type: 'insight', data: insight };
    }
  }

  // Final answer
  yield {
    type: 'answer',
    data: {
      content: brainResult.conclusion || '',
      confidence: brainResult.confidence || 0.8,
    },
  };

  const processingTime = now() - startTime;

  yield {
    type: 'complete',
    data: {
      queryId,
      processingTime,
      timestamp: now(),
    },
  };
}


