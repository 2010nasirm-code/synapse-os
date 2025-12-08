// ============================================================================
// NEXUS HOOKS - Main Nexus Hook
// ============================================================================

'use client';

import { useState, useCallback } from 'react';

interface NexusResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface UseNexusOptions {
  onError?: (error: string) => void;
  onSuccess?: (data: unknown) => void;
}

export function useNexus(options: UseNexusOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(async <T>(
    action: string,
    params: Record<string, unknown> = {}
  ): Promise<NexusResponse<T>> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/nexus-fusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...params }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Request failed');
      }

      options.onSuccess?.(result.data);
      return { success: true, data: result.data };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      options.onError?.(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [options]);

  // Query
  const query = useCallback(async (
    queryText: string,
    options: { mode?: string; context?: Record<string, unknown> } = {}
  ) => {
    return call<{
      id: string;
      answer: string;
      reasoning?: string;
      suggestions?: string[];
    }>('query', { query: queryText, ...options });
  }, [call]);

  // Memory
  const memory = {
    add: useCallback(async (content: string, type?: string, tags?: string[]) => {
      return call('memory.add', { content, type, tags });
    }, [call]),

    search: useCallback(async (query: string, limit?: number) => {
      return call('memory.search', { query, limit });
    }, [call]),

    stats: useCallback(async () => {
      return call('memory.stats', {});
    }, [call]),
  };

  // Trackers
  const trackers = {
    create: useCallback(async (name: string, type: string, category?: string) => {
      return call('trackers.create', { name, type, category });
    }, [call]),

    track: useCallback(async (id: string, value: unknown) => {
      return call('trackers.track', { id, value });
    }, [call]),

    list: useCallback(async (options?: { type?: string; category?: string }) => {
      return call('trackers.list', options || {});
    }, [call]),
  };

  // Automations
  const automations = {
    create: useCallback(async (
      name: string,
      trigger: { type: string; config: Record<string, unknown> },
      actions: Array<{ type: string; config: Record<string, unknown> }>
    ) => {
      return call('automations.create', { name, trigger, actions });
    }, [call]),

    activate: useCallback(async (id: string) => {
      return call('automations.activate', { id });
    }, [call]),

    deactivate: useCallback(async (id: string) => {
      return call('automations.deactivate', { id });
    }, [call]),

    trigger: useCallback(async (id: string, context?: Record<string, unknown>) => {
      return call('automations.trigger', { id, context });
    }, [call]),

    list: useCallback(async () => {
      return call('automations.list', {});
    }, [call]),
  };

  // Knowledge
  const knowledge = {
    create: useCallback(async (
      title: string,
      content: string,
      type?: string,
      tags?: string[]
    ) => {
      return call('knowledge.create', { title, content, type: type || 'note', tags });
    }, [call]),

    search: useCallback(async (query: string, options?: { type?: string; limit?: number }) => {
      return call('knowledge.search', { query, ...options });
    }, [call]),

    link: useCallback(async (sourceId: string, targetId: string, type: string) => {
      return call('knowledge.link', { sourceId, targetId, type });
    }, [call]),

    graph: useCallback(async () => {
      return call('knowledge.graph', {});
    }, [call]),
  };

  // Suggestions
  const suggestions = {
    generate: useCallback(async (context?: Record<string, unknown>) => {
      return call('suggestions.generate', { context });
    }, [call]),

    accept: useCallback(async (id: string) => {
      return call('suggestions.accept', { id });
    }, [call]),

    reject: useCallback(async (id: string, reason?: string) => {
      return call('suggestions.reject', { id, reason });
    }, [call]),

    list: useCallback(async () => {
      return call('suggestions.list', {});
    }, [call]),
  };

  // Analytics
  const analytics = {
    track: useCallback(async (type: string, category: string, data?: Record<string, unknown>) => {
      return call('analytics.track', { type, category, data });
    }, [call]),

    dashboard: useCallback(async () => {
      return call('analytics.dashboard', {});
    }, [call]),

    insights: useCallback(async () => {
      return call('analytics.insights', {});
    }, [call]),
  };

  // Agents
  const agents = {
    create: useCallback(async (
      name: string,
      capabilities: string[],
      description?: string
    ) => {
      return call('agents.create', { name, capabilities, description });
    }, [call]),

    start: useCallback(async (id: string) => {
      return call('agents.start', { id });
    }, [call]),

    stop: useCallback(async (id: string) => {
      return call('agents.stop', { id });
    }, [call]),

    execute: useCallback(async (id: string, task: { type: string; data: unknown }) => {
      return call('agents.execute', { id, task });
    }, [call]),

    list: useCallback(async () => {
      return call('agents.list', {});
    }, [call]),
  };

  // System
  const system = {
    stats: useCallback(async () => {
      return call('system.stats', {});
    }, [call]),

    health: useCallback(async () => {
      return call('system.health', {});
    }, [call]),
  };

  return {
    loading,
    error,
    call,
    query,
    memory,
    trackers,
    automations,
    knowledge,
    suggestions,
    analytics,
    agents,
    system,
  };
}

// Shorthand hooks for specific modules
export function useNexusQuery() {
  const { query, loading, error } = useNexus();
  return { query, loading, error };
}

export function useNexusMemory() {
  const { memory, loading, error } = useNexus();
  return { ...memory, loading, error };
}

export function useNexusTrackers() {
  const { trackers, loading, error } = useNexus();
  return { ...trackers, loading, error };
}

export function useNexusAutomations() {
  const { automations, loading, error } = useNexus();
  return { ...automations, loading, error };
}

export function useNexusKnowledge() {
  const { knowledge, loading, error } = useNexus();
  return { ...knowledge, loading, error };
}

export function useNexusSuggestions() {
  const { suggestions, loading, error } = useNexus();
  return { ...suggestions, loading, error };
}

export function useNexusAnalytics() {
  const { analytics, loading, error } = useNexus();
  return { ...analytics, loading, error };
}

export function useNexusAgents() {
  const { agents, loading, error } = useNexus();
  return { ...agents, loading, error };
}


