// ============================================================================
// NEXUS PRIME - EVENT SYSTEM
// Central message bus for all system components
// ============================================================================

export type EventHandler<T = any> = (data: T) => void;

export interface PrimeEvent<T = any> {
  id: string;
  type: string;
  source: string;
  timestamp: number;
  payload: T;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export class EventEmitter {
  private handlers = new Map<string, Set<EventHandler>>();
  private wildcardHandlers = new Set<EventHandler>();
  private eventHistory: PrimeEvent[] = [];
  private maxHistorySize = 1000;

  on(event: string, handler: EventHandler): () => void {
    if (event === '*') {
      this.wildcardHandlers.add(handler);
      return () => this.wildcardHandlers.delete(handler);
    }

    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    
    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    if (event === '*') {
      this.wildcardHandlers.delete(handler);
      return;
    }
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, data?: any, options?: { source?: string; priority?: PrimeEvent['priority'] }): void {
    const primeEvent: PrimeEvent = {
      id: `${event}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: event,
      source: options?.source || 'unknown',
      timestamp: Date.now(),
      payload: data,
      priority: options?.priority || 'normal',
    };

    // Store in history
    this.eventHistory.push(primeEvent);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Call specific handlers
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (error) {
          console.error(`[EventEmitter] Handler error for ${event}:`, error);
        }
      }
    }

    // Call wildcard handlers
    for (const handler of this.wildcardHandlers) {
      try {
        handler(primeEvent);
      } catch (error) {
        console.error(`[EventEmitter] Wildcard handler error:`, error);
      }
    }
  }

  once(event: string, handler: EventHandler): () => void {
    const wrapper: EventHandler = (data) => {
      this.off(event, wrapper);
      handler(data);
    };
    return this.on(event, wrapper);
  }

  getHistory(filter?: { type?: string; since?: number; limit?: number }): PrimeEvent[] {
    let events = [...this.eventHistory];

    if (filter?.type) {
      events = events.filter(e => e.type.includes(filter.type!));
    }

    if (filter?.since) {
      events = events.filter(e => e.timestamp >= filter.since!);
    }

    if (filter?.limit) {
      events = events.slice(-filter.limit);
    }

    return events;
  }

  clearHistory(): void {
    this.eventHistory = [];
  }

  getHandlerCount(event?: string): number {
    if (event) {
      return this.handlers.get(event)?.size || 0;
    }
    let count = this.wildcardHandlers.size;
    for (const handlers of this.handlers.values()) {
      count += handlers.size;
    }
    return count;
  }
}

// Global event bus
export const globalEvents = new EventEmitter();

// Predefined event types
export const PrimeEvents = {
  // Kernel events
  KERNEL_STARTED: 'kernel:started',
  KERNEL_STOPPED: 'kernel:stopped',
  KERNEL_ERROR: 'kernel:error',
  KERNEL_HEALTH: 'kernel:health',
  KERNEL_METRICS: 'kernel:metrics',
  KERNEL_ADAPTATION: 'kernel:adaptation',

  // Agent events
  AGENT_STARTED: 'agent:started',
  AGENT_STOPPED: 'agent:stopped',
  AGENT_MESSAGE: 'agent:message',
  AGENT_TASK_COMPLETE: 'agent:task-complete',
  AGENT_ERROR: 'agent:error',

  // UI events
  UI_MORPH: 'ui:morph',
  UI_LAYOUT_CHANGE: 'ui:layout-change',
  UI_THEME_CHANGE: 'ui:theme-change',
  UI_INTERACTION: 'ui:interaction',

  // Evolution events
  EVOLUTION_DETECTED: 'evolution:detected',
  EVOLUTION_APPLIED: 'evolution:applied',
  EVOLUTION_ROLLBACK: 'evolution:rollback',

  // Self-heal events
  HEAL_REQUIRED: 'heal:required',
  HEAL_STARTED: 'heal:started',
  HEAL_COMPLETE: 'heal:complete',
  HEAL_FAILED: 'heal:failed',

  // Data events
  DATA_SYNC: 'data:sync',
  DATA_CONFLICT: 'data:conflict',
  DATA_ERROR: 'data:error',

  // User events
  USER_ACTION: 'user:action',
  USER_PATTERN: 'user:pattern',
  USER_PREFERENCE: 'user:preference',
} as const;

