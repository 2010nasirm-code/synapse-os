// ============================================================================
// NEXUS PRIME - GLOBAL STATE MANAGEMENT
// Reactive state system with persistence and sync
// ============================================================================

export interface StateSubscriber<T> {
  (state: T, prevState: T): void;
}

export interface StateSlice<T> {
  get(): T;
  set(value: T | ((prev: T) => T)): void;
  subscribe(subscriber: StateSubscriber<T>): () => void;
  reset(): void;
}

export class PrimeState<T extends Record<string, any>> {
  private state: T;
  private initialState: T;
  private subscribers = new Map<keyof T | '*', Set<StateSubscriber<any>>>();
  private middleware: Array<(key: keyof T, value: any, prev: any) => any> = [];

  constructor(initialState: T) {
    this.state = { ...initialState };
    this.initialState = { ...initialState };
  }

  // ----------------------------- State Access -------------------------------
  get(): T {
    return { ...this.state };
  }

  getKey<K extends keyof T>(key: K): T[K] {
    return this.state[key];
  }

  set(updates: Partial<T>): void {
    const prevState = { ...this.state };

    for (const [key, value] of Object.entries(updates)) {
      this.setKey(key as keyof T, value);
    }

    // Notify global subscribers
    this.notifySubscribers('*', this.state, prevState);
  }

  setKey<K extends keyof T>(key: K, value: T[K] | ((prev: T[K]) => T[K])): void {
    const prevValue = this.state[key];
    let newValue = typeof value === 'function' ? (value as Function)(prevValue) : value;

    // Apply middleware
    for (const mw of this.middleware) {
      newValue = mw(key, newValue, prevValue);
    }

    if (newValue !== prevValue) {
      this.state[key] = newValue;
      this.notifySubscribers(key, newValue, prevValue);
    }
  }

  reset(): void {
    const prevState = { ...this.state };
    this.state = { ...this.initialState };
    this.notifySubscribers('*', this.state, prevState);
  }

  resetKey<K extends keyof T>(key: K): void {
    this.setKey(key, this.initialState[key]);
  }

  // ----------------------------- Subscriptions ------------------------------
  subscribe(subscriber: StateSubscriber<T>): () => void {
    if (!this.subscribers.has('*')) {
      this.subscribers.set('*', new Set());
    }
    this.subscribers.get('*')!.add(subscriber);
    return () => this.subscribers.get('*')?.delete(subscriber);
  }

  subscribeKey<K extends keyof T>(key: K, subscriber: StateSubscriber<T[K]>): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key)!.add(subscriber);
    return () => this.subscribers.get(key)?.delete(subscriber);
  }

  private notifySubscribers<K extends keyof T>(key: K | '*', value: any, prevValue: any): void {
    const subs = this.subscribers.get(key);
    if (subs) {
      for (const sub of subs) {
        try {
          sub(value, prevValue);
        } catch (e) {
          console.error(`[State] Subscriber error for ${String(key)}:`, e);
        }
      }
    }
  }

  // ----------------------------- Middleware ---------------------------------
  use(middleware: (key: keyof T, value: any, prev: any) => any): () => void {
    this.middleware.push(middleware);
    return () => {
      const idx = this.middleware.indexOf(middleware);
      if (idx > -1) this.middleware.splice(idx, 1);
    };
  }

  // ----------------------------- Persistence --------------------------------
  persist(storageKey: string): void {
    // Save to storage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(this.state));
      } catch (e) {
        console.warn('[State] Failed to persist:', e);
      }
    }
  }

  hydrate(storageKey: string): void {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          this.set(parsed);
        }
      } catch (e) {
        console.warn('[State] Failed to hydrate:', e);
      }
    }
  }

  // ----------------------------- Slice Creation -----------------------------
  createSlice<K extends keyof T>(key: K): StateSlice<T[K]> {
    return {
      get: () => this.getKey(key),
      set: (value) => this.setKey(key, value),
      subscribe: (subscriber) => this.subscribeKey(key, subscriber),
      reset: () => this.resetKey(key),
    };
  }
}

// ============================================================================
// NEXUS PRIME GLOBAL STATE
// ============================================================================

export interface NexusPrimeGlobalState {
  // System state
  system: {
    initialized: boolean;
    status: 'loading' | 'ready' | 'error' | 'maintenance';
    version: string;
  };

  // User state
  user: {
    id: string | null;
    preferences: Record<string, any>;
    patterns: any[];
  };

  // UI state
  ui: {
    theme: 'light' | 'dark' | 'system';
    sidebarOpen: boolean;
    commandPaletteOpen: boolean;
    notifications: any[];
    morphingLevel: number;
    temporalMode: 'morning' | 'afternoon' | 'evening' | 'night';
  };

  // Agent state
  agents: {
    active: string[];
    tasks: any[];
    messages: any[];
  };

  // Evolution state
  evolution: {
    features: any[];
    experiments: any[];
    adaptations: any[];
  };
}

const initialGlobalState: NexusPrimeGlobalState = {
  system: {
    initialized: false,
    status: 'loading',
    version: '1.0.0',
  },
  user: {
    id: null,
    preferences: {},
    patterns: [],
  },
  ui: {
    theme: 'system',
    sidebarOpen: true,
    commandPaletteOpen: false,
    notifications: [],
    morphingLevel: 1.0,
    temporalMode: 'afternoon',
  },
  agents: {
    active: [],
    tasks: [],
    messages: [],
  },
  evolution: {
    features: [],
    experiments: [],
    adaptations: [],
  },
};

export const globalState = new PrimeState(initialGlobalState);

