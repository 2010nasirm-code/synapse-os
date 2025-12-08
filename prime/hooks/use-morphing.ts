'use client';

// ============================================================================
// NEXUS PRIME - MORPHING HOOK
// React hook for quantum UI morphing
// ============================================================================

import { useCallback, useRef, useEffect } from 'react';
import { quantumMorph, MorphProperties, MorphContext } from '../ui/quantum-morph';

export function useMorph(elementId: string, elementType: string = 'card') {
  const morphRef = useRef<HTMLElement | null>(null);

  // Set up element ID on mount
  useEffect(() => {
    if (morphRef.current && !morphRef.current.id) {
      morphRef.current.id = elementId;
    }
  }, [elementId]);

  // Morph function
  const morph = useCallback((properties: MorphProperties, duration: number = 200) => {
    quantumMorph.morph({
      elementId,
      properties,
      duration,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    });
  }, [elementId]);

  // Context-based morphing
  const morphByContext = useCallback((context: MorphContext) => {
    quantumMorph.morphByContext(elementId, elementType, context);
  }, [elementId, elementType]);

  // Reset morph
  const reset = useCallback(() => {
    quantumMorph.resetMorph(elementId);
  }, [elementId]);

  // Hover handlers
  const hoverHandlers = {
    onMouseEnter: () => morphByContext({ type: 'hover' }),
    onMouseLeave: () => reset(),
  };

  // Focus handlers
  const focusHandlers = {
    onFocus: () => morphByContext({ type: 'focus' }),
    onBlur: () => reset(),
  };

  // Active handlers
  const activeHandlers = {
    onMouseDown: () => morphByContext({ type: 'active' }),
    onMouseUp: () => morphByContext({ type: 'hover' }),
  };

  return {
    ref: morphRef,
    morph,
    morphByContext,
    reset,
    hoverHandlers,
    focusHandlers,
    activeHandlers,
    allHandlers: { ...hoverHandlers, ...focusHandlers, ...activeHandlers },
  };
}

export function useMorphGroup(groupId: string) {
  const morph = useCallback((properties: MorphProperties) => {
    quantumMorph.morphGroup(groupId, properties);
  }, [groupId]);

  const reset = useCallback(() => {
    if (typeof document === 'undefined') return;

    const elements = document.querySelectorAll(`[data-morph-group="${groupId}"]`);
    elements.forEach((element) => {
      quantumMorph.resetMorph(element.id);
    });
  }, [groupId]);

  return { morph, reset };
}

export function usePrimeFeedback() {
  // Highlight effect
  const highlight = useCallback((elementId: string) => {
    quantumMorph.morph({
      elementId,
      properties: { scale: 1.05, brightness: 1.1 },
      duration: 150,
      easing: 'ease-out',
    });

    setTimeout(() => {
      quantumMorph.resetMorph(elementId);
    }, 200);
  }, []);

  // Pulse effect
  const pulse = useCallback((elementId: string) => {
    const sequence = [
      { scale: 1.05 },
      { scale: 1.0 },
      { scale: 1.03 },
      { scale: 1.0 },
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i >= sequence.length) {
        clearInterval(interval);
        return;
      }
      quantumMorph.morph({
        elementId,
        properties: sequence[i],
        duration: 100,
        easing: 'ease-in-out',
      });
      i++;
    }, 100);
  }, []);

  // Shake effect (for errors)
  const shake = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.animate([
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(0)' },
    ], {
      duration: 300,
      easing: 'ease-in-out',
    });
  }, []);

  // Success effect
  const success = useCallback((elementId: string) => {
    quantumMorph.morph({
      elementId,
      properties: { 
        scale: 1.1, 
        custom: { 
          boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)' 
        } 
      },
      duration: 200,
      easing: 'ease-out',
    });

    setTimeout(() => {
      quantumMorph.resetMorph(elementId);
    }, 500);
  }, []);

  return { highlight, pulse, shake, success };
}

