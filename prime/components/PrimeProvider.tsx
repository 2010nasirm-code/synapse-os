'use client';

// ============================================================================
// NEXUS PRIME - PROVIDER COMPONENT
// Initializes and provides Nexus Prime context to the app
// ============================================================================

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { primeAPI, NexusPrimeStatus } from '../api/prime-api';
import { PrimeConfig } from '../core/config';

interface PrimeContextType {
  status: NexusPrimeStatus | null;
  config: PrimeConfig | null;
  initialized: boolean;
  error: string | null;
}

const PrimeContext = createContext<PrimeContextType>({
  status: null,
  config: null,
  initialized: false,
  error: null,
});

export function usePrimeContext() {
  return useContext(PrimeContext);
}

interface PrimeProviderProps {
  children: ReactNode;
  autoInitialize?: boolean;
}

export function PrimeProvider({ children, autoInitialize = true }: PrimeProviderProps) {
  const [status, setStatus] = useState<NexusPrimeStatus | null>(null);
  const [config, setConfig] = useState<PrimeConfig | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoInitialize) return;

    let mounted = true;

    const init = async () => {
      try {
        await primeAPI.initialize();
        
        if (mounted) {
          setInitialized(true);
          setStatus(primeAPI.getStatus());
          setConfig(primeAPI.getConfig());
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Initialization failed');
        }
      }
    };

    init();

    // Subscribe to updates
    const unsubscribe = primeAPI.subscribeToState(() => {
      if (mounted) {
        setStatus(primeAPI.getStatus());
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [autoInitialize]);

  return (
    <PrimeContext.Provider value={{ status, config, initialized, error }}>
      {children}
    </PrimeContext.Provider>
  );
}

