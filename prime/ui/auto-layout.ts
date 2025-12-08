// ============================================================================
// NEXUS PRIME - AUTO-MORPHING LAYOUTS
// Intelligent layout adaptation based on context
// ============================================================================

import { globalEvents } from '../core/events';
import { getConfig } from '../core/config';
import { flowStateEngine } from '../intelligence/flow-state';

export type LayoutMode = 'default' | 'compact' | 'spacious' | 'focus' | 'zen';
export type LayoutOrientation = 'portrait' | 'landscape';
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'large-desktop';

export interface LayoutContext {
  device: DeviceType;
  orientation: LayoutOrientation;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  flowState: string;
  userPreference?: LayoutMode;
}

export interface LayoutConfig {
  mode: LayoutMode;
  columns: number;
  gap: number;
  padding: number;
  sidebarWidth: number;
  headerHeight: number;
  cardSize: 'small' | 'medium' | 'large';
  showLabels: boolean;
  density: 'compact' | 'normal' | 'comfortable';
}

export class AutoLayoutEngine {
  private static instance: AutoLayoutEngine;
  private currentLayout: LayoutConfig;
  private layoutHistory: Array<{ layout: LayoutConfig; timestamp: number }> = [];
  private resizeObserver?: ResizeObserver;

  private constructor() {
    this.currentLayout = this.getDefaultLayout();
    this.setupObservers();
  }

  static getInstance(): AutoLayoutEngine {
    if (!AutoLayoutEngine.instance) {
      AutoLayoutEngine.instance = new AutoLayoutEngine();
    }
    return AutoLayoutEngine.instance;
  }

  // ----------------------------- Setup --------------------------------------
  private setupObservers(): void {
    if (typeof window === 'undefined') return;

    // Resize observer
    this.resizeObserver = new ResizeObserver(() => {
      this.adaptToViewport();
    });

    this.resizeObserver.observe(document.body);

    // Orientation change
    window.matchMedia('(orientation: portrait)').addEventListener('change', () => {
      this.adaptToViewport();
    });

    // Flow state changes
    globalEvents.on('flow:state-change', () => {
      this.adaptToFlow();
    });

    // Initial adaptation
    this.adaptToViewport();
  }

  // ----------------------------- Context Detection --------------------------
  private detectContext(): LayoutContext {
    const width = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const height = typeof window !== 'undefined' ? window.innerHeight : 1080;

    // Device type
    let device: DeviceType;
    if (width < 640) device = 'mobile';
    else if (width < 1024) device = 'tablet';
    else if (width < 1920) device = 'desktop';
    else device = 'large-desktop';

    // Orientation
    const orientation: LayoutOrientation = height > width ? 'portrait' : 'landscape';

    // Time of day
    const hour = new Date().getHours();
    let timeOfDay: LayoutContext['timeOfDay'];
    if (hour >= 5 && hour < 12) timeOfDay = 'morning';
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
    else timeOfDay = 'night';

    // Flow state
    const flowState = flowStateEngine.getCurrentState();

    return { device, orientation, timeOfDay, flowState };
  }

  // ----------------------------- Layout Calculation -------------------------
  private calculateLayout(context: LayoutContext): LayoutConfig {
    const config = getConfig().ui;
    let layout: LayoutConfig;

    // Base layout by device
    switch (context.device) {
      case 'mobile':
        layout = {
          mode: 'compact',
          columns: 1,
          gap: 12,
          padding: 16,
          sidebarWidth: 0,
          headerHeight: 56,
          cardSize: 'medium',
          showLabels: false,
          density: 'compact',
        };
        break;

      case 'tablet':
        layout = {
          mode: 'default',
          columns: 2,
          gap: 16,
          padding: 20,
          sidebarWidth: 240,
          headerHeight: 60,
          cardSize: 'medium',
          showLabels: true,
          density: 'normal',
        };
        break;

      case 'desktop':
        layout = {
          mode: 'default',
          columns: 3,
          gap: 20,
          padding: 24,
          sidebarWidth: 280,
          headerHeight: 64,
          cardSize: 'medium',
          showLabels: true,
          density: 'normal',
        };
        break;

      case 'large-desktop':
        layout = {
          mode: 'spacious',
          columns: 4,
          gap: 24,
          padding: 32,
          sidebarWidth: 320,
          headerHeight: 72,
          cardSize: 'large',
          showLabels: true,
          density: 'comfortable',
        };
        break;

      default:
        layout = this.getDefaultLayout();
    }

    // Adjust for flow state
    if (config.adaptiveLayout) {
      switch (context.flowState) {
        case 'focused':
          layout.mode = 'focus';
          layout.sidebarWidth = Math.min(layout.sidebarWidth, 72);
          layout.density = 'compact';
          break;

        case 'rushed':
          layout.mode = 'compact';
          layout.gap = Math.max(8, layout.gap - 8);
          layout.padding = Math.max(12, layout.padding - 8);
          layout.density = 'compact';
          break;

        case 'exploring':
          layout.density = 'comfortable';
          layout.cardSize = 'large';
          break;
      }
    }

    // Adjust for time of day
    if (config.temporalAwareness) {
      switch (context.timeOfDay) {
        case 'morning':
          // Simplified morning layout
          layout.showLabels = true;
          break;

        case 'night':
          // Calmer night layout
          layout.density = 'comfortable';
          break;
      }
    }

    return layout;
  }

  private getDefaultLayout(): LayoutConfig {
    return {
      mode: 'default',
      columns: 3,
      gap: 20,
      padding: 24,
      sidebarWidth: 280,
      headerHeight: 64,
      cardSize: 'medium',
      showLabels: true,
      density: 'normal',
    };
  }

  // ----------------------------- Layout Application -------------------------
  private applyLayout(layout: LayoutConfig): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Apply CSS variables
    root.style.setProperty('--layout-columns', String(layout.columns));
    root.style.setProperty('--layout-gap', `${layout.gap}px`);
    root.style.setProperty('--layout-padding', `${layout.padding}px`);
    root.style.setProperty('--sidebar-width', `${layout.sidebarWidth}px`);
    root.style.setProperty('--header-height', `${layout.headerHeight}px`);

    // Apply data attributes
    root.setAttribute('data-layout-mode', layout.mode);
    root.setAttribute('data-layout-density', layout.density);
    root.setAttribute('data-card-size', layout.cardSize);
    root.setAttribute('data-show-labels', String(layout.showLabels));

    // Store in history
    this.layoutHistory.push({ layout, timestamp: Date.now() });
    if (this.layoutHistory.length > 50) {
      this.layoutHistory.shift();
    }

    // Update current
    this.currentLayout = layout;

    // Emit event
    globalEvents.emit('ui:layout-change', layout);
  }

  // ----------------------------- Adaptation Triggers ------------------------
  adaptToViewport(): void {
    const context = this.detectContext();
    const layout = this.calculateLayout(context);
    this.applyLayout(layout);
  }

  adaptToFlow(): void {
    const context = this.detectContext();
    const layout = this.calculateLayout(context);
    this.applyLayout(layout);
  }

  // ----------------------------- Manual Controls ----------------------------
  setMode(mode: LayoutMode): void {
    const layout = { ...this.currentLayout, mode };

    switch (mode) {
      case 'compact':
        layout.gap = 12;
        layout.padding = 16;
        layout.density = 'compact';
        break;

      case 'spacious':
        layout.gap = 24;
        layout.padding = 32;
        layout.density = 'comfortable';
        break;

      case 'focus':
        layout.sidebarWidth = 72;
        layout.density = 'compact';
        break;

      case 'zen':
        layout.sidebarWidth = 0;
        layout.headerHeight = 0;
        layout.padding = 48;
        break;
    }

    this.applyLayout(layout);
  }

  setSidebarWidth(width: number): void {
    this.applyLayout({ ...this.currentLayout, sidebarWidth: width });
  }

  toggleLabels(): void {
    this.applyLayout({ ...this.currentLayout, showLabels: !this.currentLayout.showLabels });
  }

  // ----------------------------- Getters ------------------------------------
  getCurrentLayout(): LayoutConfig {
    return { ...this.currentLayout };
  }

  getLayoutHistory(): typeof this.layoutHistory {
    return [...this.layoutHistory];
  }
}

export const autoLayout = AutoLayoutEngine.getInstance();

