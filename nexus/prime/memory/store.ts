/**
 * ============================================================================
 * NEXUS PRIME - MEMORY STORE
 * ============================================================================
 * 
 * Persistent memory storage with:
 * - Local JSON fallback
 * - Adapter interface for external storage
 * - TTL and decay support
 * - Safe category management
 * 
 * @module nexus/prime/memory/store
 * @version 1.0.0
 */

import { NexusMemoryItem } from '../core/types';

// ============================================================================
// STORAGE ADAPTER INTERFACE
// ============================================================================

export interface MemoryStorageAdapter {
  save(key: string, data: unknown): Promise<void>;
  load(key: string): Promise<unknown | null>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}

// ============================================================================
// LOCAL STORAGE ADAPTER (Browser)
// ============================================================================

export class LocalStorageAdapter implements MemoryStorageAdapter {
  private prefix: string;

  constructor(prefix = 'nexus-prime-memory') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  async save(key: string, data: unknown): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(this.getKey(key), JSON.stringify(data));
    }
  }

  async load(key: string): Promise<unknown | null> {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = localStorage.getItem(this.getKey(key));
      return data ? JSON.parse(data) : null;
    }
    return null;
  }

  async delete(key: string): Promise<void> {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(this.getKey(key));
    }
  }

  async list(): Promise<string[]> {
    if (typeof window !== 'undefined' && window.localStorage) {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          keys.push(key.replace(`${this.prefix}:`, ''));
        }
      }
      return keys;
    }
    return [];
  }
}

// ============================================================================
// IN-MEMORY ADAPTER (Server/Testing)
// ============================================================================

export class InMemoryAdapter implements MemoryStorageAdapter {
  private store = new Map<string, unknown>();

  async save(key: string, data: unknown): Promise<void> {
    this.store.set(key, data);
  }

  async load(key: string): Promise<unknown | null> {
    return this.store.get(key) || null;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(): Promise<string[]> {
    return Array.from(this.store.keys());
  }
}

// ============================================================================
// MEMORY STORE CONFIGURATION
// ============================================================================

export interface MemoryStoreConfig {
  /** Maximum memories to store */
  maxMemories: number;
  /** Default TTL in milliseconds (0 = no expiry) */
  defaultTTL: number;
  /** Decay rate per day (0-1) */
  decayRate: number;
  /** Minimum importance to prevent decay */
  minImportanceForProtection: number;
  /** Protected categories that never decay */
  protectedCategories: string[];
  /** Storage adapter */
  adapter: MemoryStorageAdapter;
}

const DEFAULT_CONFIG: MemoryStoreConfig = {
  maxMemories: 1000,
  defaultTTL: 0,
  decayRate: 0.1,
  minImportanceForProtection: 0.8,
  protectedCategories: ['preference', 'fact'],
  adapter: new InMemoryAdapter(),
};

// ============================================================================
// MEMORY STORE
// ============================================================================

export class MemoryStore {
  private config: MemoryStoreConfig;
  private memories: Map<string, NexusMemoryItem> = new Map();
  private initialized = false;
  private userId: string;

  constructor(userId: string, config: Partial<MemoryStoreConfig> = {}) {
    this.userId = userId;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the store by loading from adapter
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await this.config.adapter.load(this.getStoreKey());
      if (stored && Array.isArray(stored)) {
        for (const item of stored as NexusMemoryItem[]) {
          this.memories.set(item.id, item);
        }
      }
      this.initialized = true;
      console.log(`[MemoryStore] Loaded ${this.memories.size} memories for ${this.userId}`);
    } catch (error) {
      console.error('[MemoryStore] Failed to load:', error);
      this.initialized = true;
    }
  }

  /**
   * Get the store key for this user
   */
  private getStoreKey(): string {
    return `memories:${this.userId}`;
  }

  /**
   * Save the store to adapter
   */
  private async persist(): Promise<void> {
    const items = Array.from(this.memories.values());
    await this.config.adapter.save(this.getStoreKey(), items);
  }

  /**
   * Add a memory
   */
  async add(memory: Omit<NexusMemoryItem, 'id' | 'createdAt' | 'lastAccessedAt' | 'accessCount'>): Promise<NexusMemoryItem> {
    await this.initialize();

    // Check capacity
    if (this.memories.size >= this.config.maxMemories) {
      await this.evictLeastImportant();
    }

    const now = Date.now();
    const item: NexusMemoryItem = {
      ...memory,
      id: `mem-${now}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
    };

    this.memories.set(item.id, item);
    await this.persist();

    return item;
  }

  /**
   * Get a memory by ID
   */
  async get(id: string): Promise<NexusMemoryItem | null> {
    await this.initialize();

    const memory = this.memories.get(id);
    if (memory) {
      // Update access
      memory.lastAccessedAt = Date.now();
      memory.accessCount++;
      await this.persist();
    }

    return memory || null;
  }

  /**
   * Get all memories
   */
  async getAll(): Promise<NexusMemoryItem[]> {
    await this.initialize();
    return Array.from(this.memories.values());
  }

  /**
   * Search memories by content
   */
  async search(query: string, limit = 10): Promise<NexusMemoryItem[]> {
    await this.initialize();

    const queryLower = query.toLowerCase();
    const results: Array<{ memory: NexusMemoryItem; score: number }> = [];

    for (const memory of this.memories.values()) {
      const contentLower = memory.content.toLowerCase();
      let score = 0;

      // Exact match
      if (contentLower.includes(queryLower)) {
        score += 0.5;
      }

      // Word match
      const queryWords = queryLower.split(/\s+/);
      for (const word of queryWords) {
        if (contentLower.includes(word)) {
          score += 0.1;
        }
      }

      // Category match
      if (memory.category && queryLower.includes(memory.category)) {
        score += 0.2;
      }

      // Tag match
      if (memory.tags) {
        for (const tag of memory.tags) {
          if (queryLower.includes(tag.toLowerCase())) {
            score += 0.1;
          }
        }
      }

      if (score > 0) {
        // Boost by recency
        const age = Date.now() - memory.lastAccessedAt;
        const recencyBoost = Math.max(0, 1 - age / (7 * 24 * 60 * 60 * 1000));
        score += recencyBoost * 0.2;

        // Boost by importance
        score += memory.importance * 0.1;

        results.push({ memory, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.memory);
  }

  /**
   * Update a memory
   */
  async update(id: string, updates: Partial<NexusMemoryItem>): Promise<NexusMemoryItem | null> {
    await this.initialize();

    const memory = this.memories.get(id);
    if (!memory) return null;

    const updated = {
      ...memory,
      ...updates,
      id: memory.id, // Preserve ID
      createdAt: memory.createdAt, // Preserve creation date
    };

    this.memories.set(id, updated);
    await this.persist();

    return updated;
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<boolean> {
    await this.initialize();

    const deleted = this.memories.delete(id);
    if (deleted) {
      await this.persist();
    }

    return deleted;
  }

  /**
   * Delete multiple memories
   */
  async deleteMany(ids: string[]): Promise<number> {
    await this.initialize();

    let count = 0;
    for (const id of ids) {
      if (this.memories.delete(id)) {
        count++;
      }
    }

    if (count > 0) {
      await this.persist();
    }

    return count;
  }

  /**
   * Clear all memories
   */
  async clear(): Promise<void> {
    await this.initialize();
    this.memories.clear();
    await this.persist();
  }

  /**
   * Get memories by category
   */
  async getByCategory(category: string): Promise<NexusMemoryItem[]> {
    await this.initialize();

    return Array.from(this.memories.values())
      .filter(m => m.category === category);
  }

  /**
   * Apply decay to memories
   */
  async applyDecay(): Promise<number> {
    await this.initialize();

    let decayed = 0;
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    for (const memory of this.memories.values()) {
      // Skip protected
      if (this.config.protectedCategories.includes(memory.category || '')) {
        continue;
      }

      // Skip high importance
      if (memory.importance >= this.config.minImportanceForProtection) {
        continue;
      }

      // Calculate days since last access
      const daysSinceAccess = (now - memory.lastAccessedAt) / dayMs;
      
      if (daysSinceAccess > 1) {
        const decay = Math.min(this.config.decayRate * daysSinceAccess, memory.importance);
        memory.importance = Math.max(0, memory.importance - decay);
        decayed++;

        // Remove if importance is too low
        if (memory.importance < 0.1) {
          this.memories.delete(memory.id);
        }
      }
    }

    if (decayed > 0) {
      await this.persist();
    }

    return decayed;
  }

  /**
   * Evict the least important memory
   */
  private async evictLeastImportant(): Promise<void> {
    const memories = Array.from(this.memories.values());
    
    // Sort by importance (ascending)
    memories.sort((a, b) => {
      // Protected categories last
      const aProtected = this.config.protectedCategories.includes(a.category || '');
      const bProtected = this.config.protectedCategories.includes(b.category || '');
      if (aProtected !== bProtected) return aProtected ? 1 : -1;
      
      return a.importance - b.importance;
    });

    // Remove the least important
    if (memories.length > 0) {
      this.memories.delete(memories[0].id);
    }
  }

  /**
   * Get store statistics
   */
  async getStats(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    averageImportance: number;
    oldestMemory: number | null;
    newestMemory: number | null;
  }> {
    await this.initialize();

    const memories = Array.from(this.memories.values());
    const byCategory: Record<string, number> = {};
    let totalImportance = 0;
    let oldest: number | null = null;
    let newest: number | null = null;

    for (const memory of memories) {
      const cat = memory.category || 'general';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      totalImportance += memory.importance;

      if (oldest === null || memory.createdAt < oldest) {
        oldest = memory.createdAt;
      }
      if (newest === null || memory.createdAt > newest) {
        newest = memory.createdAt;
      }
    }

    return {
      total: memories.length,
      byCategory,
      averageImportance: memories.length > 0 ? totalImportance / memories.length : 0,
      oldestMemory: oldest,
      newestMemory: newest,
    };
  }
}

export default MemoryStore;

