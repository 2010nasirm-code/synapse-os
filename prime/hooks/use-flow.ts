'use client';

// ============================================================================
// NEXUS PRIME - FLOW STATE HOOK
// React hook for flow state and adaptation
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { flowStateEngine, FlowState, FlowAdaptation, FlowMetrics } from '../intelligence/flow-state';
import { primeAPI } from '../api/prime-api';

export function useFlowState() {
  const [state, setState] = useState<FlowState>('idle');
  const [metrics, setMetrics] = useState<FlowMetrics | null>(null);
  const [adaptation, setAdaptation] = useState<FlowAdaptation | null>(null);

  useEffect(() => {
    // Initial state
    setState(flowStateEngine.getCurrentState());
    setMetrics(flowStateEngine.getMetrics());
    setAdaptation(flowStateEngine.getAdaptation());

    // Subscribe to changes
    const unsubscribe = primeAPI.on('flow:state-change', (data) => {
      setState(data.to);
      setMetrics(data.metrics);
      setAdaptation(data.adaptation);
    });

    return unsubscribe;
  }, []);

  return {
    state,
    metrics,
    adaptation,
  };
}

export function useAdaptiveUI() {
  const { state, adaptation } = useFlowState();

  // Get CSS class based on current flow state
  const getFlowClass = useCallback(() => {
    switch (state) {
      case 'focused':
        return 'prime-flow-focused';
      case 'rushed':
        return 'prime-flow-rushed';
      case 'productive':
        return 'prime-flow-productive';
      case 'exploring':
        return 'prime-flow-exploring';
      default:
        return 'prime-flow-idle';
    }
  }, [state]);

  // Get animation duration modifier
  const getAnimationDuration = useCallback((baseDuration: number) => {
    return baseDuration * (adaptation?.animationSpeed || 1);
  }, [adaptation]);

  // Check if should auto-hide element
  const shouldAutoHide = useCallback(() => {
    return adaptation?.autoHideElements || false;
  }, [adaptation]);

  // Get layout density
  const getLayoutDensity = useCallback(() => {
    return adaptation?.layoutDensity || 'normal';
  }, [adaptation]);

  return {
    state,
    adaptation,
    getFlowClass,
    getAnimationDuration,
    shouldAutoHide,
    getLayoutDensity,
  };
}

export function useTemporalAwareness() {
  const [mode, setMode] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('afternoon');

  useEffect(() => {
    setMode(primeAPI.getTemporalMode());

    const unsubscribe = primeAPI.on('temporal:mode-change', (data) => {
      setMode(data.to);
    });

    return unsubscribe;
  }, []);

  const setTemporalMode = useCallback((newMode: typeof mode) => {
    primeAPI.setTemporalMode(newMode);
  }, []);

  return {
    mode,
    setMode: setTemporalMode,
    isMorning: mode === 'morning',
    isAfternoon: mode === 'afternoon',
    isEvening: mode === 'evening',
    isNight: mode === 'night',
  };
}

