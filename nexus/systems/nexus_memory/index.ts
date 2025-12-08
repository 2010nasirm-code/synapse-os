// ============================================================================
// NEXUS MEMORY - Main Memory System Export
// ============================================================================

export * from './memory-store';

import { MemoryStore } from './memory-store';
import { MemoryItem, MemoryType, MemoryQuery, MemorySearchResult, UserProfile } from '../../types';
import { generateUUID, now } from '../../utils';
import { getConfig } from '../../config';

// ----------------------------- Memory System --------------------------------
export class NexusMemorySystem {
  readonly shortTerm: MemoryStore;
  readonly longTerm: MemoryStore;
  readonly working: MemoryStore;
  readonly episodic: MemoryStore;
  readonly semantic: MemoryStore;

  private userProfiles: Map<string, UserProfile> = new Map();
  private crossModuleCache: Map<string, unknown> = new Map();

  constructor() {
    const config = getConfig();

    this.shortTerm = new MemoryStore('short_term', {
      capacity: config.memory.shortTermCapacity,
      defaultTTL: config.memory.shortTermTTL,
      enableDecay: true,
      decayRate: 0.05,
    });

    this.longTerm = new MemoryStore('long_term', {
      capacity: config.memory.longTermCapacity,
      defaultTTL: 0, // No expiration
      enableDecay: true,
      decayRate: 0.001,
    });

    this.working = new MemoryStore('working', {
      capacity: 50,
      defaultTTL: 1800000, // 30 minutes
      enableDecay: false,
    });

    this.episodic = new MemoryStore('episodic', {
      capacity: 500,
      defaultTTL: 0,
      enableDecay: true,
      decayRate: 0.002,
    });

    this.semantic = new MemoryStore('semantic', {
      capacity: 1000,
      defaultTTL: 0,
      enableDecay: false,
    });

    // Start background maintenance
    this.startMaintenance();
  }

  // ----------------------------- Unified Memory Access -----------------------
  store(
    content: string,
    type: MemoryType = 'short_term',
    options: Partial<Pick<MemoryItem, 'importance' | 'tags' | 'metadata' | 'embedding'>> = {}
  ): MemoryItem {
    const store = this.getStore(type);
    return store.add(content, options);
  }

  retrieve(id: string): MemoryItem | undefined {
    // Search all stores
    for (const store of this.getAllStores()) {
      const memory = store.get(id);
      if (memory) return memory;
    }
    return undefined;
  }

  search(query: string, options?: { types?: MemoryType[]; limit?: number }): MemorySearchResult[] {
    const stores = options?.types 
      ? options.types.map(t => this.getStore(t))
      : this.getAllStores();
    
    const allResults: MemorySearchResult[] = [];
    
    for (const store of stores) {
      const results = store.search(query, options?.limit || 10);
      allResults.push(...results);
    }

    // Sort combined results by score
    allResults.sort((a, b) => b.score - a.score);

    return allResults.slice(0, options?.limit || 10);
  }

  query(memQuery: MemoryQuery): MemorySearchResult[] {
    const stores = memQuery.type 
      ? [this.getStore(memQuery.type)]
      : this.getAllStores();
    
    const allResults: MemorySearchResult[] = [];
    
    for (const store of stores) {
      const results = store.query(memQuery);
      allResults.push(...results);
    }

    allResults.sort((a, b) => b.score - a.score);
    return allResults.slice(0, memQuery.limit || 10);
  }

  // ----------------------------- Memory Consolidation -----------------------
  consolidate(): number {
    let consolidated = 0;
    const config = getConfig();

    // Move important short-term memories to long-term
    for (const memory of this.shortTerm.getAll()) {
      if (memory.importance >= 0.7 || memory.accessCount >= 5) {
        this.longTerm.add(memory.content, {
          importance: memory.importance,
          tags: memory.tags,
          metadata: memory.metadata,
          embedding: memory.embedding,
        });
        this.shortTerm.delete(memory.id);
        consolidated++;
      }
    }

    return consolidated;
  }

  // ----------------------------- User Profile Memory ------------------------
  storeUserProfile(userId: string, profile: UserProfile): void {
    this.userProfiles.set(userId, profile);
  }

  getUserProfile(userId: string): UserProfile | undefined {
    return this.userProfiles.get(userId);
  }

  updateUserProfile(userId: string, updates: Partial<UserProfile>): UserProfile | undefined {
    const profile = this.userProfiles.get(userId);
    if (!profile) return undefined;

    Object.assign(profile, updates);
    return profile;
  }

  // ----------------------------- Cross-Module Memory ------------------------
  setCrossModule<T>(key: string, value: T): void {
    this.crossModuleCache.set(key, value);
  }

  getCrossModule<T>(key: string): T | undefined {
    return this.crossModuleCache.get(key) as T | undefined;
  }

  deleteCrossModule(key: string): boolean {
    return this.crossModuleCache.delete(key);
  }

  // ----------------------------- Store Access -------------------------------
  getStore(type: MemoryType): MemoryStore {
    switch (type) {
      case 'short_term': return this.shortTerm;
      case 'long_term': return this.longTerm;
      case 'working': return this.working;
      case 'episodic': return this.episodic;
      case 'semantic': return this.semantic;
      default: return this.shortTerm;
    }
  }

  getAllStores(): MemoryStore[] {
    return [this.shortTerm, this.longTerm, this.working, this.episodic, this.semantic];
  }

  // ----------------------------- Maintenance --------------------------------
  private startMaintenance() {
    if (typeof window === 'undefined') return;

    // Run decay every 5 minutes
    setInterval(() => {
      for (const store of this.getAllStores()) {
        store.applyDecay();
      }
    }, 5 * 60 * 1000);

    // Clean expired every minute
    setInterval(() => {
      for (const store of this.getAllStores()) {
        store.clearExpired();
      }
    }, 60 * 1000);

    // Consolidate every 15 minutes
    setInterval(() => {
      this.consolidate();
    }, 15 * 60 * 1000);
  }

  // ----------------------------- Statistics ---------------------------------
  getStats() {
    return {
      shortTerm: this.shortTerm.getStats(),
      longTerm: this.longTerm.getStats(),
      working: this.working.getStats(),
      episodic: this.episodic.getStats(),
      semantic: this.semantic.getStats(),
      userProfiles: this.userProfiles.size,
      crossModuleEntries: this.crossModuleCache.size,
      totalMemories: this.getAllStores().reduce((sum, s) => sum + s.getAll().length, 0),
    };
  }

  // ----------------------------- Cleanup ------------------------------------
  clear(type?: MemoryType): void {
    if (type) {
      this.getStore(type).clear();
    } else {
      for (const store of this.getAllStores()) {
        store.clear();
      }
    }
  }

  // ----------------------------- Export/Import ------------------------------
  export(): Record<string, MemoryItem[]> {
    const data: Record<string, MemoryItem[]> = {};
    
    for (const store of this.getAllStores()) {
      data[store.getStats().type] = store.getAll();
    }
    
    return data;
  }

  import(data: Record<string, MemoryItem[]>): number {
    let imported = 0;
    
    for (const [type, memories] of Object.entries(data)) {
      const store = this.getStore(type as MemoryType);
      for (const memory of memories) {
        store.add(memory.content, {
          importance: memory.importance,
          tags: memory.tags,
          metadata: memory.metadata,
          embedding: memory.embedding,
        });
        imported++;
      }
    }
    
    return imported;
  }
}

// Singleton instance
export const nexusMemory = new NexusMemorySystem();
export default nexusMemory;


