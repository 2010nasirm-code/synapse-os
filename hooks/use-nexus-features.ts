"use client";

import { useState, useEffect, useCallback } from 'react';
import { temporalUI, UIOptimization } from '@/lib/nexus/temporal-ui';
import { predictiveFlow, PredictedAction } from '@/lib/nexus/predictive-flow';
import { adaptiveComplexity, UserSkillProfile, UserLevel } from '@/lib/nexus/adaptive-complexity';
import { diagnostics, SystemHealth } from '@/lib/diagnostics/system-check';
import { selfHealing, SystemStatus } from '@/lib/nexus/self-healing';

export function useTemporalUI() {
  const [optimizations, setOptimizations] = useState<UIOptimization[]>([]);
  const [highlightedElements, setHighlightedElements] = useState<string[]>([]);

  useEffect(() => {
    setOptimizations(temporalUI.getOptimizations());
    setHighlightedElements(temporalUI.getHighlightedElements());
  }, []);

  const recordInteraction = useCallback((element: string, action: 'click' | 'hover' | 'focus' | 'scroll', context: string) => {
    temporalUI.recordInteraction({ element, action, context });
    setOptimizations(temporalUI.getOptimizations());
    setHighlightedElements(temporalUI.getHighlightedElements());
  }, []);

  const predictNext = useCallback(() => {
    return temporalUI.predictNext();
  }, []);

  return {
    optimizations,
    highlightedElements,
    recordInteraction,
    predictNext,
  };
}

export function usePredictiveFlow() {
  const [predictions, setPredictions] = useState<PredictedAction[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPredictions(predictiveFlow.getPredictions());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const recordAction = useCallback((action: string, context: string) => {
    predictiveFlow.recordAction(action, context);
    setPredictions(predictiveFlow.getPredictions());
  }, []);

  const registerPrefetch = useCallback((action: string, callback: () => Promise<any>) => {
    predictiveFlow.registerPrefetch(action, callback);
  }, []);

  const getPreloadedData = useCallback((action: string) => {
    return predictiveFlow.getPreloadedData(action);
  }, []);

  return {
    predictions,
    recordAction,
    registerPrefetch,
    getPreloadedData,
  };
}

export function useAdaptiveComplexity() {
  const [profile, setProfile] = useState<UserSkillProfile | null>(null);
  const [availableFeatures, setAvailableFeatures] = useState<string[]>([]);

  useEffect(() => {
    setProfile(adaptiveComplexity.getProfile());
    setAvailableFeatures(adaptiveComplexity.getAvailableFeatures().map(f => f.feature));

    const unsubscribe = adaptiveComplexity.subscribe((newProfile) => {
      setProfile(newProfile);
      setAvailableFeatures(adaptiveComplexity.getAvailableFeatures().map(f => f.feature));
    });

    return () => { unsubscribe(); };
  }, []);

  const recordAction = useCallback((action: string, isAdvanced: boolean = false) => {
    adaptiveComplexity.recordAction(action, isAdvanced);
  }, []);

  const isFeatureAvailable = useCallback((feature: string) => {
    return adaptiveComplexity.isFeatureAvailable(feature);
  }, []);

  const getNextUnlocks = useCallback(() => {
    return adaptiveComplexity.getNextUnlocks();
  }, []);

  const setLevel = useCallback((level: UserLevel) => {
    adaptiveComplexity.setLevel(level);
  }, []);

  return {
    profile,
    availableFeatures,
    recordAction,
    isFeatureAvailable,
    getNextUnlocks,
    setLevel,
  };
}

export function useSystemHealth() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [healingStatus, setHealingStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    diagnostics.runFullDiagnostics().then(setHealth);
    setHealingStatus(selfHealing.getStatus());

    const unsubscribeDiag = diagnostics.subscribe(setHealth);
    const unsubscribeHeal = selfHealing.subscribe(setHealingStatus);

    return () => {
      unsubscribeDiag();
      unsubscribeHeal();
    };
  }, []);

  const runDiagnostics = useCallback(async () => {
    const result = await diagnostics.runFullDiagnostics();
    setHealth(result);
    return result;
  }, []);

  const forceHeal = useCallback(() => {
    selfHealing.forceHeal();
  }, []);

  return {
    health,
    healingStatus,
    runDiagnostics,
    forceHeal,
  };
}

// Combined hook for all Nexus features
export function useNexus() {
  const temporalUI = useTemporalUI();
  const predictiveFlow = usePredictiveFlow();
  const adaptiveComplexity = useAdaptiveComplexity();
  const systemHealth = useSystemHealth();

  return {
    temporalUI,
    predictiveFlow,
    adaptiveComplexity,
    systemHealth,
  };
}

