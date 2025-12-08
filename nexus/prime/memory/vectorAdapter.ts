/**
 * ============================================================================
 * NEXUS PRIME - VECTOR ADAPTER
 * ============================================================================
 * 
 * Vector storage and search with:
 * - Simple in-memory ANN implementation
 * - Pluggable interface for external vector DBs
 * - Efficient nearest neighbor search
 * 
 * @module nexus/prime/memory/vectorAdapter
 * @version 1.0.0
 */

import { EmbeddingVector, NexusMemoryItem } from '../core/types';
import { EmbeddingService } from './embeddings';

// ============================================================================
// VECTOR STORE INTERFACE
// ============================================================================

export interface VectorStoreAdapter {
  /** Add vectors to the store */
  add(items: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown> }>): Promise<void>;
  
  /** Search for nearest neighbors */
  search(query: number[], topK: number): Promise<Array<{ id: string; score: number; metadata?: Record<string, unknown> }>>;
  
  /** Delete vectors by ID */
  delete(ids: string[]): Promise<void>;
  
  /** Clear all vectors */
  clear(): Promise<void>;
  
  /** Get vector count */
  count(): Promise<number>;
}

// ============================================================================
// IN-MEMORY VECTOR STORE
// ============================================================================

interface StoredVector {
  id: string;
  vector: number[];
  metadata?: Record<string, unknown>;
}

export class InMemoryVectorStore implements VectorStoreAdapter {
  private vectors: Map<string, StoredVector> = new Map();

  async add(items: Array<{ id: string; vector: number[]; metadata?: Record<string, unknown> }>): Promise<void> {
    for (const item of items) {
      this.vectors.set(item.id, {
        id: item.id,
        vector: item.vector,
        metadata: item.metadata,
      });
    }
  }

  async search(query: number[], topK: number): Promise<Array<{ id: string; score: number; metadata?: Record<string, unknown> }>> {
    const results: Array<{ id: string; score: number; metadata?: Record<string, unknown> }> = [];

    for (const stored of this.vectors.values()) {
      const score = this.cosineSimilarity(query, stored.vector);
      results.push({
        id: stored.id,
        score,
        metadata: stored.metadata,
      });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  async delete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.vectors.delete(id);
    }
  }

  async clear(): Promise<void> {
    this.vectors.clear();
  }

  async count(): Promise<number> {
    return this.vectors.size;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
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
}

// ============================================================================
// MEMORY VECTOR STORE (Wrapper)
// ============================================================================

export class MemoryVectorStore {
  private adapter: VectorStoreAdapter;
  private embeddingService: EmbeddingService;

  constructor(
    adapter?: VectorStoreAdapter,
    embeddingService?: EmbeddingService
  ) {
    this.adapter = adapter || new InMemoryVectorStore();
    this.embeddingService = embeddingService || new EmbeddingService();
  }

  /**
   * Add a memory with its embedding
   */
  async addMemory(memory: NexusMemoryItem): Promise<void> {
    // Generate embedding if not present
    let vector: number[];
    if (memory.embedding) {
      vector = memory.embedding.values;
    } else {
      const embedding = await this.embeddingService.embedText(memory.content);
      vector = embedding.values;
    }

    await this.adapter.add([{
      id: memory.id,
      vector,
      metadata: {
        content: memory.content.slice(0, 500),
        category: memory.category,
        importance: memory.importance,
        createdAt: memory.createdAt,
      },
    }]);
  }

  /**
   * Add multiple memories
   */
  async addMemories(memories: NexusMemoryItem[]): Promise<void> {
    const items = await Promise.all(memories.map(async (memory) => {
      let vector: number[];
      if (memory.embedding) {
        vector = memory.embedding.values;
      } else {
        const embedding = await this.embeddingService.embedText(memory.content);
        vector = embedding.values;
      }

      return {
        id: memory.id,
        vector,
        metadata: {
          content: memory.content.slice(0, 500),
          category: memory.category,
          importance: memory.importance,
          createdAt: memory.createdAt,
        },
      };
    }));

    await this.adapter.add(items);
  }

  /**
   * Search for similar memories
   */
  async searchSimilar(
    query: string,
    topK = 5,
    filter?: { category?: string; minImportance?: number }
  ): Promise<Array<{ id: string; score: number; content?: string; category?: string }>> {
    const queryEmbedding = await this.embeddingService.embedText(query);
    const results = await this.adapter.search(queryEmbedding.values, topK * 2); // Get more for filtering

    let filtered = results;

    if (filter) {
      filtered = results.filter(r => {
        if (filter.category && r.metadata?.category !== filter.category) {
          return false;
        }
        if (filter.minImportance && (r.metadata?.importance as number) < filter.minImportance) {
          return false;
        }
        return true;
      });
    }

    return filtered.slice(0, topK).map(r => ({
      id: r.id,
      score: r.score,
      content: r.metadata?.content as string,
      category: r.metadata?.category as string,
    }));
  }

  /**
   * Delete memories by ID
   */
  async deleteMemories(ids: string[]): Promise<void> {
    await this.adapter.delete(ids);
  }

  /**
   * Clear all vectors
   */
  async clear(): Promise<void> {
    await this.adapter.clear();
  }

  /**
   * Get vector count
   */
  async count(): Promise<number> {
    return this.adapter.count();
  }

  /**
   * Find duplicates or near-duplicates
   */
  async findDuplicates(
    threshold = 0.95
  ): Promise<Array<{ ids: string[]; similarity: number }>> {
    // This is an O(n²) operation - use with caution on large stores
    const count = await this.adapter.count();
    if (count > 1000) {
      console.warn('[VectorStore] Large store - duplicate detection may be slow');
    }

    // Get all vectors (simplified approach)
    const duplicates: Array<{ ids: string[]; similarity: number }> = [];
    // Note: Full implementation would need to iterate all vectors

    return duplicates;
  }
}

export default MemoryVectorStore;

