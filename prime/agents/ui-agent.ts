// ============================================================================
// NEXUS PRIME - UI AGENT
// Intelligent UI optimization and adaptation
// ============================================================================

import { BaseAgent, AgentTask } from './base-agent';
import { globalEvents } from '../core/events';
import { globalState } from '../core/state';
import { flowStateEngine } from '../intelligence/flow-state';

export class UIAgent extends BaseAgent {
  private pendingMorphs = new Map<string, any>();

  constructor() {
    super('ui-agent', 'UI Agent', 'Optimizes and adapts the user interface');
    this.registerCapabilities();
  }

  protected async onStart(): Promise<void> {
    // Subscribe to UI-related events
    globalEvents.on('ui:interaction', (data) => this.handleInteraction(data));
    globalEvents.on('flow:adaptation-update', (data) => this.handleFlowUpdate(data));
    globalEvents.on('perfection:reset-loaders', () => this.resetLoaders());
  }

  protected async onStop(): Promise<void> {
    // Cleanup
    this.pendingMorphs.clear();
  }

  protected async processTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case 'morph-element':
        return this.morphElement(task.data);
      case 'optimize-layout':
        return this.optimizeLayout(task.data);
      case 'adapt-theme':
        return this.adaptTheme(task.data);
      case 'preload-components':
        return this.preloadComponents(task.data);
      default:
        console.warn(`[UIAgent] Unknown task type: ${task.type}`);
    }
  }

  // ----------------------------- Capabilities -------------------------------
  private registerCapabilities(): void {
    this.registerCapability({
      name: 'morph',
      description: 'Morph UI element properties',
      handler: async (data) => this.morphElement(data),
    });

    this.registerCapability({
      name: 'optimize',
      description: 'Optimize layout for current context',
      handler: async (data) => this.optimizeLayout(data),
    });

    this.registerCapability({
      name: 'theme',
      description: 'Adapt theme based on preferences',
      handler: async (data) => this.adaptTheme(data),
    });
  }

  // ----------------------------- Event Handlers -----------------------------
  private handleInteraction(data: any): void {
    // Analyze interaction and potentially queue optimization tasks
    if (data.type === 'click' && data.target) {
      this.addTask({
        type: 'morph-element',
        priority: 'low',
        data: { elementId: data.target, action: 'highlight-feedback' },
      });
    }
  }

  private handleFlowUpdate(adaptation: any): void {
    // Apply flow-based adaptations
    this.addTask({
      type: 'optimize-layout',
      priority: 'normal',
      data: adaptation,
    });
  }

  private resetLoaders(): void {
    if (typeof document === 'undefined') return;

    document.querySelectorAll('[data-loading="true"]').forEach(el => {
      el.setAttribute('data-loading', 'false');
      el.removeAttribute('data-loading-start');
    });
  }

  // ----------------------------- UI Operations ------------------------------
  private async morphElement(data: { elementId: string; action: string; properties?: any }): Promise<void> {
    if (typeof document === 'undefined') return;

    const element = document.getElementById(data.elementId);
    if (!element) return;

    switch (data.action) {
      case 'highlight-feedback':
        element.classList.add('prime-highlight');
        setTimeout(() => element.classList.remove('prime-highlight'), 200);
        break;

      case 'expand':
        element.style.transform = 'scale(1.02)';
        setTimeout(() => element.style.transform = '', 300);
        break;

      case 'focus':
        element.classList.add('prime-focus');
        break;

      case 'update-style':
        if (data.properties) {
          Object.assign(element.style, data.properties);
        }
        break;
    }

    globalEvents.emit('ui:morph', { elementId: data.elementId, action: data.action });
  }

  private async optimizeLayout(data: any): Promise<void> {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Apply layout density
    if (data.layoutDensity) {
      root.setAttribute('data-density', data.layoutDensity);
    }

    // Apply animation speed
    if (data.animationSpeed !== undefined) {
      root.style.setProperty('--prime-animation-speed', `${data.animationSpeed}`);
    }

    // Apply auto-hide elements
    if (data.autoHideElements !== undefined) {
      root.setAttribute('data-auto-hide', String(data.autoHideElements));
    }

    globalEvents.emit('ui:layout-change', data);
  }

  private async adaptTheme(data: { theme?: string; temporal?: string }): Promise<void> {
    if (data.theme) {
      globalState.setKey('ui', prev => ({ ...prev, theme: data.theme as any }));
    }

    if (data.temporal) {
      globalState.setKey('ui', prev => ({ ...prev, temporalMode: data.temporal as any }));
    }

    globalEvents.emit('ui:theme-change', data);
  }

  private async preloadComponents(data: { components: string[] }): Promise<void> {
    // This would preload component bundles in a real implementation
    for (const component of data.components) {
      globalEvents.emit('ui:preload', { component });
    }
  }

  // ----------------------------- Public Methods -----------------------------
  requestMorph(elementId: string, action: string, properties?: any): void {
    this.addTask({
      type: 'morph-element',
      priority: 'normal',
      data: { elementId, action, properties },
    });
  }

  requestLayoutOptimization(): void {
    const adaptation = flowStateEngine.getAdaptation();
    this.addTask({
      type: 'optimize-layout',
      priority: 'high',
      data: adaptation,
    });
  }

  setTheme(theme: 'light' | 'dark' | 'system'): void {
    this.addTask({
      type: 'adapt-theme',
      priority: 'high',
      data: { theme },
    });
  }
}

