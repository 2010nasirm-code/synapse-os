// ============================================================================
// NEXUS PRIME - EVOLUTION AGENT
// Autonomous feature evolution and system adaptation
// ============================================================================

import { BaseAgent, AgentTask } from './base-agent';
import { globalEvents, PrimeEvents } from '../core/events';
import { globalState } from '../core/state';
import { patternEngine } from '../intelligence/pattern-recognition';
import { getConfig } from '../core/config';

export interface Evolution {
  id: string;
  type: 'micro-feature' | 'shortcut' | 'optimization' | 'workflow';
  name: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  status: 'proposed' | 'testing' | 'active' | 'rolled-back';
  createdAt: number;
  appliedAt?: number;
  data: any;
}

export class EvolutionAgent extends BaseAgent {
  private evolutions: Map<string, Evolution> = new Map();
  private experiments: Map<string, { control: any; variant: any; results: any[] }> = new Map();

  constructor() {
    super('evolution-agent', 'Evolution Agent', 'Evolves the system based on usage patterns');
    this.registerCapabilities();
  }

  protected async onStart(): Promise<void> {
    // Subscribe to pattern events
    globalEvents.on('patterns:new-pattern', (pattern) => this.evaluatePattern(pattern));
    globalEvents.on('patterns:analysis-complete', () => this.generateEvolutions());

    // Periodic evolution generation
    setInterval(() => this.generateEvolutions(), 5 * 60 * 1000); // Every 5 minutes
  }

  protected async onStop(): Promise<void> {
    // Save evolutions state
    this.saveEvolutions();
  }

  protected async processTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case 'generate-evolutions':
        return this.generateEvolutions();
      case 'apply-evolution':
        return this.applyEvolution(task.data.evolutionId);
      case 'rollback-evolution':
        return this.rollbackEvolution(task.data.evolutionId);
      case 'run-experiment':
        return this.runExperiment(task.data);
      default:
        console.warn(`[EvolutionAgent] Unknown task type: ${task.type}`);
    }
  }

  // ----------------------------- Capabilities -------------------------------
  private registerCapabilities(): void {
    this.registerCapability({
      name: 'evolve',
      description: 'Generate and apply evolutions',
      handler: async () => this.generateEvolutions(),
    });

    this.registerCapability({
      name: 'experiment',
      description: 'Run A/B experiment',
      handler: async (data) => this.runExperiment(data),
    });
  }

  // ----------------------------- Pattern Evaluation -------------------------
  private evaluatePattern(pattern: any): void {
    const config = getConfig().evolution;
    if (!config.enabled) return;

    // Check if pattern warrants evolution
    if (pattern.confidence >= config.minConfidence) {
      this.addTask({
        type: 'generate-evolutions',
        priority: 'normal',
        data: { triggerPattern: pattern },
      });
    }
  }

  // ----------------------------- Evolution Generation -----------------------
  private async generateEvolutions(): Promise<Evolution[]> {
    const config = getConfig().evolution;
    if (!config.enabled) return [];

    const patterns = patternEngine.getPatterns();
    const preferences = patternEngine.getInferredPreferences();
    const newEvolutions: Evolution[] = [];

    // Generate shortcut evolutions from sequential patterns
    for (const pattern of patterns.filter(p => p.type === 'sequential')) {
      if (pattern.confidence >= config.minConfidence && pattern.occurrences >= 5) {
        const evolution = this.createShortcutEvolution(pattern);
        if (evolution && !this.evolutions.has(evolution.id)) {
          newEvolutions.push(evolution);
          this.evolutions.set(evolution.id, evolution);
        }
      }
    }

    // Generate optimization evolutions from frequency patterns
    for (const pattern of patterns.filter(p => p.type === 'frequency')) {
      if (pattern.confidence >= config.minConfidence) {
        const evolution = this.createOptimizationEvolution(pattern);
        if (evolution && !this.evolutions.has(evolution.id)) {
          newEvolutions.push(evolution);
          this.evolutions.set(evolution.id, evolution);
        }
      }
    }

    // Generate micro-features from preferences
    for (const pref of preferences) {
      if (pref.confidence >= config.minConfidence && pref.source === 'inferred') {
        const evolution = this.createMicroFeatureEvolution(pref);
        if (evolution && !this.evolutions.has(evolution.id)) {
          newEvolutions.push(evolution);
          this.evolutions.set(evolution.id, evolution);
        }
      }
    }

    // Update global state
    globalState.setKey('evolution', prev => ({
      ...prev,
      features: newEvolutions.map(e => ({ id: e.id, name: e.name, status: e.status })),
    }));

    // Emit new evolutions
    for (const evolution of newEvolutions) {
      globalEvents.emit(PrimeEvents.EVOLUTION_DETECTED, evolution);
    }

    return newEvolutions;
  }

  private createShortcutEvolution(pattern: any): Evolution | null {
    const sequence = pattern.data.sequence;
    if (!sequence || sequence.split('→').length < 3) return null;

    return {
      id: `evo-shortcut-${Date.now()}`,
      type: 'shortcut',
      name: `Quick Action: ${sequence.split('→')[0]}...`,
      description: `Create shortcut for frequent sequence: ${sequence}`,
      confidence: pattern.confidence,
      impact: 'medium',
      status: 'proposed',
      createdAt: Date.now(),
      data: { sequence, occurrences: pattern.occurrences },
    };
  }

  private createOptimizationEvolution(pattern: any): Evolution | null {
    return {
      id: `evo-opt-${Date.now()}`,
      type: 'optimization',
      name: `Optimize: ${pattern.data.eventType}`,
      description: `Optimize frequently used: ${pattern.data.eventType} (${pattern.data.countPerHour}/hr)`,
      confidence: pattern.confidence,
      impact: 'low',
      status: 'proposed',
      createdAt: Date.now(),
      data: pattern.data,
    };
  }

  private createMicroFeatureEvolution(pref: any): Evolution | null {
    return {
      id: `evo-micro-${pref.key}-${Date.now()}`,
      type: 'micro-feature',
      name: `Auto-apply: ${pref.key}`,
      description: `Automatically set ${pref.key} to ${pref.value} based on usage`,
      confidence: pref.confidence,
      impact: 'low',
      status: 'proposed',
      createdAt: Date.now(),
      data: { preference: pref },
    };
  }

  // ----------------------------- Evolution Application ----------------------
  async applyEvolution(evolutionId: string): Promise<boolean> {
    const evolution = this.evolutions.get(evolutionId);
    if (!evolution || evolution.status === 'active') return false;

    try {
      evolution.status = 'testing';

      // Apply based on type
      switch (evolution.type) {
        case 'micro-feature':
          await this.applyMicroFeature(evolution);
          break;
        case 'shortcut':
          await this.applyShortcut(evolution);
          break;
        case 'optimization':
          await this.applyOptimization(evolution);
          break;
      }

      evolution.status = 'active';
      evolution.appliedAt = Date.now();

      globalEvents.emit(PrimeEvents.EVOLUTION_APPLIED, evolution);
      this.saveEvolutions();

      return true;
    } catch (error) {
      evolution.status = 'proposed';
      console.error(`[EvolutionAgent] Failed to apply evolution:`, error);
      return false;
    }
  }

  private async applyMicroFeature(evolution: Evolution): Promise<void> {
    const { preference } = evolution.data;
    
    // Apply the preference
    globalEvents.emit('evolution:apply-preference', {
      key: preference.key,
      value: preference.value,
    });
  }

  private async applyShortcut(evolution: Evolution): Promise<void> {
    // Register shortcut
    globalEvents.emit('evolution:register-shortcut', {
      sequence: evolution.data.sequence,
      evolutionId: evolution.id,
    });
  }

  private async applyOptimization(evolution: Evolution): Promise<void> {
    // Apply optimization
    globalEvents.emit('evolution:apply-optimization', {
      type: evolution.data.eventType,
      evolutionId: evolution.id,
    });
  }

  async rollbackEvolution(evolutionId: string): Promise<boolean> {
    const evolution = this.evolutions.get(evolutionId);
    if (!evolution || evolution.status !== 'active') return false;

    try {
      // Emit rollback event
      globalEvents.emit(PrimeEvents.EVOLUTION_ROLLBACK, evolution);

      evolution.status = 'rolled-back';
      this.saveEvolutions();

      return true;
    } catch (error) {
      console.error(`[EvolutionAgent] Failed to rollback evolution:`, error);
      return false;
    }
  }

  // ----------------------------- Experiments --------------------------------
  private async runExperiment(data: {
    name: string;
    control: any;
    variant: any;
    duration: number;
  }): Promise<string> {
    const experimentId = `exp-${Date.now()}`;
    
    this.experiments.set(experimentId, {
      control: data.control,
      variant: data.variant,
      results: [],
    });

    // Auto-end experiment after duration
    setTimeout(() => {
      this.endExperiment(experimentId);
    }, data.duration);

    globalEvents.emit('evolution:experiment-started', { experimentId, ...data });

    return experimentId;
  }

  recordExperimentResult(experimentId: string, variant: 'control' | 'variant', metric: number): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return;

    experiment.results.push({ variant, metric, timestamp: Date.now() });
  }

  private endExperiment(experimentId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return;

    // Calculate results
    const controlResults = experiment.results.filter(r => r.variant === 'control');
    const variantResults = experiment.results.filter(r => r.variant === 'variant');

    const controlAvg = controlResults.length > 0
      ? controlResults.reduce((sum, r) => sum + r.metric, 0) / controlResults.length
      : 0;

    const variantAvg = variantResults.length > 0
      ? variantResults.reduce((sum, r) => sum + r.metric, 0) / variantResults.length
      : 0;

    const winner = variantAvg > controlAvg ? 'variant' : 'control';

    globalEvents.emit('evolution:experiment-ended', {
      experimentId,
      controlAvg,
      variantAvg,
      winner,
      improvement: ((variantAvg - controlAvg) / controlAvg) * 100,
    });

    this.experiments.delete(experimentId);
  }

  // ----------------------------- Persistence --------------------------------
  private saveEvolutions(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = Array.from(this.evolutions.entries());
      localStorage.setItem('nexus-prime-evolutions', JSON.stringify(data));
    } catch (e) {
      console.warn('[EvolutionAgent] Failed to save evolutions:', e);
    }
  }

  loadEvolutions(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const saved = localStorage.getItem('nexus-prime-evolutions');
      if (saved) {
        const data = JSON.parse(saved);
        this.evolutions = new Map(data);
      }
    } catch (e) {
      console.warn('[EvolutionAgent] Failed to load evolutions:', e);
    }
  }

  // ----------------------------- Getters ------------------------------------
  getEvolutions(): Evolution[] {
    return Array.from(this.evolutions.values());
  }

  getActiveEvolutions(): Evolution[] {
    return this.getEvolutions().filter(e => e.status === 'active');
  }

  getProposedEvolutions(): Evolution[] {
    return this.getEvolutions().filter(e => e.status === 'proposed');
  }
}

