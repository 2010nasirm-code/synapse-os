/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - MEMORY STORE
 * ============================================================================
 * 
 * Safe memory storage with consent checks and TTL support.
 * 
 * @module nexus/assistant-v3/memory/memoryStore
 * @version 3.0.0
 */

import { MemoryItem, MemorySearchResult, MemoryType } from '../core/types';
import { ConsentManager } from '../core/safety';
import { generateEmbedding, cosineSimilarity } from './embeddings';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_MEMORIES_PER_USER = 1000;
const DECAY_FACTOR = 0.95; // Per day decay

// ============================================================================
// STORAGE
// ============================================================================

// In-memory storage (would be replaced with persistent storage in production)
const memoryStores = new Map<string, MemoryItem[]>();

// ============================================================================
// MEMORY STORE CLASS
// ============================================================================

export class MemoryStore {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    if (!memoryStores.has(userId)) {
      memoryStores.set(userId, []);
    }
  }

  /**
   * Get all memories for user
   */
  async getAll(): Promise<MemoryItem[]> {
    if (!ConsentManager.canStoreMemory(this.userId)) {
      return [];
    }
    return this.getUserMemories();
  }

  /**
   * Add a new memory
   */
  async add(memory: Omit<MemoryItem, 'id' | 'createdAt' | 'owner'>): Promise<MemoryItem> {
    // Check consent
    if (!ConsentManager.canStoreMemory(this.userId)) {
      throw new Error('Memory storage not consented');
    }

    // Create memory item
    const item: MemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...memory,
      owner: this.userId,
      consent: true,
      createdAt: Date.now(),
      ttl: memory.ttl || DEFAULT_TTL,
    };

    // Generate embedding if not provided
    if (!item.embeddingRef) {
      const embedding = await generateEmbedding(item.text);
      item.embeddingRef = `emb-${item.id}`;
      // Store embedding (would be in vector DB in production)
      embeddingCache.set(item.embeddingRef, embedding);
    }

    // Add to store
    const memories = this.getUserMemories();
    memories.push(item);

    // Enforce limit
    if (memories.length > MAX_MEMORIES_PER_USER) {
      // Remove oldest, lowest importance memories
      memories.sort((a, b) => {
        const scoreA = (a.importance || 0.5) * Math.exp(-((Date.now() - a.createdAt) / (24 * 60 * 60 * 1000)) * (1 - DECAY_FACTOR));
        const scoreB = (b.importance || 0.5) * Math.exp(-((Date.now() - b.createdAt) / (24 * 60 * 60 * 1000)) * (1 - DECAY_FACTOR));
        return scoreB - scoreA;
      });
      memories.splice(MAX_MEMORIES_PER_USER);
    }

    memoryStores.set(this.userId, memories);
    return item;
  }

  /**
   * Search memories by similarity
   */
  async search(query: string, limit: number = 5): Promise<MemorySearchResult[]> {
    if (!ConsentManager.canStoreMemory(this.userId)) {
      return [];
    }

    const memories = this.getUserMemories();
    if (memories.length === 0) return [];

    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);

    // Calculate similarities
    const results: MemorySearchResult[] = [];
    for (const memory of memories) {
      // Check TTL
      if (memory.ttl && Date.now() - memory.createdAt > memory.ttl) {
        continue;
      }

      // Get memory embedding
      const memoryEmbedding = memory.embeddingRef 
        ? embeddingCache.get(memory.embeddingRef)
        : null;

      if (!memoryEmbedding) continue;

      // Calculate similarity
      const similarity = cosineSimilarity(queryEmbedding, memoryEmbedding);

      // Apply decay
      const daysSinceCreation = (Date.now() - memory.createdAt) / (24 * 60 * 60 * 1000);
      const decayedScore = similarity * Math.pow(DECAY_FACTOR, daysSinceCreation);

      // Apply importance boost
      const finalScore = decayedScore * (1 + (memory.importance || 0.5) * 0.5);

      results.push({
        item: memory,
        score: finalScore,
      });
    }

    // Sort by score and return top results
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Get memory by ID
   */
  async get(id: string): Promise<MemoryItem | null> {
    const memories = this.getUserMemories();
    const memory = memories.find(m => m.id === id);
    
    if (memory) {
      // Update last accessed
      memory.lastAccessedAt = Date.now();
    }

    return memory || null;
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<boolean> {
    const memories = this.getUserMemories();
    const index = memories.findIndex(m => m.id === id);
    
    if (index === -1) return false;

    // Remove embedding
    const memory = memories[index];
    if (memory.embeddingRef) {
      embeddingCache.delete(memory.embeddingRef);
    }

    memories.splice(index, 1);
    memoryStores.set(this.userId, memories);
    return true;
  }

  /**
   * Clear all memories
   */
  async clear(): Promise<void> {
    const memories = this.getUserMemories();
    
    // Clear embeddings
    for (const memory of memories) {
      if (memory.embeddingRef) {
        embeddingCache.delete(memory.embeddingRef);
      }
    }

    memoryStores.set(this.userId, []);
  }

  /**
   * Get memories by type
   */
  async getByType(type: MemoryType): Promise<MemoryItem[]> {
    const memories = this.getUserMemories();
    return memories.filter(m => m.type === type);
  }

  /**
   * Update memory importance
   */
  async updateImportance(id: string, importance: number): Promise<void> {
    const memory = await this.get(id);
    if (memory) {
      memory.importance = Math.max(0, Math.min(1, importance));
    }
  }

  /**
   * Get summary statistics
   */
  async getStats(): Promise<{
    total: number;
    byType: Record<string, number>;
    averageAge: number;
    averageImportance: number;
  }> {
    const memories = this.getUserMemories();
    const byType: Record<string, number> = {};
    let totalAge = 0;
    let totalImportance = 0;

    for (const memory of memories) {
      byType[memory.type] = (byType[memory.type] || 0) + 1;
      totalAge += Date.now() - memory.createdAt;
      totalImportance += memory.importance || 0.5;
    }

    return {
      total: memories.length,
      byType,
      averageAge: memories.length > 0 ? totalAge / memories.length : 0,
      averageImportance: memories.length > 0 ? totalImportance / memories.length : 0,
    };
  }

  /**
   * Cleanup expired memories
   */
  async cleanup(): Promise<number> {
    const memories = this.getUserMemories();
    const now = Date.now();
    let removed = 0;

    for (let i = memories.length - 1; i >= 0; i--) {
      const memory = memories[i];
      if (memory.ttl && now - memory.createdAt > memory.ttl) {
        if (memory.embeddingRef) {
          embeddingCache.delete(memory.embeddingRef);
        }
        memories.splice(i, 1);
        removed++;
      }
    }

    memoryStores.set(this.userId, memories);
    return removed;
  }

  private getUserMemories(): MemoryItem[] {
    return memoryStores.get(this.userId) || [];
  }
}

// ============================================================================
// EMBEDDING CACHE
// ============================================================================

const embeddingCache = new Map<string, number[]>();

// ============================================================================
// FACTORY
// ============================================================================

const storeInstances = new Map<string, MemoryStore>();

export function getMemoryStore(userId: string): MemoryStore {
  if (!storeInstances.has(userId)) {
    storeInstances.set(userId, new MemoryStore(userId));
  }
  return storeInstances.get(userId)!;
}

export default MemoryStore;

