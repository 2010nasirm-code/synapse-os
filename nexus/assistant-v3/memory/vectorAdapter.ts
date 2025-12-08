/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - VECTOR ADAPTER
 * ============================================================================
 * 
 * In-memory ANN search with external adapter hooks.
 * 
 * @module nexus/assistant-v3/memory/vectorAdapter
 * @version 3.0.0
 */

import { cosineSimilarity } from './embeddings';

// ============================================================================
// CONFIGURATION
// ============================================================================

const VECTOR_DB_URL = process.env.VECTOR_DB_URL;

// ============================================================================
// TYPES
// ============================================================================

export interface VectorEntry {
  id: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface VectorAdapter {
  insert(entry: VectorEntry): Promise<void>;
  search(embedding: number[], limit: number): Promise<SearchResult[]>;
  delete(id: string): Promise<boolean>;
  clear(): Promise<void>;
  count(): Promise<number>;
}

// ============================================================================
// IN-MEMORY ADAPTER
// ============================================================================

export class InMemoryVectorAdapter implements VectorAdapter {
  private entries: Map<string, VectorEntry> = new Map();

  async insert(entry: VectorEntry): Promise<void> {
    this.entries.set(entry.id, entry);
  }

  async search(embedding: number[], limit: number = 5): Promise<SearchResult[]> {
    const results: SearchResult[] = [];

    for (const entry of this.entries.values()) {
      const score = cosineSimilarity(embedding, entry.embedding);
      results.push({
        id: entry.id,
        score,
        metadata: entry.metadata,
      });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  async delete(id: string): Promise<boolean> {
    return this.entries.delete(id);
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }

  async count(): Promise<number> {
    return this.entries.size;
  }
}

// ============================================================================
// EXTERNAL ADAPTERS (STUBS FOR PRODUCTION USE)
// ============================================================================

/**
 * Qdrant adapter (stub - implement in production)
 */
export class QdrantAdapter implements VectorAdapter {
  private collectionName: string;
  private apiUrl: string;

  constructor(collectionName: string, apiUrl?: string) {
    this.collectionName = collectionName;
    this.apiUrl = apiUrl || VECTOR_DB_URL || '';
  }

  async insert(entry: VectorEntry): Promise<void> {
    if (!this.apiUrl) {
      console.warn('[QdrantAdapter] No API URL configured');
      return;
    }

    try {
      await fetch(`${this.apiUrl}/collections/${this.collectionName}/points`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          points: [{
            id: entry.id,
            vector: entry.embedding,
            payload: entry.metadata,
          }],
        }),
      });
    } catch (error) {
      console.error('[QdrantAdapter] Insert failed:', error);
    }
  }

  async search(embedding: number[], limit: number = 5): Promise<SearchResult[]> {
    if (!this.apiUrl) {
      console.warn('[QdrantAdapter] No API URL configured');
      return [];
    }

    try {
      const response = await fetch(`${this.apiUrl}/collections/${this.collectionName}/points/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vector: embedding,
          limit,
          with_payload: true,
        }),
      });

      const data = await response.json();
      return (data.result || []).map((r: any) => ({
        id: r.id,
        score: r.score,
        metadata: r.payload,
      }));
    } catch (error) {
      console.error('[QdrantAdapter] Search failed:', error);
      return [];
    }
  }

  async delete(id: string): Promise<boolean> {
    if (!this.apiUrl) return false;

    try {
      await fetch(`${this.apiUrl}/collections/${this.collectionName}/points/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: [id] }),
      });
      return true;
    } catch (error) {
      console.error('[QdrantAdapter] Delete failed:', error);
      return false;
    }
  }

  async clear(): Promise<void> {
    // Would delete and recreate collection
    console.warn('[QdrantAdapter] Clear not implemented');
  }

  async count(): Promise<number> {
    if (!this.apiUrl) return 0;

    try {
      const response = await fetch(`${this.apiUrl}/collections/${this.collectionName}`);
      const data = await response.json();
      return data.result?.points_count || 0;
    } catch (error) {
      console.error('[QdrantAdapter] Count failed:', error);
      return 0;
    }
  }
}

/**
 * Pinecone adapter (stub - implement in production)
 */
export class PineconeAdapter implements VectorAdapter {
  private indexName: string;
  private apiKey: string;
  private environment: string;

  constructor(indexName: string, apiKey?: string, environment?: string) {
    this.indexName = indexName;
    this.apiKey = apiKey || '';
    this.environment = environment || '';
  }

  async insert(entry: VectorEntry): Promise<void> {
    console.warn('[PineconeAdapter] Not fully implemented - stub');
    // Would call Pinecone upsert API
  }

  async search(embedding: number[], limit: number = 5): Promise<SearchResult[]> {
    console.warn('[PineconeAdapter] Not fully implemented - stub');
    // Would call Pinecone query API
    return [];
  }

  async delete(id: string): Promise<boolean> {
    console.warn('[PineconeAdapter] Not fully implemented - stub');
    return false;
  }

  async clear(): Promise<void> {
    console.warn('[PineconeAdapter] Not fully implemented - stub');
  }

  async count(): Promise<number> {
    console.warn('[PineconeAdapter] Not fully implemented - stub');
    return 0;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

let defaultAdapter: VectorAdapter | null = null;

export function getVectorAdapter(): VectorAdapter {
  if (!defaultAdapter) {
    // Use external adapter if configured
    if (VECTOR_DB_URL && VECTOR_DB_URL.includes('qdrant')) {
      defaultAdapter = new QdrantAdapter('nexus-assistant');
    } else {
      // Default to in-memory
      defaultAdapter = new InMemoryVectorAdapter();
    }
  }
  return defaultAdapter;
}

export function setVectorAdapter(adapter: VectorAdapter): void {
  defaultAdapter = adapter;
}

export default {
  InMemoryVectorAdapter,
  QdrantAdapter,
  PineconeAdapter,
  getVectorAdapter,
  setVectorAdapter,
};

