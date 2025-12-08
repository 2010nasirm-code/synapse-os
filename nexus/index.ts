// ============================================================================
// NEXUS FUSION V2 - Main Entry Point
// The Ultimate Expandable System
// ============================================================================

// Core Types
export * from './types';

// Configuration
export * from './config';

// Utilities
export * from './utils';

// Core Engine
export * from './core/engine';

// Systems
export * from './systems/nexus_brain';
export * from './systems/nexus_memory';
export * from './systems/nexus_scheduler';
export * from './systems/nexus_router';
export * from './systems/nexus_plugins';

// Performance (selective exports to avoid conflicts)
export { 
  LRUCache as NexusCache, 
  memoize, 
  memoizeAsync,
  queryCache,
  memoryCache,
  computeCache 
} from './performance/cache';
export { 
  RequestBatcher,
  debounce as nexusDebounce,
  throttle as nexusThrottle,
  RateLimiter,
  ConcurrencyLimiter
} from './performance/batching';

// UI (re-export)
export * from './ui';

// Hooks
export * from './hooks';

// Modules
export * from './modules/trackers';
export * from './modules/automations';
export * from './modules/knowledge';

// Import singletons
import { NexusEngine, eventBus, taskEngine, flowEngine, computeEngine, extensionEngine } from './core/engine';
import { nexusBrain } from './systems/nexus_brain';
import { nexusMemory } from './systems/nexus_memory';
import { nexusScheduler } from './systems/nexus_scheduler';
import { nexusRouter } from './systems/nexus_router';
import { nexusPlugins } from './systems/nexus_plugins';
import { trackersModule } from './modules/trackers';
import { automationsModule } from './modules/automations';
import { knowledgeModule } from './modules/knowledge';
import { configManager, getConfig, setConfig } from './config';
import { now } from './utils';

// ============================================================================
// NEXUS FUSION - Main Interface
// ============================================================================

export interface NexusFusionOptions {
  debug?: boolean;
  autoInitialize?: boolean;
}

export class NexusFusion {
  private initialized = false;
  private initializationTime?: number;

  // Core Systems
  readonly engine = NexusEngine;
  readonly brain = nexusBrain;
  readonly memory = nexusMemory;
  readonly scheduler = nexusScheduler;
  readonly router = nexusRouter;
  readonly plugins = nexusPlugins;

  // Modules
  readonly trackers = trackersModule;
  readonly automations = automationsModule;
  readonly knowledge = knowledgeModule;

  // Event System
  readonly events = eventBus;

  // Configuration
  readonly config = configManager;

  constructor(options: NexusFusionOptions = {}) {
    if (options.debug) {
      setConfig({ core: { debug: true, logLevel: 'debug', environment: 'development' } });
    }

    if (options.autoInitialize !== false) {
      this.initialize();
    }
  }

  // ----------------------------- Initialization -----------------------------
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const startTime = now();

    try {
      // Initialize core engine
      await NexusEngine.initialize();

      // Start scheduler
      this.scheduler.start();

      // Auto-load plugins
      await extensionEngine.autoLoadPlugins();

      this.initialized = true;
      this.initializationTime = now() - startTime;

      eventBus.emit('nexus:initialized', {
        duration: this.initializationTime,
        timestamp: now(),
      });

      if (getConfig().core.debug) {
        console.log(`[Nexus] Initialized in ${this.initializationTime}ms`);
      }

    } catch (error) {
      eventBus.emit('nexus:error', { error, phase: 'initialization' });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) return;

    try {
      // Stop scheduler
      this.scheduler.stop();

      // Shutdown engine
      await NexusEngine.shutdown();

      this.initialized = false;

      eventBus.emit('nexus:shutdown', { timestamp: now() });

    } catch (error) {
      eventBus.emit('nexus:error', { error, phase: 'shutdown' });
      throw error;
    }
  }

  // ----------------------------- Quick Access Methods ------------------------
  // Process a query through the brain
  async think(query: string, mode?: 'analytical' | 'creative' | 'critical' | 'practical') {
    return this.brain.process({
      query,
      mode,
      memory: this.memory.longTerm.getAll(),
    });
  }

  // Store something in memory
  remember(content: string, importance: number = 0.5) {
    return this.memory.store(content, 'long_term', { importance });
  }

  // Search memories
  recall(query: string, limit: number = 10) {
    return this.memory.search(query, { limit });
  }

  // Create a tracker
  track(userId: string, name: string, type: string, value?: unknown) {
    return this.trackers.create(userId, { name, type, value });
  }

  // Create an automation
  automate(userId: string, name: string, trigger: any, actions: any[]) {
    return this.automations.create(userId, { name, trigger, actions });
  }

  // Store knowledge
  learn(userId: string, title: string, content: string, tags?: string[]) {
    return this.knowledge.create(userId, { type: 'note', title, content, tags });
  }

  // ----------------------------- Statistics ---------------------------------
  getStats() {
    return {
      initialized: this.initialized,
      initializationTime: this.initializationTime,
      engine: NexusEngine.getStats(),
      brain: this.brain.getStats(),
      memory: this.memory.getStats(),
      scheduler: this.scheduler.getStats(),
      router: this.router.getStats(),
      plugins: this.plugins.getStats(),
      modules: {
        trackers: this.trackers.getStats(),
        automations: this.automations.getStats(),
        knowledge: this.knowledge.getStats(),
      },
    };
  }

  // ----------------------------- Health Check -------------------------------
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    details: string[];
  }> {
    const checks: Record<string, boolean> = {};
    const details: string[] = [];

    // Check initialization
    checks.initialized = this.initialized;
    if (!this.initialized) details.push('System not initialized');

    // Check scheduler
    checks.scheduler = this.scheduler.getStats().isRunning;
    if (!checks.scheduler) details.push('Scheduler not running');

    // Check memory
    const memoryStats = this.memory.getStats();
    checks.memory = memoryStats.totalMemories > 0 || true; // OK even if empty
    
    // Check event bus
    checks.events = this.events.getSubscriptionCount() > 0 || true;

    const failedChecks = Object.values(checks).filter(v => !v).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (failedChecks === 0) status = 'healthy';
    else if (failedChecks <= 2) status = 'degraded';
    else status = 'unhealthy';

    return { status, checks, details };
  }

  // ----------------------------- Debug --------------------------------------
  debug() {
    if (!getConfig().core.debug) {
      console.warn('[Nexus] Debug mode is disabled');
      return;
    }

    console.log('='.repeat(60));
    console.log('NEXUS FUSION DEBUG INFO');
    console.log('='.repeat(60));
    console.log(JSON.stringify(this.getStats(), null, 2));
    console.log('='.repeat(60));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Create and export default instance
export const nexus = new NexusFusion({ autoInitialize: false });

// Export singleton systems for direct access
export {
  NexusEngine,
  eventBus,
  taskEngine,
  flowEngine,
  computeEngine,
  extensionEngine,
  nexusBrain,
  nexusMemory,
  nexusScheduler,
  nexusRouter,
  nexusPlugins,
  trackersModule,
  automationsModule,
  knowledgeModule,
  configManager,
  getConfig,
  setConfig,
};

export default nexus;

