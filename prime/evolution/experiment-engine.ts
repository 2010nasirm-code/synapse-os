// ============================================================================
// NEXUS PRIME - EXPERIMENT ENGINE
// A/B testing and feature experimentation system
// ============================================================================

import { globalEvents } from '../core/events';

export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: ExperimentVariant[];
  metrics: string[];
  status: 'draft' | 'running' | 'paused' | 'completed';
  startedAt?: number;
  endedAt?: number;
  sampleSize: number;
  results?: ExperimentResults;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number; // Percentage of traffic
  config: Record<string, any>;
}

export interface ExperimentResults {
  variants: Map<string, VariantResults>;
  winner?: string;
  confidence: number;
  significance: boolean;
}

export interface VariantResults {
  sampleSize: number;
  metrics: Map<string, number>;
  conversionRate: number;
}

export class ExperimentEngine {
  private static instance: ExperimentEngine;
  private experiments = new Map<string, Experiment>();
  private userAssignments = new Map<string, Map<string, string>>(); // userId -> experimentId -> variantId
  private metricData = new Map<string, Array<{ variant: string; value: number; timestamp: number }>>();

  private constructor() {
    this.loadSavedExperiments();
  }

  static getInstance(): ExperimentEngine {
    if (!ExperimentEngine.instance) {
      ExperimentEngine.instance = new ExperimentEngine();
    }
    return ExperimentEngine.instance;
  }

  // ----------------------------- Experiment Management ----------------------
  createExperiment(experiment: Omit<Experiment, 'id' | 'status' | 'sampleSize'>): string {
    const fullExperiment: Experiment = {
      ...experiment,
      id: `exp-${Date.now()}`,
      status: 'draft',
      sampleSize: 0,
    };

    this.experiments.set(fullExperiment.id, fullExperiment);
    this.saveExperiments();

    globalEvents.emit('experiment:created', fullExperiment);
    return fullExperiment.id;
  }

  startExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'draft') return false;

    experiment.status = 'running';
    experiment.startedAt = Date.now();
    this.saveExperiments();

    globalEvents.emit('experiment:started', experiment);
    return true;
  }

  pauseExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') return false;

    experiment.status = 'paused';
    this.saveExperiments();

    globalEvents.emit('experiment:paused', experiment);
    return true;
  }

  endExperiment(experimentId: string): boolean {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') return false;

    experiment.status = 'completed';
    experiment.endedAt = Date.now();
    experiment.results = this.calculateResults(experimentId);
    this.saveExperiments();

    globalEvents.emit('experiment:ended', experiment);
    return true;
  }

  // ----------------------------- Variant Assignment -------------------------
  getVariant(experimentId: string, userId: string): ExperimentVariant | null {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') return null;

    // Check existing assignment
    let userExperiments = this.userAssignments.get(userId);
    if (!userExperiments) {
      userExperiments = new Map();
      this.userAssignments.set(userId, userExperiments);
    }

    let variantId = userExperiments.get(experimentId);

    if (!variantId) {
      // Assign based on weights
      variantId = this.assignVariant(experiment);
      userExperiments.set(experimentId, variantId);
      experiment.sampleSize++;
    }

    return experiment.variants.find(v => v.id === variantId) || null;
  }

  private assignVariant(experiment: Experiment): string {
    const random = Math.random() * 100;
    let cumulative = 0;

    for (const variant of experiment.variants) {
      cumulative += variant.weight;
      if (random < cumulative) {
        return variant.id;
      }
    }

    return experiment.variants[0]?.id || '';
  }

  // ----------------------------- Metric Recording ---------------------------
  recordMetric(experimentId: string, metricName: string, value: number, userId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment || experiment.status !== 'running') return;

    // Get user's variant
    const variantId = this.userAssignments.get(userId)?.get(experimentId);
    if (!variantId) return;

    // Store metric
    const key = `${experimentId}:${metricName}`;
    let data = this.metricData.get(key);
    if (!data) {
      data = [];
      this.metricData.set(key, data);
    }

    data.push({
      variant: variantId,
      value,
      timestamp: Date.now(),
    });

    globalEvents.emit('experiment:metric-recorded', {
      experimentId,
      metricName,
      variantId,
      value,
    });
  }

  recordConversion(experimentId: string, userId: string): void {
    this.recordMetric(experimentId, 'conversion', 1, userId);
  }

  // ----------------------------- Results Calculation ------------------------
  private calculateResults(experimentId: string): ExperimentResults {
    const experiment = this.experiments.get(experimentId)!;
    const variantResults = new Map<string, VariantResults>();

    for (const variant of experiment.variants) {
      const results: VariantResults = {
        sampleSize: 0,
        metrics: new Map(),
        conversionRate: 0,
      };

      // Count samples
      for (const [userId, assignments] of this.userAssignments) {
        if (assignments.get(experimentId) === variant.id) {
          results.sampleSize++;
        }
      }

      // Calculate metrics
      for (const metricName of experiment.metrics) {
        const key = `${experimentId}:${metricName}`;
        const data = this.metricData.get(key) || [];
        const variantData = data.filter(d => d.variant === variant.id);

        const sum = variantData.reduce((s, d) => s + d.value, 0);
        const avg = variantData.length > 0 ? sum / variantData.length : 0;
        results.metrics.set(metricName, avg);
      }

      // Calculate conversion rate
      const conversions = results.metrics.get('conversion') || 0;
      results.conversionRate = results.sampleSize > 0 
        ? (conversions * results.sampleSize) / results.sampleSize 
        : 0;

      variantResults.set(variant.id, results);
    }

    // Determine winner
    let winner: string | undefined;
    let maxConversion = 0;

    for (const [variantId, results] of variantResults) {
      if (results.conversionRate > maxConversion) {
        maxConversion = results.conversionRate;
        winner = variantId;
      }
    }

    // Simple significance calculation (simplified)
    const confidence = Math.min(0.95, experiment.sampleSize / 100);
    const significance = confidence > 0.9 && experiment.sampleSize > 50;

    return {
      variants: variantResults,
      winner,
      confidence,
      significance,
    };
  }

  // ----------------------------- Persistence --------------------------------
  private saveExperiments(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = Array.from(this.experiments.entries()).map(([id, exp]) => ({
        ...exp,
        results: exp.results ? {
          ...exp.results,
          variants: Array.from(exp.results.variants.entries()).map(([k, v]) => ({
            id: k,
            ...v,
            metrics: Array.from(v.metrics.entries()),
          })),
        } : undefined,
      }));

      localStorage.setItem('nexus-prime-experiments', JSON.stringify(data));
    } catch (e) {
      console.warn('[ExperimentEngine] Failed to save:', e);
    }
  }

  private loadSavedExperiments(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const saved = localStorage.getItem('nexus-prime-experiments');
      if (saved) {
        const data = JSON.parse(saved);
        for (const expData of data) {
          // Reconstruct experiment
          const experiment: Experiment = {
            ...expData,
            results: expData.results ? {
              ...expData.results,
              variants: new Map(expData.results.variants.map((v: any) => [
                v.id,
                { ...v, metrics: new Map(v.metrics) },
              ])),
            } : undefined,
          };
          this.experiments.set(experiment.id, experiment);
        }
      }
    } catch (e) {
      console.warn('[ExperimentEngine] Failed to load:', e);
    }
  }

  // ----------------------------- Getters ------------------------------------
  getExperiment(experimentId: string): Experiment | undefined {
    return this.experiments.get(experimentId);
  }

  getExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }

  getRunningExperiments(): Experiment[] {
    return this.getExperiments().filter(e => e.status === 'running');
  }
}

export const experimentEngine = ExperimentEngine.getInstance();

