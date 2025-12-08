// ============================================================================
// NEXUS PRIME - FEATURE GENERATOR
// Autonomous micro-feature generation based on usage patterns
// ============================================================================

import { globalEvents } from '../core/events';
import { patternEngine } from '../intelligence/pattern-recognition';
import { getConfig } from '../core/config';

export interface MicroFeature {
  id: string;
  type: 'shortcut' | 'automation' | 'ui-enhancement' | 'workflow' | 'suggestion';
  name: string;
  description: string;
  trigger: string;
  action: () => void | Promise<void>;
  confidence: number;
  usageCount: number;
  createdAt: number;
  status: 'proposed' | 'testing' | 'active' | 'disabled';
}

export class FeatureGenerator {
  private static instance: FeatureGenerator;
  private features = new Map<string, MicroFeature>();
  private generationQueue: Array<{ pattern: any; priority: number }> = [];

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): FeatureGenerator {
    if (!FeatureGenerator.instance) {
      FeatureGenerator.instance = new FeatureGenerator();
    }
    return FeatureGenerator.instance;
  }

  // ----------------------------- Setup --------------------------------------
  private setupEventListeners(): void {
    // Listen for pattern discoveries
    globalEvents.on('patterns:new-pattern', (pattern) => {
      this.queueForGeneration(pattern);
    });

    // Process queue periodically
    setInterval(() => this.processQueue(), 30000);
  }

  // ----------------------------- Feature Generation -------------------------
  private queueForGeneration(pattern: any): void {
    const config = getConfig().evolution;
    if (!config.enabled || pattern.confidence < config.minConfidence) return;

    this.generationQueue.push({
      pattern,
      priority: pattern.confidence * 100,
    });

    // Sort by priority
    this.generationQueue.sort((a, b) => b.priority - a.priority);
  }

  private async processQueue(): Promise<void> {
    if (this.generationQueue.length === 0) return;

    const item = this.generationQueue.shift()!;
    await this.generateFeature(item.pattern);
  }

  private async generateFeature(pattern: any): Promise<MicroFeature | null> {
    // Determine feature type based on pattern
    let feature: MicroFeature | null = null;

    switch (pattern.type) {
      case 'sequential':
        feature = this.generateShortcut(pattern);
        break;

      case 'frequency':
        feature = this.generateOptimization(pattern);
        break;

      case 'temporal':
        feature = this.generateScheduledFeature(pattern);
        break;

      case 'preference':
        feature = this.generateUIEnhancement(pattern);
        break;
    }

    if (feature) {
      this.features.set(feature.id, feature);
      globalEvents.emit('evolution:feature-generated', feature);
    }

    return feature;
  }

  private generateShortcut(pattern: any): MicroFeature {
    const sequence = pattern.data.sequence?.split('→') || [];
    const name = `Quick: ${sequence[0] || 'Action'}`;

    return {
      id: `feature-shortcut-${Date.now()}`,
      type: 'shortcut',
      name,
      description: `Shortcut for sequence: ${pattern.data.sequence}`,
      trigger: `Ctrl+Shift+${String.fromCharCode(65 + this.features.size % 26)}`,
      action: () => {
        globalEvents.emit('feature:execute-sequence', { sequence });
      },
      confidence: pattern.confidence,
      usageCount: 0,
      createdAt: Date.now(),
      status: 'proposed',
    };
  }

  private generateOptimization(pattern: any): MicroFeature {
    return {
      id: `feature-opt-${Date.now()}`,
      type: 'automation',
      name: `Auto-optimize: ${pattern.data.eventType}`,
      description: `Automatically optimize frequently used: ${pattern.data.eventType}`,
      trigger: 'automatic',
      action: () => {
        globalEvents.emit('feature:optimize', { type: pattern.data.eventType });
      },
      confidence: pattern.confidence,
      usageCount: 0,
      createdAt: Date.now(),
      status: 'proposed',
    };
  }

  private generateScheduledFeature(pattern: any): MicroFeature {
    return {
      id: `feature-scheduled-${Date.now()}`,
      type: 'automation',
      name: `Scheduled: ${pattern.name}`,
      description: `Time-based automation based on temporal pattern`,
      trigger: `At peak hour: ${pattern.data.peakHour}:00`,
      action: () => {
        globalEvents.emit('feature:scheduled-trigger', { pattern });
      },
      confidence: pattern.confidence,
      usageCount: 0,
      createdAt: Date.now(),
      status: 'proposed',
    };
  }

  private generateUIEnhancement(pattern: any): MicroFeature {
    const pref = pattern.data.preference;
    return {
      id: `feature-ui-${Date.now()}`,
      type: 'ui-enhancement',
      name: `Auto: ${pref?.key || 'preference'}`,
      description: `Automatically apply preference: ${pref?.key} = ${pref?.value}`,
      trigger: 'automatic',
      action: () => {
        globalEvents.emit('feature:apply-preference', pref);
      },
      confidence: pattern.confidence,
      usageCount: 0,
      createdAt: Date.now(),
      status: 'proposed',
    };
  }

  // ----------------------------- Feature Management -------------------------
  activateFeature(featureId: string): boolean {
    const feature = this.features.get(featureId);
    if (!feature || feature.status === 'active') return false;

    feature.status = 'active';
    this.registerFeatureTrigger(feature);

    globalEvents.emit('evolution:feature-activated', feature);
    return true;
  }

  deactivateFeature(featureId: string): boolean {
    const feature = this.features.get(featureId);
    if (!feature || feature.status !== 'active') return false;

    feature.status = 'disabled';
    this.unregisterFeatureTrigger(feature);

    globalEvents.emit('evolution:feature-deactivated', feature);
    return true;
  }

  private registerFeatureTrigger(feature: MicroFeature): void {
    if (feature.trigger.startsWith('Ctrl') || feature.trigger.startsWith('Alt')) {
      // Register keyboard shortcut
      globalEvents.emit('shortcuts:register', {
        id: feature.id,
        keys: feature.trigger,
        handler: feature.action,
      });
    } else if (feature.trigger === 'automatic') {
      // Auto-trigger based on conditions
      globalEvents.emit('automation:register', {
        id: feature.id,
        handler: feature.action,
      });
    }
  }

  private unregisterFeatureTrigger(feature: MicroFeature): void {
    globalEvents.emit('shortcuts:unregister', { id: feature.id });
    globalEvents.emit('automation:unregister', { id: feature.id });
  }

  executeFeature(featureId: string): void {
    const feature = this.features.get(featureId);
    if (!feature) return;

    try {
      feature.action();
      feature.usageCount++;
      globalEvents.emit('evolution:feature-executed', feature);
    } catch (error) {
      console.error(`[FeatureGenerator] Feature execution failed:`, error);
    }
  }

  // ----------------------------- Getters ------------------------------------
  getFeatures(): MicroFeature[] {
    return Array.from(this.features.values());
  }

  getActiveFeatures(): MicroFeature[] {
    return this.getFeatures().filter(f => f.status === 'active');
  }

  getProposedFeatures(): MicroFeature[] {
    return this.getFeatures().filter(f => f.status === 'proposed');
  }

  getFeature(featureId: string): MicroFeature | undefined {
    return this.features.get(featureId);
  }
}

export const featureGenerator = FeatureGenerator.getInstance();

