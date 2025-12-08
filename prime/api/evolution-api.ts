// ============================================================================
// NEXUS PRIME - EVOLUTION API
// Feature evolution and experiment management
// ============================================================================

import { featureGenerator, MicroFeature } from '../evolution/feature-generator';
import { experimentEngine, Experiment, ExperimentVariant } from '../evolution/experiment-engine';
import { learningSystem, LearningInsight } from '../evolution/learning-system';
import { globalEvents } from '../core/events';

export interface EvolutionStatus {
  features: {
    total: number;
    active: number;
    proposed: number;
  };
  experiments: {
    total: number;
    running: number;
  };
  insights: {
    total: number;
    actionable: number;
  };
}

class EvolutionAPI {
  // ----------------------------- Status -------------------------------------
  getStatus(): EvolutionStatus {
    const features = featureGenerator.getFeatures();
    const experiments = experimentEngine.getExperiments();
    const insights = learningSystem.getInsights();

    return {
      features: {
        total: features.length,
        active: features.filter(f => f.status === 'active').length,
        proposed: features.filter(f => f.status === 'proposed').length,
      },
      experiments: {
        total: experiments.length,
        running: experiments.filter(e => e.status === 'running').length,
      },
      insights: {
        total: insights.length,
        actionable: insights.filter(i => i.actionable).length,
      },
    };
  }

  // ----------------------------- Features -----------------------------------
  getFeatures(): MicroFeature[] {
    return featureGenerator.getFeatures();
  }

  getProposedFeatures(): MicroFeature[] {
    return featureGenerator.getProposedFeatures();
  }

  getActiveFeatures(): MicroFeature[] {
    return featureGenerator.getActiveFeatures();
  }

  activateFeature(featureId: string): boolean {
    return featureGenerator.activateFeature(featureId);
  }

  deactivateFeature(featureId: string): boolean {
    return featureGenerator.deactivateFeature(featureId);
  }

  executeFeature(featureId: string): void {
    featureGenerator.executeFeature(featureId);
  }

  // ----------------------------- Experiments --------------------------------
  getExperiments(): Experiment[] {
    return experimentEngine.getExperiments();
  }

  getRunningExperiments(): Experiment[] {
    return experimentEngine.getRunningExperiments();
  }

  createExperiment(config: {
    name: string;
    description: string;
    variants: Array<{
      name: string;
      weight: number;
      config: Record<string, any>;
    }>;
    metrics: string[];
  }): string {
    const variants: ExperimentVariant[] = config.variants.map((v, i) => ({
      id: `variant-${i}`,
      ...v,
    }));

    return experimentEngine.createExperiment({
      name: config.name,
      description: config.description,
      variants,
      metrics: config.metrics,
    });
  }

  startExperiment(experimentId: string): boolean {
    return experimentEngine.startExperiment(experimentId);
  }

  pauseExperiment(experimentId: string): boolean {
    return experimentEngine.pauseExperiment(experimentId);
  }

  endExperiment(experimentId: string): boolean {
    return experimentEngine.endExperiment(experimentId);
  }

  getVariantForUser(experimentId: string, userId: string): ExperimentVariant | null {
    return experimentEngine.getVariant(experimentId, userId);
  }

  recordExperimentMetric(experimentId: string, metricName: string, value: number, userId: string): void {
    experimentEngine.recordMetric(experimentId, metricName, value, userId);
  }

  recordConversion(experimentId: string, userId: string): void {
    experimentEngine.recordConversion(experimentId, userId);
  }

  // ----------------------------- Learning -----------------------------------
  getInsights(): LearningInsight[] {
    return learningSystem.getInsights();
  }

  getActionableInsights(): LearningInsight[] {
    return learningSystem.getActionableInsights();
  }

  applyInsight(insightId: string): void {
    const insights = learningSystem.getInsights();
    const insight = insights.find(i => i.id === insightId);
    
    if (insight?.action) {
      insight.action();
      globalEvents.emit('evolution:insight-applied', insight);
    }
  }

  getSuccessRate(key: string): number {
    return learningSystem.getSuccessRate(key);
  }

  getPreference(key: string): number {
    return learningSystem.getPreference(key);
  }

  // ----------------------------- Controls -----------------------------------
  setLearningRate(rate: number): void {
    learningSystem.setLearningRate(rate);
  }

  clearLearningData(): void {
    learningSystem.clearLearningData();
  }
}

export const evolutionAPI = new EvolutionAPI();

