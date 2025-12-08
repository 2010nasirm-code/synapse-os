// ============================================================================
// NEXUS PERFORMANCE - Caching System
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expires: number;
  hits: number;
}

interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number; // milliseconds
}

export class LRUCache<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) return undefined;
    
    // Check expiration
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return undefined;
    }

    // Update hits and move to end (most recently used)
    entry.hits++;
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: K, value: V, ttl?: number): void {
    // Evict if at capacity
    while (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      } else {
        break;
      }
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + (ttl || this.defaultTTL),
      hits: 0,
    });
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expires) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  stats(): { size: number; hits: number; entries: number } {
    let totalHits = 0;
    const values = Array.from(this.cache.values());
    for (const entry of values) {
      totalHits += entry.hits;
    }
    return {
      size: this.cache.size,
      hits: totalHits,
      entries: this.cache.size,
    };
  }

  // Clean expired entries
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expires) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }
}

// Memoization decorator
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    keyGenerator?: (...args: Parameters<T>) => string;
    ttl?: number;
    maxSize?: number;
  } = {}
): T {
  const cache = new LRUCache<string, ReturnType<T>>({
    maxSize: options.maxSize || 100,
    defaultTTL: options.ttl || 60000,
  });

  const keyGenerator = options.keyGenerator || ((...args: Parameters<T>) => 
    JSON.stringify(args)
  );

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = keyGenerator(...args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    
    return result;
  }) as T;
}

// Async memoization decorator
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    keyGenerator?: (...args: Parameters<T>) => string;
    ttl?: number;
    maxSize?: number;
  } = {}
): T {
  const cache = new LRUCache<string, Awaited<ReturnType<T>>>({
    maxSize: options.maxSize || 100,
    defaultTTL: options.ttl || 60000,
  });
  
  const pending = new Map<string, Promise<Awaited<ReturnType<T>>>>();

  const keyGenerator = options.keyGenerator || ((...args: Parameters<T>) => 
    JSON.stringify(args)
  );

  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    const key = keyGenerator(...args);

    // Check cache
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    // Check pending
    if (pending.has(key)) {
      return pending.get(key)!;
    }

    // Execute and cache
    const promise = fn(...args).then(result => {
      cache.set(key, result);
      pending.delete(key);
      return result;
    }).catch(error => {
      pending.delete(key);
      throw error;
    });

    pending.set(key, promise);
    return promise;
  }) as T;
}

// Global caches
export const queryCache = new LRUCache<string, unknown>({ maxSize: 500, defaultTTL: 300000 });
export const memoryCache = new LRUCache<string, unknown>({ maxSize: 1000, defaultTTL: 600000 });
export const computeCache = new LRUCache<string, unknown>({ maxSize: 200, defaultTTL: 120000 });


