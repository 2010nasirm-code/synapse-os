// ============================================================================
// NEXUS API - Memory Handler
// ============================================================================

import { NexusFusion } from '../index';
import { now } from '../utils';

export interface MemoryAddRequest {
  userId: string;
  content: string;
  type?: 'short_term' | 'long_term' | 'semantic' | 'episodic';
  importance?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface MemorySearchRequest {
  userId: string;
  query: string;
  types?: Array<'short_term' | 'long_term' | 'semantic' | 'episodic'>;
  limit?: number;
  threshold?: number;
}

export interface MemoryResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function handleMemoryAdd(
  nexus: NexusFusion,
  request: MemoryAddRequest
): Promise<MemoryResponse> {
  try {
    const memory = nexus.memory.store(
      request.content,
      request.type || 'long_term',
      {
        importance: request.importance,
        tags: request.tags,
        metadata: { ...request.metadata, userId: request.userId },
      }
    );

    return {
      success: true,
      data: {
        id: memory.id,
        type: request.type || 'long_term',
        timestamp: now(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store memory',
    };
  }
}

export async function handleMemorySearch(
  nexus: NexusFusion,
  request: MemorySearchRequest
): Promise<MemoryResponse> {
  try {
    const results = nexus.memory.search(request.query, {
      types: request.types,
      limit: request.limit || 10,
    });

    // Filter by user if needed
    const userResults = results.filter(r => {
      const metadata = r.item.metadata as { userId?: string } | undefined;
      return !metadata?.userId || metadata.userId === request.userId;
    });

    return {
      success: true,
      data: {
        results: userResults.map(r => ({
          content: r.item.content,
          score: r.score,
          tags: r.item.tags,
        })),
        count: userResults.length,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to search memory',
    };
  }
}

export async function handleMemoryStats(
  nexus: NexusFusion,
  userId?: string
): Promise<MemoryResponse> {
  try {
    const stats = nexus.memory.getStats();

    return {
      success: true,
      data: {
        ...stats,
        timestamp: now(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get memory stats',
    };
  }
}

export async function handleMemoryClear(
  nexus: NexusFusion,
  userId: string,
  type?: 'short_term' | 'long_term' | 'semantic' | 'episodic'
): Promise<MemoryResponse> {
  try {
    // Clear specific type or all
    if (type) {
      switch (type) {
        case 'short_term':
          nexus.memory.shortTerm.clear();
          break;
        case 'long_term':
          nexus.memory.longTerm.clear();
          break;
        case 'semantic':
          nexus.memory.semantic.clear();
          break;
        case 'episodic':
          nexus.memory.episodic.clear();
          break;
      }
    } else {
      nexus.memory.clear();
    }

    return {
      success: true,
      data: {
        cleared: type || 'all',
        timestamp: now(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to clear memory',
    };
  }
}

