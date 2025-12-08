// ============================================================================
// NEXUS PRIME - OMNI-VIEW DASHBOARD
// Modular, adaptive dashboard with intelligent widget management
// ============================================================================

import { globalEvents } from '../core/events';
import { globalState } from '../core/state';

export interface DashboardWidget {
  id: string;
  type: string;
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  position: { x: number; y: number };
  priority: number;
  visible: boolean;
  config: Record<string, any>;
  data?: any;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  columns: number;
  created: number;
}

export class OmniDashboardEngine {
  private static instance: OmniDashboardEngine;
  private widgets = new Map<string, DashboardWidget>();
  private layouts = new Map<string, DashboardLayout>();
  private activeLayoutId: string = 'default';
  private widgetPriorities = new Map<string, number>();

  private constructor() {
    this.loadSavedLayouts();
    this.setupEventListeners();
  }

  static getInstance(): OmniDashboardEngine {
    if (!OmniDashboardEngine.instance) {
      OmniDashboardEngine.instance = new OmniDashboardEngine();
    }
    return OmniDashboardEngine.instance;
  }

  // ----------------------------- Setup --------------------------------------
  private setupEventListeners(): void {
    // Listen for user interactions to update priorities
    globalEvents.on('widget:interact', (data: { widgetId: string }) => {
      this.boostWidgetPriority(data.widgetId);
    });

    // Listen for data updates
    globalEvents.on('data:update', (data: { type: string; payload: any }) => {
      this.updateWidgetData(data.type, data.payload);
    });

    // Listen for flow changes
    globalEvents.on('flow:state-change', () => {
      this.adaptToFlowState();
    });
  }

  // ----------------------------- Widget Management --------------------------
  registerWidget(widget: Omit<DashboardWidget, 'position' | 'priority'>): void {
    const fullWidget: DashboardWidget = {
      ...widget,
      position: this.findNextPosition(widget.size),
      priority: 50,
    };

    this.widgets.set(widget.id, fullWidget);
    this.widgetPriorities.set(widget.id, 50);

    globalEvents.emit('dashboard:widget-registered', fullWidget);
  }

  removeWidget(widgetId: string): void {
    this.widgets.delete(widgetId);
    this.widgetPriorities.delete(widgetId);

    globalEvents.emit('dashboard:widget-removed', { widgetId });
  }

  updateWidget(widgetId: string, updates: Partial<DashboardWidget>): void {
    const widget = this.widgets.get(widgetId);
    if (!widget) return;

    Object.assign(widget, updates);
    globalEvents.emit('dashboard:widget-updated', widget);
  }

  // ----------------------------- Position Management ------------------------
  private findNextPosition(size: DashboardWidget['size']): { x: number; y: number } {
    // Simple grid-based positioning
    const widgets = Array.from(this.widgets.values());
    const occupied = new Set<string>();

    for (const widget of widgets) {
      const span = this.getSizeSpan(widget.size);
      for (let dx = 0; dx < span; dx++) {
        occupied.add(`${widget.position.x + dx},${widget.position.y}`);
      }
    }

    const columns = this.getActiveLayout()?.columns || 4;
    const span = this.getSizeSpan(size);

    // Find first available position
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x <= columns - span; x++) {
        let fits = true;
        for (let dx = 0; dx < span; dx++) {
          if (occupied.has(`${x + dx},${y}`)) {
            fits = false;
            break;
          }
        }
        if (fits) {
          return { x, y };
        }
      }
    }

    return { x: 0, y: widgets.length };
  }

  private getSizeSpan(size: DashboardWidget['size']): number {
    switch (size) {
      case 'small': return 1;
      case 'medium': return 2;
      case 'large': return 3;
      case 'full': return 4;
      default: return 1;
    }
  }

  moveWidget(widgetId: string, position: { x: number; y: number }): void {
    const widget = this.widgets.get(widgetId);
    if (!widget) return;

    widget.position = position;
    globalEvents.emit('dashboard:widget-moved', widget);
  }

  resizeWidget(widgetId: string, size: DashboardWidget['size']): void {
    const widget = this.widgets.get(widgetId);
    if (!widget) return;

    widget.size = size;
    globalEvents.emit('dashboard:widget-resized', widget);
  }

  // ----------------------------- Priority Management ------------------------
  private boostWidgetPriority(widgetId: string): void {
    const current = this.widgetPriorities.get(widgetId) || 50;
    const newPriority = Math.min(100, current + 5);
    this.widgetPriorities.set(widgetId, newPriority);

    // Decay other priorities
    for (const [id, priority] of this.widgetPriorities) {
      if (id !== widgetId) {
        this.widgetPriorities.set(id, Math.max(0, priority - 1));
      }
    }

    // Update widget
    const widget = this.widgets.get(widgetId);
    if (widget) {
      widget.priority = newPriority;
    }
  }

  // ----------------------------- Data Management ----------------------------
  private updateWidgetData(type: string, payload: any): void {
    // Find widgets that display this data type
    for (const widget of this.widgets.values()) {
      if (widget.type === type || widget.config.dataType === type) {
        widget.data = payload;
        globalEvents.emit('dashboard:widget-data-updated', widget);
      }
    }
  }

  // ----------------------------- Adaptive Behavior --------------------------
  private adaptToFlowState(): void {
    const widgets = Array.from(this.widgets.values());
    
    // Sort by priority
    widgets.sort((a, b) => b.priority - a.priority);

    // Show top priority widgets more prominently
    for (let i = 0; i < widgets.length; i++) {
      const widget = widgets[i];
      
      if (i < 3) {
        // Top 3 get larger
        if (widget.size === 'small') {
          widget.size = 'medium';
        }
      } else if (i > widgets.length - 3) {
        // Bottom 3 get smaller or hidden
        if (widget.size === 'large') {
          widget.size = 'medium';
        } else if (widget.size === 'medium') {
          widget.size = 'small';
        }
      }
    }

    globalEvents.emit('dashboard:adapted');
  }

  // ----------------------------- Layout Management --------------------------
  createLayout(name: string): string {
    const layout: DashboardLayout = {
      id: `layout-${Date.now()}`,
      name,
      widgets: Array.from(this.widgets.values()).map(w => ({ ...w })),
      columns: 4,
      created: Date.now(),
    };

    this.layouts.set(layout.id, layout);
    this.saveLayouts();

    return layout.id;
  }

  loadLayout(layoutId: string): boolean {
    const layout = this.layouts.get(layoutId);
    if (!layout) return false;

    // Clear current widgets
    this.widgets.clear();

    // Load layout widgets
    for (const widget of layout.widgets) {
      this.widgets.set(widget.id, { ...widget });
      this.widgetPriorities.set(widget.id, widget.priority);
    }

    this.activeLayoutId = layoutId;
    globalEvents.emit('dashboard:layout-loaded', layout);

    return true;
  }

  deleteLayout(layoutId: string): boolean {
    if (layoutId === 'default') return false;
    
    const deleted = this.layouts.delete(layoutId);
    if (deleted) {
      this.saveLayouts();
    }
    return deleted;
  }

  getActiveLayout(): DashboardLayout | undefined {
    return this.layouts.get(this.activeLayoutId);
  }

  // ----------------------------- Persistence --------------------------------
  private saveLayouts(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = Array.from(this.layouts.entries());
      localStorage.setItem('nexus-prime-layouts', JSON.stringify(data));
    } catch (e) {
      console.warn('[OmniDashboard] Failed to save layouts:', e);
    }
  }

  private loadSavedLayouts(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const saved = localStorage.getItem('nexus-prime-layouts');
      if (saved) {
        const data = JSON.parse(saved);
        this.layouts = new Map(data);
      } else {
        // Create default layout
        this.layouts.set('default', {
          id: 'default',
          name: 'Default',
          widgets: [],
          columns: 4,
          created: Date.now(),
        });
      }
    } catch (e) {
      console.warn('[OmniDashboard] Failed to load layouts:', e);
    }
  }

  // ----------------------------- Getters ------------------------------------
  getWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values())
      .sort((a, b) => {
        // Sort by position, then priority
        if (a.position.y !== b.position.y) return a.position.y - b.position.y;
        if (a.position.x !== b.position.x) return a.position.x - b.position.x;
        return b.priority - a.priority;
      });
  }

  getWidget(widgetId: string): DashboardWidget | undefined {
    return this.widgets.get(widgetId);
  }

  getLayouts(): DashboardLayout[] {
    return Array.from(this.layouts.values());
  }

  getVisibleWidgets(): DashboardWidget[] {
    return this.getWidgets().filter(w => w.visible);
  }
}

export const omniDashboard = OmniDashboardEngine.getInstance();

