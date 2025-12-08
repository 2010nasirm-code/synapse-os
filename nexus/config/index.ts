// ============================================================================
// NEXUS FUSION V2 - CONFIGURATION
// ============================================================================

export interface NexusConfig {
  // Core settings
  core: {
    debug: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    environment: 'development' | 'staging' | 'production';
  };

  // Task engine settings
  tasks: {
    maxConcurrent: number;
    defaultTimeout: number;
    maxRetries: number;
    retryDelay: number;
  };

  // Flow engine settings
  flows: {
    maxNodes: number;
    executionTimeout: number;
    maxParallelPaths: number;
  };

  // Memory settings
  memory: {
    shortTermCapacity: number;
    shortTermTTL: number;
    longTermCapacity: number;
    embeddingDimension: number;
    minImportanceThreshold: number;
  };

  // Brain settings
  brain: {
    maxReasoningDepth: number;
    patternMinFrequency: number;
    insightConfidenceThreshold: number;
    maxPatternsPerAnalysis: number;
  };

  // Plugin settings
  plugins: {
    autoLoad: boolean;
    sandboxed: boolean;
    maxPlugins: number;
    timeout: number;
  };

  // API settings
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
    rateLimit: {
      requests: number;
      window: number;
    };
  };

  // Cache settings
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };

  // Feature flags
  features: {
    advancedAnalytics: boolean;
    multiAgentSystem: boolean;
    predictiveInsights: boolean;
    realTimeSync: boolean;
    offlineMode: boolean;
  };
}

export const defaultConfig: NexusConfig = {
  core: {
    debug: process.env.NODE_ENV === 'development',
    logLevel: 'info',
    environment: (process.env.NODE_ENV as NexusConfig['core']['environment']) || 'development',
  },

  tasks: {
    maxConcurrent: 10,
    defaultTimeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
  },

  flows: {
    maxNodes: 100,
    executionTimeout: 300000,
    maxParallelPaths: 5,
  },

  memory: {
    shortTermCapacity: 100,
    shortTermTTL: 3600000, // 1 hour
    longTermCapacity: 10000,
    embeddingDimension: 1536,
    minImportanceThreshold: 0.3,
  },

  brain: {
    maxReasoningDepth: 5,
    patternMinFrequency: 3,
    insightConfidenceThreshold: 0.7,
    maxPatternsPerAnalysis: 50,
  },

  plugins: {
    autoLoad: true,
    sandboxed: true,
    maxPlugins: 50,
    timeout: 10000,
  },

  api: {
    baseUrl: '/api/nexus',
    timeout: 30000,
    retries: 3,
    rateLimit: {
      requests: 100,
      window: 60000,
    },
  },

  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 1000,
  },

  features: {
    advancedAnalytics: true,
    multiAgentSystem: true,
    predictiveInsights: true,
    realTimeSync: true,
    offlineMode: true,
  },
};

// Configuration manager
class ConfigManager {
  private config: NexusConfig;
  private listeners: Set<(config: NexusConfig) => void> = new Set();

  constructor() {
    this.config = { ...defaultConfig };
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('nexus_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.config = this.mergeConfig(this.config, parsed);
      }
    } catch {
      // Use default config
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    localStorage.setItem('nexus_config', JSON.stringify(this.config));
  }

  private mergeConfig(base: NexusConfig, override: Partial<NexusConfig>): NexusConfig {
    const result = { ...base };
    
    for (const key of Object.keys(override) as (keyof NexusConfig)[]) {
      if (typeof override[key] === 'object' && override[key] !== null) {
        (result as any)[key] = { ...(base as any)[key], ...(override as any)[key] };
      } else if (override[key] !== undefined) {
        (result as any)[key] = override[key];
      }
    }
    
    return result;
  }

  get<K extends keyof NexusConfig>(key: K): NexusConfig[K] {
    return this.config[key];
  }

  getAll(): NexusConfig {
    return { ...this.config };
  }

  set<K extends keyof NexusConfig>(key: K, value: Partial<NexusConfig[K]>) {
    if (typeof this.config[key] === 'object') {
      (this.config as any)[key] = { ...(this.config as any)[key], ...value };
    } else {
      (this.config as any)[key] = value;
    }
    
    this.saveToStorage();
    this.notifyListeners();
  }

  setAll(config: Partial<NexusConfig>) {
    this.config = this.mergeConfig(this.config, config);
    this.saveToStorage();
    this.notifyListeners();
  }

  reset() {
    this.config = { ...defaultConfig };
    this.saveToStorage();
    this.notifyListeners();
  }

  subscribe(listener: (config: NexusConfig) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.config));
  }

  isFeatureEnabled(feature: keyof NexusConfig['features']): boolean {
    return this.config.features[feature];
  }
}

export const configManager = new ConfigManager();
export const getConfig = () => configManager.getAll();
export const setConfig = (config: Partial<NexusConfig>) => configManager.setAll(config);


