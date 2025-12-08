'use client';

// ============================================================================
// NEXUS PRIME - MAIN HOOK
// Central hook for Nexus Prime system access
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { primeAPI, NexusPrimeStatus } from '../api/prime-api';
import { PrimeConfig } from '../core/config';

export function usePrime() {
  const [status, setStatus] = useState<NexusPrimeStatus | null>(null);
  const [config, setConfigState] = useState<PrimeConfig | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Nexus Prime
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await primeAPI.initialize();
        if (mounted) {
          setInitialized(true);
          setStatus(primeAPI.getStatus());
          setConfigState(primeAPI.getConfig());
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Initialization failed');
        }
      }
    };

    init();

    // Subscribe to state changes
    const unsubscribe = primeAPI.subscribeToState((state) => {
      if (mounted) {
        setStatus(primeAPI.getStatus());
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Update config
  const updateConfig = useCallback((updates: Partial<PrimeConfig>) => {
    primeAPI.updateConfig(updates);
    setConfigState(primeAPI.getConfig());
  }, []);

  // Reset config
  const resetConfig = useCallback(() => {
    primeAPI.resetConfig();
    setConfigState(primeAPI.getConfig());
  }, []);

  // Run perfection check
  const runPerfectionCheck = useCallback(async () => {
    return primeAPI.runPerfectionCheck();
  }, []);

  // Trigger reset
  const triggerSoftReset = useCallback(async (component?: string) => {
    return primeAPI.triggerSoftReset(component);
  }, []);

  return {
    status,
    config,
    initialized,
    error,
    updateConfig,
    resetConfig,
    runPerfectionCheck,
    triggerSoftReset,
    getFlowState: primeAPI.getFlowState.bind(primeAPI),
    getPatterns: primeAPI.getPatterns.bind(primeAPI),
    getInferredPreferences: primeAPI.getInferredPreferences.bind(primeAPI),
  };
}

export function usePrimeEvents() {
  const subscribe = useCallback((event: string, handler: (data: any) => void) => {
    return primeAPI.on(event, handler);
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    primeAPI.emit(event, data);
  }, []);

  return { subscribe, emit };
}

export function usePrimeState<T = any>(key?: string) {
  const [state, setState] = useState<T | null>(null);

  useEffect(() => {
    // Initial state
    const fullState = primeAPI.getState();
    setState(key ? (fullState as any)[key] : fullState);

    // Subscribe to changes
    const unsubscribe = primeAPI.subscribeToState((newState) => {
      setState(key ? (newState as any)[key] : newState);
    });

    return unsubscribe;
  }, [key]);

  const updateState = useCallback((updates: any) => {
    if (key) {
      primeAPI.setState({ [key]: updates } as any);
    } else {
      primeAPI.setState(updates);
    }
  }, [key]);

  return [state, updateState] as const;
}

