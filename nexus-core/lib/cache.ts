/**
 * @module cache
 * @description Performance-optimized caching utilities
 * 
 * Provides multiple caching strategies:
 * - LRU Cache for memory-efficient storage
 * - TTL Cache for time-based expiration
 * - Memoization for function results
 * 
 * @example
 * ```typescript
 * // Basic cache
 * cache.set('key', 'value', { ttl: 60000 });
 * const value = cache.get('key');
 * 
 * // Memoization
 * const memoized = memoize(expensiveFunction, { ttl: 5000 });
 * ```
 * 
 * @version 1.0.0
 */

import { logger } from "./logger";

// ============================================
// TYPES
// ============================================

interface CacheEntry<T> {
  value: T;
  createdAt: number;
  expiresAt?: number;
  accessCount: number;
  lastAccess: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum entries
  onEvict?: (key: string, value: any) => void;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

// ============================================
// LRU CACHE IMPLEMENTATION
// ============================================

/**
 * @class LRUCache
 * @description Least Recently Used cache with TTL support
 */
export class LRUCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private defaultTTL?: number;
  private onEvict?: (key: string, value: T) => void;
  private hits = 0;
  private misses = 0;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.ttl;
    this.onEvict = options.onEvict;
  }

  /**
   * Get a value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      this.misses++;
      return undefined;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccess = Date.now();

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.hits++;
    return entry.value;
  }

  /**
   * Set a value in cache
   */
  set(key: string, value: T, options?: { ttl?: number }): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const ttl = options?.ttl ?? this.defaultTTL;
    
    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
      accessCount: 0,
      lastAccess: Date.now(),
    });
  }

  /**
   * Check if key exists (and is not expired)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Delete a key
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry && this.onEvict) {
      this.onEvict(key, entry.value);
    }
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    if (this.onEvict) {
      this.cache.forEach((entry, key) => this.onEvict!(key, entry.value));
    }
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Get or compute a value
   */
  async getOrSet(key: string, factory: () => T | Promise<T>, options?: { ttl?: number }): Promise<T> {
    const existing = this.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const value = await factory();
    this.set(key, value, options);
    return value;
  }

  /**
   * Remove expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    this.cache.forEach((entry, key) => {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.delete(key);
        pruned++;
      }
    });

    return pruned;
  }

  private evictOldest(): void {
    // Get oldest entry (first in map)
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.delete(firstKey);
    }
  }
}

// ============================================
// MEMOIZATION
// ============================================

/**
 * Memoize a function with optional TTL
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options?: { ttl?: number; maxSize?: number; keyFn?: (...args: Parameters<T>) => string }
): T {
  const cache = new LRUCache<ReturnType<T>>({
    ttl: options?.ttl,
    maxSize: options?.maxSize || 100,
  });

  const keyFn = options?.keyFn || ((...args) => JSON.stringify(args));

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyFn(...args);
    const cached = cache.get(key);
    
    if (cached !== undefined) {
      return cached;
    }

    const result = fn(...args);
    
    // Handle promises
    if (result instanceof Promise) {
      return result.then((value) => {
        cache.set(key, value);
        return value;
      }) as ReturnType<T>;
    }

    cache.set(key, result);
    return result;
  }) as T;
}

// ============================================
// BATCH PROCESSOR
// ============================================

/**
 * @class BatchProcessor
 * @description Batches multiple calls into single operations
 */
export class BatchProcessor<T, R> {
  private queue: Array<{ key: T; resolve: (value: R) => void; reject: (error: Error) => void }> = [];
  private timer: NodeJS.Timeout | null = null;
  private batchFn: (keys: T[]) => Promise<Map<T, R>>;
  private delay: number;
  private maxBatchSize: number;

  constructor(
    batchFn: (keys: T[]) => Promise<Map<T, R>>,
    options?: { delay?: number; maxBatchSize?: number }
  ) {
    this.batchFn = batchFn;
    this.delay = options?.delay || 10;
    this.maxBatchSize = options?.maxBatchSize || 100;
  }

  /**
   * Add item to batch
   */
  async load(key: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.delay);
      }
    });
  }

  /**
   * Process the current batch
   */
  private async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const batch = this.queue.splice(0, this.maxBatchSize);
    if (batch.length === 0) return;

    const keys = batch.map((item) => item.key);

    try {
      const results = await this.batchFn(keys);
      
      batch.forEach((item) => {
        const result = results.get(item.key);
        if (result !== undefined) {
          item.resolve(result);
        } else {
          item.reject(new Error(`No result for key: ${item.key}`));
        }
      });
    } catch (error: any) {
      batch.forEach((item) => item.reject(error));
    }
  }
}

// ============================================
// SINGLETON INSTANCES
// ============================================

// Global cache instance
export const globalCache = new LRUCache({ maxSize: 1000, ttl: 300000 }); // 5 min default TTL

// Query result cache
export const queryCache = new LRUCache({ maxSize: 500, ttl: 60000 }); // 1 min TTL

// Embedding cache (longer TTL since embeddings are expensive)
export const embeddingCache = new LRUCache<number[]>({ maxSize: 1000, ttl: 3600000 }); // 1 hour TTL

export default {
  LRUCache,
  memoize,
  BatchProcessor,
  globalCache,
  queryCache,
  embeddingCache,
};


