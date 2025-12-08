// ============================================================================
// NEXUS PRIME - MAIN API
// Unified interface for Nexus Prime system
// ============================================================================

import { kernel } from '../core/kernel';
import { registry } from '../core/registry';
import { configManager, PrimeConfig } from '../core/config';
import { globalState } from '../core/state';
import { globalEvents } from '../core/events';
import { guardian } from '../self-heal/guardian';
import { perfectionEngine } from '../intelligence/perfection-engine';
import { orchestrator } from '../agents/orchestrator';
import { flowStateEngine } from '../intelligence/flow-state';
import { predictiveEngine } from '../intelligence/predictive';
import { patternEngine } from '../intelligence/pattern-recognition';
import { autoLayout } from '../ui/auto-layout';
import { quantumMorph } from '../ui/quantum-morph';
import { temporalAwareness } from '../ui/temporal-awareness';

export interface NexusPrimeStatus {
  version: string;
  status: 'initializing' | 'running' | 'degraded' | 'stopped' | 'recovering';
  health: {
    score: number;
    status: string;
    issues: number;
  };
  uptime: number;
  agents: {
    total: number;
    active: number;
  };
  services: {
    total: number;
    active: number;
  };
}

export class NexusPrimeAPI {
  private static instance: NexusPrimeAPI;
  private initialized = false;

  private constructor() {}

  static getInstance(): NexusPrimeAPI {
    if (!NexusPrimeAPI.instance) {
      NexusPrimeAPI.instance = new NexusPrimeAPI();
    }
    return NexusPrimeAPI.instance;
  }

  // ----------------------------- Initialization -----------------------------
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('[Nexus Prime] Initializing...');

    try {
      // Initialize kernel
      await kernel.initialize();

      // Initialize guardian
      await guardian.initialize();

      // Initialize agents
      await orchestrator.initialize();

      // Start perfection monitoring
      perfectionEngine.startMonitoring();

      // Register with kernel
      kernel.registerModule('prime-api');

      this.initialized = true;
      globalState.setKey('system', { initialized: true, status: 'ready', version: '1.0.0' });

      console.log('[Nexus Prime] Initialization complete');
      globalEvents.emit('prime:initialized');

    } catch (error) {
      console.error('[Nexus Prime] Initialization failed:', error);
      globalState.setKey('system', prev => ({ ...prev, status: 'error' }));
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    console.log('[Nexus Prime] Shutting down...');

    await orchestrator.shutdown();
    await kernel.shutdown();
    perfectionEngine.stopMonitoring();

    this.initialized = false;
    globalState.setKey('system', prev => ({ ...prev, status: 'loading', initialized: false }));

    console.log('[Nexus Prime] Shutdown complete');
    globalEvents.emit('prime:shutdown');
  }

  // ----------------------------- Status -------------------------------------
  getStatus(): NexusPrimeStatus {
    const health = kernel.getHealth();
    const agentStatus = orchestrator.getStatus();
    const serviceStats = registry.getStats();

    return {
      version: '1.0.0',
      status: kernel.getStatus(),
      health: {
        score: health.score,
        status: health.status,
        issues: health.issues.length,
      },
      uptime: kernel.getUptime(),
      agents: {
        total: agentStatus.agents.length,
        active: agentStatus.agents.filter(a => a.status === 'working' || a.status === 'idle').length,
      },
      services: {
        total: serviceStats.total,
        active: serviceStats.byStatus['active'] || 0,
      },
    };
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  // ----------------------------- Configuration ------------------------------
  getConfig(): PrimeConfig {
    return configManager.get();
  }

  updateConfig(updates: Partial<PrimeConfig>): void {
    configManager.set(updates);
    globalEvents.emit('prime:config-updated', updates);
  }

  resetConfig(): void {
    configManager.reset();
    globalEvents.emit('prime:config-reset');
  }

  // ----------------------------- State Management ---------------------------
  getState(): ReturnType<typeof globalState.get> {
    return globalState.get();
  }

  setState(updates: Parameters<typeof globalState.set>[0]): void {
    globalState.set(updates);
  }

  subscribeToState(handler: (state: any, prevState: any) => void): () => void {
    return globalState.subscribe(handler);
  }

  // ----------------------------- Event System -------------------------------
  on(event: string, handler: (data: any) => void): () => void {
    return globalEvents.on(event, handler);
  }

  emit(event: string, data?: any): void {
    globalEvents.emit(event, data);
  }

  // ----------------------------- Intelligence -------------------------------
  getFlowState() {
    return {
      current: flowStateEngine.getCurrentState(),
      metrics: flowStateEngine.getMetrics(),
      adaptation: flowStateEngine.getAdaptation(),
    };
  }

  getPredictions() {
    return predictiveEngine.getCurrentPredictions();
  }

  getPatterns() {
    return patternEngine.getPatterns();
  }

  getInferredPreferences() {
    return patternEngine.getInferredPreferences();
  }

  // ----------------------------- UI Control ---------------------------------
  setLayoutMode(mode: Parameters<typeof autoLayout.setMode>[0]): void {
    autoLayout.setMode(mode);
  }

  morph(target: Parameters<typeof quantumMorph.morph>[0]): void {
    quantumMorph.morph(target);
  }

  getTemporalMode() {
    return temporalAwareness.getCurrentMode();
  }

  setTemporalMode(mode: Parameters<typeof temporalAwareness.forceMode>[0]): void {
    temporalAwareness.forceMode(mode);
  }

  // ----------------------------- Agents -------------------------------------
  getAgents() {
    return orchestrator.getAllAgents().map(agent => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      status: agent.getStatus(),
      stats: agent.getStats(),
      capabilities: agent.getCapabilities(),
    }));
  }

  executeAgentCapability(agentId: string, capability: string, data: any): Promise<any> {
    const agent = orchestrator.getAgent(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);
    return agent.executeCapability(capability, data);
  }

  // ----------------------------- Self-Healing -------------------------------
  getGuardianStatus() {
    return guardian.getStats();
  }

  triggerSoftReset(component?: string): Promise<void> {
    return guardian.softReset(component);
  }

  triggerHardReset(): Promise<void> {
    return guardian.hardReset();
  }

  // ----------------------------- Perfection ---------------------------------
  async runPerfectionCheck() {
    return perfectionEngine.runAllChecks();
  }

  getLastPerfectionReport() {
    return perfectionEngine.getLastReport();
  }
}

export const primeAPI = NexusPrimeAPI.getInstance();

