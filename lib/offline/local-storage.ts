// Local Storage Cache for Offline Mode
const CACHE_PREFIX = 'nexus_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export class LocalCache {
  static set<T>(key: string, data: T, expiry: number = CACHE_EXPIRY): void {
    if (typeof window === 'undefined') return;
    
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiry,
    };
    
    try {
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
    } catch (error) {
      // Storage full - clear old items
      this.clearExpired();
      try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
      } catch {
        console.error('Failed to cache item:', key);
      }
    }
  }

  static get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(CACHE_PREFIX + key);
      if (!stored) return null;
      
      const item: CacheItem<T> = JSON.parse(stored);
      
      if (Date.now() - item.timestamp > item.expiry) {
        this.remove(key);
        return null;
      }
      
      return item.data;
    } catch {
      return null;
    }
  }

  static remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CACHE_PREFIX + key);
  }

  static clearExpired(): void {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    
    for (const key of keys) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const item: CacheItem<any> = JSON.parse(stored);
          if (Date.now() - item.timestamp > item.expiry) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        localStorage.removeItem(key);
      }
    }
  }

  static clearAll(): void {
    if (typeof window === 'undefined') return;
    
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(key => localStorage.removeItem(key));
  }
}

// IndexedDB for larger data storage
export class IndexedDBCache {
  private dbName = 'nexus_db';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create stores for each data type
        ['items', 'suggestions', 'automations', 'analytics', 'memories'].forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };
    });
  }

  async set(store: string, data: any): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(store, 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.put(data);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get<T>(store: string, id: string): Promise<T | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(store, 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.get(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAll<T>(store: string): Promise<T[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(store, 'readonly');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async delete(store: string, id: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(store, 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.delete(id);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(store: string): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(store, 'readwrite');
      const objectStore = transaction.objectStore(store);
      const request = objectStore.clear();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const indexedDBCache = new IndexedDBCache();


