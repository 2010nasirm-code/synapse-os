'use client';

// ============================================================================
// NEXUS PRIME - EVOLUTION HOOK
// React hook for feature evolution and experiments
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { evolutionAPI, EvolutionStatus } from '../api/evolution-api';
import { MicroFeature } from '../evolution/feature-generator';
import { LearningInsight } from '../evolution/learning-system';
import { primeAPI } from '../api/prime-api';

export function useEvolution() {
  const [status, setStatus] = useState<EvolutionStatus | null>(null);
  const [features, setFeatures] = useState<MicroFeature[]>([]);
  const [insights, setInsights] = useState<LearningInsight[]>([]);

  // Load data
  useEffect(() => {
    const loadData = () => {
      setStatus(evolutionAPI.getStatus());
      setFeatures(evolutionAPI.getFeatures());
      setInsights(evolutionAPI.getInsights());
    };

    loadData();

    // Subscribe to evolution events
    const unsubscribe = primeAPI.on('evolution:*', loadData);

    return unsubscribe;
  }, []);

  // Feature controls
  const activateFeature = useCallback((featureId: string) => {
    const result = evolutionAPI.activateFeature(featureId);
    setFeatures(evolutionAPI.getFeatures());
    return result;
  }, []);

  const deactivateFeature = useCallback((featureId: string) => {
    const result = evolutionAPI.deactivateFeature(featureId);
    setFeatures(evolutionAPI.getFeatures());
    return result;
  }, []);

  const executeFeature = useCallback((featureId: string) => {
    evolutionAPI.executeFeature(featureId);
  }, []);

  // Insight controls
  const applyInsight = useCallback((insightId: string) => {
    evolutionAPI.applyInsight(insightId);
    setInsights(evolutionAPI.getInsights());
  }, []);

  return {
    status,
    features,
    activeFeatures: features.filter(f => f.status === 'active'),
    proposedFeatures: features.filter(f => f.status === 'proposed'),
    insights,
    actionableInsights: insights.filter(i => i.actionable),
    activateFeature,
    deactivateFeature,
    executeFeature,
    applyInsight,
  };
}

export function useExperiments() {
  const [experiments, setExperiments] = useState(evolutionAPI.getExperiments());

  useEffect(() => {
    const loadExperiments = () => {
      setExperiments(evolutionAPI.getExperiments());
    };

    loadExperiments();

    const unsubscribe = primeAPI.on('experiment:*', loadExperiments);

    return unsubscribe;
  }, []);

  const createExperiment = useCallback((config: Parameters<typeof evolutionAPI.createExperiment>[0]) => {
    const id = evolutionAPI.createExperiment(config);
    setExperiments(evolutionAPI.getExperiments());
    return id;
  }, []);

  const startExperiment = useCallback((experimentId: string) => {
    const result = evolutionAPI.startExperiment(experimentId);
    setExperiments(evolutionAPI.getExperiments());
    return result;
  }, []);

  const endExperiment = useCallback((experimentId: string) => {
    const result = evolutionAPI.endExperiment(experimentId);
    setExperiments(evolutionAPI.getExperiments());
    return result;
  }, []);

  return {
    experiments,
    runningExperiments: experiments.filter(e => e.status === 'running'),
    createExperiment,
    startExperiment,
    endExperiment,
    getVariant: evolutionAPI.getVariantForUser.bind(evolutionAPI),
    recordMetric: evolutionAPI.recordExperimentMetric.bind(evolutionAPI),
    recordConversion: evolutionAPI.recordConversion.bind(evolutionAPI),
  };
}

export function useLearning() {
  const getSuccessRate = useCallback((key: string) => {
    return evolutionAPI.getSuccessRate(key);
  }, []);

  const getPreference = useCallback((key: string) => {
    return evolutionAPI.getPreference(key);
  }, []);

  const setLearningRate = useCallback((rate: number) => {
    evolutionAPI.setLearningRate(rate);
  }, []);

  return {
    getSuccessRate,
    getPreference,
    setLearningRate,
    clearData: evolutionAPI.clearLearningData.bind(evolutionAPI),
  };
}

