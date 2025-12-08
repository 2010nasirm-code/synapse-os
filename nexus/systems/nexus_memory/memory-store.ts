// ============================================================================
// NEXUS MEMORY - Memory Store Implementation
// ============================================================================

import { MemoryItem, MemoryType, MemoryQuery, MemorySearchResult } from '../../types';
import { generateUUID, now, isExpired } from '../../utils';
import { getConfig } from '../../config';
import { eventBus, NexusEvents } from '../../core/engine';

export interface MemoryStoreOptions {
  capacity?: number;
  defaultTTL?: number;
  enableDecay?: boolean;
  decayRate?: number;
}

export class MemoryStore {
  protected memories: Map<string, MemoryItem> = new Map();
  protected options: Required<MemoryStoreOptions>;
  protected type: MemoryType;

  constructor(type: MemoryType, options: MemoryStoreOptions = {}) {
    this.type = type;
    const config = getConfig();
    
    this.options = {
      capacity: options.capacity ?? 
        (type === 'short_term' ? config.memory.shortTermCapacity : config.memory.longTermCapacity),
      defaultTTL: options.defaultTTL ?? 
        (type === 'short_term' ? config.memory.shortTermTTL : 0),
      enableDecay: options.enableDecay ?? true,
      decayRate: options.decayRate ?? 0.01,
    };
  }

  // ----------------------------- CRUD Operations ----------------------------
  add(
    content: string,
    options: Partial<Pick<MemoryItem, 'importance' | 'tags' | 'metadata' | 'embedding' | 'expiresAt'>> = {}
  ): MemoryItem {
    // Check capacity
    if (this.memories.size >= this.options.capacity) {
      this.evictLeastImportant();
    }

    const memory: MemoryItem = {
      id: generateUUID(),
      type: this.type,
      content,
      embedding: options.embedding,
      metadata: options.metadata || {},
      importance: options.importance ?? 0.5,
      accessCount: 0,
      lastAccessed: now(),
      createdAt: now(),
      expiresAt: options.expiresAt ?? 
        (this.options.defaultTTL > 0 ? now() + this.options.defaultTTL : undefined),
      tags: options.tags || [],
      relations: [],
    };

    this.memories.set(memory.id, memory);
    eventBus.emit(NexusEvents.MEMORY_ADDED, { memory, store: this.type });

    return memory;
  }

  get(id: string): MemoryItem | undefined {
    const memory = this.memories.get(id);
    if (!memory) return undefined;

    // Check expiration
    if (isExpired(memory.expiresAt)) {
      this.delete(id);
      return undefined;
    }

    // Update access stats
    memory.accessCount++;
    memory.lastAccessed = now();
    
    eventBus.emit(NexusEvents.MEMORY_ACCESSED, { memory, store: this.type });

    return memory;
  }

  update(id: string, updates: Partial<MemoryItem>): MemoryItem | undefined {
    const memory = this.memories.get(id);
    if (!memory) return undefined;

    // Apply updates (excluding id and type)
    const { id: _, type: __, ...validUpdates } = updates;
    Object.assign(memory, validUpdates);

    eventBus.emit(NexusEvents.MEMORY_UPDATED, { memory, store: this.type });

    return memory;
  }

  delete(id: string): boolean {
    const memory = this.memories.get(id);
    if (!memory) return false;

    this.memories.delete(id);
    eventBus.emit(NexusEvents.MEMORY_DELETED, { memoryId: id, store: this.type });

    return true;
  }

  // ----------------------------- Query Operations ---------------------------
  query(query: MemoryQuery): MemorySearchResult[] {
    const results: MemorySearchResult[] = [];
    const currentTime = now();

    for (const memory of this.memories.values()) {
      // Skip expired memories
      if (isExpired(memory.expiresAt)) continue;

      // Type filter
      if (query.type && memory.type !== query.type) continue;

      // Importance filter
      if (query.minImportance && memory.importance < query.minImportance) continue;

      // Tags filter
      if (query.tags && query.tags.length > 0) {
        const hasMatchingTag = query.tags.some(tag => memory.tags.includes(tag));
        if (!hasMatchingTag) continue;
      }

      // Calculate relevance score
      let score = memory.importance;

      // Text search
      if (query.query) {
        const textScore = this.calculateTextScore(memory.content, query.query);
        if (textScore === 0) continue;
        score *= textScore;
      }

      // Vector similarity
      if (query.embedding && memory.embedding) {
        const similarity = this.cosineSimilarity(query.embedding, memory.embedding);
        score *= similarity;
      }

      // Recency boost
      const age = currentTime - memory.lastAccessed;
      const recencyBoost = Math.exp(-age / (24 * 60 * 60 * 1000)); // Decay over 24 hours
      score *= (0.5 + 0.5 * recencyBoost);

      // Access count boost
      const accessBoost = Math.log(memory.accessCount + 1) / 10;
      score *= (1 + accessBoost);

      results.push({ item: memory, score });
    }

    // Sort by score
    results.sort((a, b) => b.score - a.score);

    // Apply pagination
    const offset = query.offset || 0;
    const limit = query.limit || 10;

    return results.slice(offset, offset + limit);
  }

  search(searchQuery: string, limit: number = 10): MemorySearchResult[] {
    return this.query({ query: searchQuery, limit });
  }

  getByTags(tags: string[], limit: number = 10): MemoryItem[] {
    return this.query({ tags, limit }).map(r => r.item);
  }

  getAll(): MemoryItem[] {
    return Array.from(this.memories.values()).filter(m => !isExpired(m.expiresAt));
  }

  // ----------------------------- Scoring Helpers ----------------------------
  protected calculateTextScore(content: string, query: string): number {
    const contentLower = content.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    let matchCount = 0;
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        matchCount++;
      }
    }

    // Exact match bonus
    if (contentLower.includes(queryLower)) {
      return 1;
    }

    return matchCount / queryWords.length;
  }

  protected cosineSimilarity(a: number[], b: number[]): number {
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

  // ----------------------------- Memory Decay -------------------------------
  applyDecay(): number {
    if (!this.options.enableDecay) return 0;

    let decayedCount = 0;
    const decayThreshold = getConfig().memory.minImportanceThreshold;

    for (const [id, memory] of this.memories) {
      // Apply decay to importance
      memory.importance *= (1 - this.options.decayRate);

      // Remove if below threshold
      if (memory.importance < decayThreshold) {
        this.delete(id);
        decayedCount++;
      }
    }

    return decayedCount;
  }

  // ----------------------------- Memory Management --------------------------
  protected evictLeastImportant(): void {
    if (this.memories.size === 0) return;

    let leastImportant: { id: string; importance: number } | null = null;

    for (const memory of this.memories.values()) {
      // Calculate effective importance (base + recency + access)
      const age = now() - memory.lastAccessed;
      const recencyFactor = Math.exp(-age / (24 * 60 * 60 * 1000));
      const accessFactor = Math.log(memory.accessCount + 1) / 10;
      const effectiveImportance = memory.importance * (0.5 + 0.25 * recencyFactor + 0.25 * accessFactor);

      if (!leastImportant || effectiveImportance < leastImportant.importance) {
        leastImportant = { id: memory.id, importance: effectiveImportance };
      }
    }

    if (leastImportant) {
      this.delete(leastImportant.id);
    }
  }

  clearExpired(): number {
    let count = 0;
    for (const [id, memory] of this.memories) {
      if (isExpired(memory.expiresAt)) {
        this.delete(id);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.memories.clear();
  }

  // ----------------------------- Relations ----------------------------------
  addRelation(memoryId: string, relatedId: string): boolean {
    const memory = this.memories.get(memoryId);
    if (!memory) return false;

    if (!memory.relations.includes(relatedId)) {
      memory.relations.push(relatedId);
    }
    return true;
  }

  removeRelation(memoryId: string, relatedId: string): boolean {
    const memory = this.memories.get(memoryId);
    if (!memory) return false;

    const index = memory.relations.indexOf(relatedId);
    if (index !== -1) {
      memory.relations.splice(index, 1);
      return true;
    }
    return false;
  }

  getRelated(memoryId: string): MemoryItem[] {
    const memory = this.memories.get(memoryId);
    if (!memory) return [];

    return memory.relations
      .map(id => this.memories.get(id))
      .filter((m): m is MemoryItem => m !== undefined && !isExpired(m.expiresAt));
  }

  // ----------------------------- Statistics ---------------------------------
  getStats() {
    const memories = this.getAll();
    const importances = memories.map(m => m.importance);
    
    return {
      type: this.type,
      count: memories.length,
      capacity: this.options.capacity,
      utilizationPercent: (memories.length / this.options.capacity) * 100,
      avgImportance: importances.length > 0 
        ? importances.reduce((a, b) => a + b, 0) / importances.length 
        : 0,
      totalTags: new Set(memories.flatMap(m => m.tags)).size,
      avgAccessCount: memories.length > 0
        ? memories.reduce((sum, m) => sum + m.accessCount, 0) / memories.length
        : 0,
    };
  }
}


