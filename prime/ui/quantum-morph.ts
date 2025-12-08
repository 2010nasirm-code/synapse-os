// ============================================================================
// NEXUS PRIME - QUANTUM UI MORPHING
// Dynamic element adaptation based on context and interaction
// ============================================================================

import { globalEvents } from '../core/events';
import { getConfig } from '../core/config';

export interface MorphTarget {
  elementId: string;
  properties: MorphProperties;
  duration: number;
  easing: string;
}

export interface MorphProperties {
  scale?: number;
  opacity?: number;
  blur?: number;
  brightness?: number;
  x?: number;
  y?: number;
  rotation?: number;
  borderRadius?: number;
  width?: number | string;
  height?: number | string;
  padding?: number | string;
  gap?: number;
  zIndex?: number;
  custom?: Record<string, string>;
}

export interface MorphContext {
  type: 'hover' | 'focus' | 'active' | 'selected' | 'contextual' | 'temporal' | 'flow';
  source?: string;
  data?: any;
}

export class QuantumMorphEngine {
  private static instance: QuantumMorphEngine;
  private activeMorphs = new Map<string, Animation>();
  private contextMorphRules = new Map<string, (context: MorphContext) => MorphProperties>();
  private elementStates = new Map<string, MorphProperties>();

  private constructor() {
    this.registerDefaultRules();
  }

  static getInstance(): QuantumMorphEngine {
    if (!QuantumMorphEngine.instance) {
      QuantumMorphEngine.instance = new QuantumMorphEngine();
    }
    return QuantumMorphEngine.instance;
  }

  // ----------------------------- Rule Registration --------------------------
  registerMorphRule(
    elementType: string,
    rule: (context: MorphContext) => MorphProperties
  ): void {
    this.contextMorphRules.set(elementType, rule);
  }

  private registerDefaultRules(): void {
    // Card morphing
    this.registerMorphRule('card', (context) => {
      switch (context.type) {
        case 'hover':
          return { scale: 1.02, brightness: 1.05 };
        case 'focus':
          return { scale: 1.01, borderRadius: 16 };
        case 'selected':
          return { scale: 1.03, zIndex: 10 };
        case 'flow':
          if (context.data?.state === 'focused') {
            return { scale: 1.0, opacity: 1.0 };
          }
          return { scale: 0.98, opacity: 0.9 };
        default:
          return {};
      }
    });

    // Button morphing
    this.registerMorphRule('button', (context) => {
      switch (context.type) {
        case 'hover':
          return { scale: 1.05, brightness: 1.1 };
        case 'active':
          return { scale: 0.95 };
        case 'flow':
          if (context.data?.state === 'rushed') {
            return { scale: 1.1, padding: '12px 24px' };
          }
          return {};
        default:
          return {};
      }
    });

    // Input morphing
    this.registerMorphRule('input', (context) => {
      switch (context.type) {
        case 'focus':
          return { scale: 1.01, borderRadius: 8 };
        default:
          return {};
      }
    });

    // Sidebar morphing
    this.registerMorphRule('sidebar', (context) => {
      if (context.type === 'flow') {
        if (context.data?.state === 'focused') {
          return { width: '60px', opacity: 0.7 };
        }
        if (context.data?.state === 'exploring') {
          return { width: '280px', opacity: 1 };
        }
      }
      return {};
    });

    // Widget morphing
    this.registerMorphRule('widget', (context) => {
      if (context.type === 'contextual') {
        if (context.data?.priority === 'high') {
          return { scale: 1.05, zIndex: 100 };
        }
        if (context.data?.priority === 'low') {
          return { scale: 0.95, opacity: 0.8 };
        }
      }
      return {};
    });
  }

  // ----------------------------- Morphing Operations ------------------------
  morph(target: MorphTarget): void {
    if (typeof document === 'undefined') return;

    const config = getConfig().ui;
    if (!config.morphingEnabled) return;

    const element = document.getElementById(target.elementId);
    if (!element) return;

    // Cancel existing morph
    this.cancelMorph(target.elementId);

    // Build keyframes
    const keyframes = this.buildKeyframes(target.properties);
    const duration = target.duration * (1 / config.morphingSpeed);

    // Create and play animation
    const animation = element.animate(keyframes, {
      duration,
      easing: target.easing,
      fill: 'forwards',
    });

    this.activeMorphs.set(target.elementId, animation);

    // Store final state
    this.elementStates.set(target.elementId, target.properties);

    // Emit event
    globalEvents.emit('ui:morph', { target });
  }

  morphByContext(elementId: string, elementType: string, context: MorphContext): void {
    const rule = this.contextMorphRules.get(elementType);
    if (!rule) return;

    const properties = rule(context);
    if (Object.keys(properties).length === 0) return;

    this.morph({
      elementId,
      properties,
      duration: getConfig().ui.morphingSpeed,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    });
  }

  morphMultiple(targets: MorphTarget[]): void {
    for (const target of targets) {
      this.morph(target);
    }
  }

  cancelMorph(elementId: string): void {
    const animation = this.activeMorphs.get(elementId);
    if (animation) {
      animation.cancel();
      this.activeMorphs.delete(elementId);
    }
  }

  resetMorph(elementId: string): void {
    if (typeof document === 'undefined') return;

    const element = document.getElementById(elementId);
    if (!element) return;

    this.cancelMorph(elementId);

    // Reset to original
    element.style.transform = '';
    element.style.opacity = '';
    element.style.filter = '';

    this.elementStates.delete(elementId);
  }

  resetAll(): void {
    for (const elementId of this.activeMorphs.keys()) {
      this.resetMorph(elementId);
    }
  }

  // ----------------------------- Keyframe Building --------------------------
  private buildKeyframes(properties: MorphProperties): Keyframe[] {
    const to: Keyframe = {};

    // Transform properties
    const transforms: string[] = [];
    
    if (properties.scale !== undefined) {
      transforms.push(`scale(${properties.scale})`);
    }
    if (properties.x !== undefined || properties.y !== undefined) {
      transforms.push(`translate(${properties.x || 0}px, ${properties.y || 0}px)`);
    }
    if (properties.rotation !== undefined) {
      transforms.push(`rotate(${properties.rotation}deg)`);
    }

    if (transforms.length > 0) {
      to.transform = transforms.join(' ');
    }

    // Filter properties
    const filters: string[] = [];
    
    if (properties.blur !== undefined) {
      filters.push(`blur(${properties.blur}px)`);
    }
    if (properties.brightness !== undefined) {
      filters.push(`brightness(${properties.brightness})`);
    }

    if (filters.length > 0) {
      to.filter = filters.join(' ');
    }

    // Direct properties
    if (properties.opacity !== undefined) {
      to.opacity = String(properties.opacity);
    }
    if (properties.borderRadius !== undefined) {
      to.borderRadius = `${properties.borderRadius}px`;
    }
    if (properties.width !== undefined) {
      to.width = typeof properties.width === 'number' ? `${properties.width}px` : properties.width;
    }
    if (properties.height !== undefined) {
      to.height = typeof properties.height === 'number' ? `${properties.height}px` : properties.height;
    }
    if (properties.padding !== undefined) {
      to.padding = typeof properties.padding === 'number' ? `${properties.padding}px` : properties.padding;
    }
    if (properties.gap !== undefined) {
      to.gap = `${properties.gap}px`;
    }
    if (properties.zIndex !== undefined) {
      to.zIndex = String(properties.zIndex);
    }

    // Custom properties
    if (properties.custom) {
      for (const [key, value] of Object.entries(properties.custom)) {
        (to as any)[key] = value;
      }
    }

    return [to];
  }

  // ----------------------------- Batch Operations ---------------------------
  morphGroup(groupId: string, properties: MorphProperties): void {
    if (typeof document === 'undefined') return;

    const elements = document.querySelectorAll(`[data-morph-group="${groupId}"]`);
    elements.forEach((element, index) => {
      this.morph({
        elementId: element.id,
        properties,
        duration: getConfig().ui.morphingSpeed + index * 50, // Stagger
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      });
    });
  }

  // ----------------------------- State Queries ------------------------------
  getElementState(elementId: string): MorphProperties | undefined {
    return this.elementStates.get(elementId);
  }

  getActiveMorphCount(): number {
    return this.activeMorphs.size;
  }
}

export const quantumMorph = QuantumMorphEngine.getInstance();

