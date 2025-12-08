"use client";

import { useCallback, useEffect, useRef } from "react";
import { logger } from "@/lib/debug/logger";
import { getSupabaseClient } from "@/lib/supabase/client";

interface InteractionEvent {
  component: string;
  action: string;
  data?: Record<string, any>;
  timestamp: string;
}

/**
 * Hook for tracking user interactions across the app
 * Automatically logs to debug console and optionally to Supabase
 */
export function useInteractionTracker(componentName: string) {
  const supabase = getSupabaseClient();
  const interactionBuffer = useRef<InteractionEvent[]>([]);
  const flushTimeout = useRef<NodeJS.Timeout | null>(null);

  // Flush interactions to Supabase in batches
  const flushInteractions = useCallback(async () => {
    if (interactionBuffer.current.length === 0) return;

    const events = [...interactionBuffer.current];
    interactionBuffer.current = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Batch insert events
      const { error } = await supabase.from("analytics_events").insert(
        events.map((event) => ({
          user_id: user.id,
          event_type: "interaction",
          event_data: event,
        }))
      );

      if (error) {
        logger.warn("ui", "Failed to persist interactions", { error: error.message });
      }
    } catch (error: any) {
      logger.warn("ui", "Error flushing interactions", { error: error.message });
    }
  }, [supabase]);

  // Schedule flush
  const scheduleFlush = useCallback(() => {
    if (flushTimeout.current) {
      clearTimeout(flushTimeout.current);
    }
    flushTimeout.current = setTimeout(flushInteractions, 5000);
  }, [flushInteractions]);

  // Track interaction
  const track = useCallback((action: string, data?: Record<string, any>) => {
    const event: InteractionEvent = {
      component: componentName,
      action,
      data,
      timestamp: new Date().toISOString(),
    };

    // Log to debug console
    logger.trackInteraction(componentName, action, data);

    // Buffer for batch persistence
    interactionBuffer.current.push(event);
    scheduleFlush();
  }, [componentName, scheduleFlush]);

  // Track page view on mount
  useEffect(() => {
    track("viewed");
    
    return () => {
      if (flushTimeout.current) {
        clearTimeout(flushTimeout.current);
        flushInteractions();
      }
    };
  }, []);

  // Track specific actions
  const trackClick = useCallback((buttonName: string, data?: Record<string, any>) => {
    track("click", { button: buttonName, ...data });
  }, [track]);

  const trackChange = useCallback((fieldName: string, data?: Record<string, any>) => {
    track("change", { field: fieldName, ...data });
  }, [track]);

  const trackError = useCallback((error: string, data?: Record<string, any>) => {
    track("error", { error, ...data });
  }, [track]);

  const trackSuccess = useCallback((message: string, data?: Record<string, any>) => {
    track("success", { message, ...data });
  }, [track]);

  return {
    track,
    trackClick,
    trackChange,
    trackError,
    trackSuccess,
  };
}

// Specialized trackers for specific modules

export function useSuggestionTracker() {
  const tracker = useInteractionTracker("suggestions");

  return {
    ...tracker,
    trackGenerate: (data?: Record<string, any>) => {
      logger.trackSuggestion("generated", undefined, data);
      tracker.track("generate", data);
    },
    trackView: (suggestionId: string, data?: Record<string, any>) => {
      logger.trackSuggestion("viewed", suggestionId, data);
      tracker.track("view_suggestion", { suggestionId, ...data });
    },
    trackApply: (suggestionId: string, data?: Record<string, any>) => {
      logger.trackSuggestion("applied", suggestionId, data);
      tracker.track("apply_suggestion", { suggestionId, ...data });
    },
    trackDismiss: (suggestionId: string, data?: Record<string, any>) => {
      logger.trackSuggestion("dismissed", suggestionId, data);
      tracker.track("dismiss_suggestion", { suggestionId, ...data });
    },
  };
}

export function useAutomationTracker() {
  const tracker = useInteractionTracker("automations");

  return {
    ...tracker,
    trackCreate: (data?: Record<string, any>) => {
      logger.trackAutomation("created", undefined, data);
      tracker.track("create", data);
    },
    trackUpdate: (automationId: string, data?: Record<string, any>) => {
      logger.trackAutomation("updated", automationId, data);
      tracker.track("update", { automationId, ...data });
    },
    trackDelete: (automationId: string) => {
      logger.trackAutomation("deleted", automationId);
      tracker.track("delete", { automationId });
    },
    trackToggle: (automationId: string, isActive: boolean) => {
      logger.trackAutomation("toggled", automationId, { isActive });
      tracker.track("toggle", { automationId, isActive });
    },
    trackTrigger: (automationId: string, result?: string) => {
      logger.trackAutomation("triggered", automationId, { result });
      tracker.track("trigger", { automationId, result });
    },
  };
}

export function useGraphTracker() {
  const tracker = useInteractionTracker("thought-graph");

  return {
    ...tracker,
    trackNodeClick: (nodeId: string, nodeType: string) => {
      logger.trackGraph("node_clicked", { nodeId, nodeType });
      tracker.track("node_click", { nodeId, nodeType });
    },
    trackFilter: (filterType: string) => {
      logger.trackGraph("filtered", { filterType });
      tracker.track("filter", { filterType });
    },
    trackSearch: (query: string, resultCount: number) => {
      logger.trackGraph("searched", { query, resultCount });
      tracker.track("search", { query, resultCount });
    },
    trackZoom: (zoomLevel: number) => {
      logger.trackGraph("zoomed", { zoomLevel });
      tracker.track("zoom", { zoomLevel });
    },
    trackPan: () => {
      logger.trackGraph("viewed", { action: "pan" });
    },
  };
}

// Performance tracking hook
export function usePerformanceTracker(componentName: string) {
  const mountTime = useRef<number>(0);

  useEffect(() => {
    mountTime.current = performance.now();
    logger.startTimer(`${componentName}_render`);

    return () => {
      const duration = logger.endTimer(`${componentName}_render`);
      if (duration && duration > 100) {
        logger.warn("performance", `Slow render: ${componentName}`, { duration: `${duration.toFixed(2)}ms` });
      }
    };
  }, [componentName]);

  const trackOperation = useCallback((operationName: string) => {
    const timerName = `${componentName}_${operationName}`;
    
    return {
      start: () => logger.startTimer(timerName),
      end: () => logger.endTimer(timerName),
    };
  }, [componentName]);

  return { trackOperation };
}


