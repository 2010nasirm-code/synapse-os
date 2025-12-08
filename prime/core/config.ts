// ============================================================================
// NEXUS PRIME - CONFIGURATION SYSTEM
// Centralized, type-safe configuration management
// ============================================================================

export interface PrimeConfig {
  // Core settings
  core: {
    debug: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    environment: 'development' | 'staging' | 'production';
  };

  // Kernel settings
  kernel: {
    healthCheckInterval: number;
    metricsInterval: number;
    adaptationInterval: number;
    maxHistorySize: number;
  };

  // Agent settings
  agents: {
    enabled: boolean;
    maxConcurrent: number;
    taskTimeout: number;
    retryAttempts: number;
  };

  // UI settings
  ui: {
    morphingEnabled: boolean;
    morphingSpeed: number;
    adaptiveLayout: boolean;
    temporalAwareness: boolean;
    animationIntensity: number;
  };

  // Self-heal settings
  selfHeal: {
    enabled: boolean;
    autoFix: boolean;
    maxRetries: number;
    cooldownPeriod: number;
  };

  // Evolution settings
  evolution: {
    enabled: boolean;
    learningRate: number;
    minConfidence: number;
    experimentalFeatures: boolean;
  };

  // Performance settings
  performance: {
    cacheEnabled: boolean;
    cacheSize: number;
    lazyLoadThreshold: number;
    preloadEnabled: boolean;
  };
}

const defaultConfig: PrimeConfig = {
  core: {
    debug: process.env.NODE_ENV === 'development',
    logLevel: 'info',
    environment: (process.env.NODE_ENV as any) || 'development',
  },
  kernel: {
    healthCheckInterval: 5000,
    metricsInterval: 1000,
    adaptationInterval: 10000,
    maxHistorySize: 1000,
  },
  agents: {
    enabled: true,
    maxConcurrent: 5,
    taskTimeout: 30000,
    retryAttempts: 3,
  },
  ui: {
    morphingEnabled: true,
    morphingSpeed: 300,
    adaptiveLayout: true,
    temporalAwareness: true,
    animationIntensity: 1.0,
  },
  selfHeal: {
    enabled: true,
    autoFix: true,
    maxRetries: 3,
    cooldownPeriod: 5000,
  },
  evolution: {
    enabled: true,
    learningRate: 0.1,
    minConfidence: 0.7,
    experimentalFeatures: false,
  },
  performance: {
    cacheEnabled: true,
    cacheSize: 1000,
    lazyLoadThreshold: 100,
    preloadEnabled: true,
  },
};

class ConfigManager {
  private static instance: ConfigManager;
  private config: PrimeConfig;
  private listeners = new Set<(config: PrimeConfig) => void>();

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): PrimeConfig {
    // Try to load from localStorage in browser
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('nexus-prime-config');
        if (saved) {
          return this.mergeConfig(defaultConfig, JSON.parse(saved));
        }
      } catch (e) {
        console.warn('[Config] Failed to load saved config:', e);
      }
    }
    return { ...defaultConfig };
  }

  private mergeConfig(base: PrimeConfig, override: Partial<PrimeConfig>): PrimeConfig {
    return {
      core: { ...base.core, ...override.core },
      kernel: { ...base.kernel, ...override.kernel },
      agents: { ...base.agents, ...override.agents },
      ui: { ...base.ui, ...override.ui },
      selfHeal: { ...base.selfHeal, ...override.selfHeal },
      evolution: { ...base.evolution, ...override.evolution },
      performance: { ...base.performance, ...override.performance },
    };
  }

  get(): PrimeConfig {
    return { ...this.config };
  }

  getSection<K extends keyof PrimeConfig>(section: K): PrimeConfig[K] {
    return { ...this.config[section] };
  }

  set(updates: Partial<PrimeConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.save();
    this.notify();
  }

  setSection<K extends keyof PrimeConfig>(section: K, updates: Partial<PrimeConfig[K]>): void {
    (this.config[section] as any) = { ...this.config[section], ...updates };
    this.save();
    this.notify();
  }

  reset(): void {
    this.config = { ...defaultConfig };
    this.save();
    this.notify();
  }

  private save(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('nexus-prime-config', JSON.stringify(this.config));
      } catch (e) {
        console.warn('[Config] Failed to save config:', e);
      }
    }
  }

  subscribe(listener: (config: PrimeConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.config);
      } catch (e) {
        console.error('[Config] Listener error:', e);
      }
    }
  }
}

export const configManager = ConfigManager.getInstance();
export const getConfig = () => configManager.get();
export const setConfig = (updates: Partial<PrimeConfig>) => configManager.set(updates);

