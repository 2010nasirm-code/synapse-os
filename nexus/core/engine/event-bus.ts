// ============================================================================
// NEXUS EVENT BUS - Events, Listeners, Triggers System
// ============================================================================

import { NexusEvent, EventHandler, EventSubscription } from '../../types';
import { generateUUID, now } from '../../utils';

export type EventFilter = (event: NexusEvent) => boolean;

export interface EventBusOptions {
  maxListeners?: number;
  maxHistory?: number;
  async?: boolean;
}

export class NexusEventBus {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private wildcardSubscriptions: EventSubscription[] = [];
  private history: NexusEvent[] = [];
  private options: Required<EventBusOptions>;

  constructor(options: EventBusOptions = {}) {
    this.options = {
      maxListeners: options.maxListeners ?? 100,
      maxHistory: options.maxHistory ?? 1000,
      async: options.async ?? true,
    };
  }

  // ----------------------------- Subscription Management --------------------
  on<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    options: { priority?: number; once?: boolean } = {}
  ): () => void {
    const subscription: EventSubscription = {
      id: generateUUID(),
      eventType,
      handler: handler as EventHandler,
      priority: options.priority ?? 10,
      once: options.once ?? false,
    };

    if (eventType === '*') {
      this.wildcardSubscriptions.push(subscription);
      this.wildcardSubscriptions.sort((a, b) => a.priority - b.priority);
    } else {
      if (!this.subscriptions.has(eventType)) {
        this.subscriptions.set(eventType, []);
      }
      
      const subs = this.subscriptions.get(eventType)!;
      if (subs.length >= this.options.maxListeners) {
        console.warn(`Max listeners (${this.options.maxListeners}) reached for event: ${eventType}`);
      }
      
      subs.push(subscription);
      subs.sort((a, b) => a.priority - b.priority);
    }

    // Return unsubscribe function
    return () => this.off(eventType, subscription.id);
  }

  once<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    priority?: number
  ): () => void {
    return this.on(eventType, handler, { priority, once: true });
  }

  off(eventType: string, subscriptionId: string): boolean {
    if (eventType === '*') {
      const index = this.wildcardSubscriptions.findIndex(s => s.id === subscriptionId);
      if (index !== -1) {
        this.wildcardSubscriptions.splice(index, 1);
        return true;
      }
      return false;
    }

    const subs = this.subscriptions.get(eventType);
    if (!subs) return false;

    const index = subs.findIndex(s => s.id === subscriptionId);
    if (index !== -1) {
      subs.splice(index, 1);
      return true;
    }
    return false;
  }

  offAll(eventType?: string): void {
    if (eventType) {
      this.subscriptions.delete(eventType);
    } else {
      this.subscriptions.clear();
      this.wildcardSubscriptions = [];
    }
  }

  // ----------------------------- Event Emission -----------------------------
  emit<T = unknown>(
    type: string,
    payload: T,
    options: { source?: string; metadata?: Record<string, unknown> } = {}
  ): NexusEvent<T> {
    const event: NexusEvent<T> = {
      id: generateUUID(),
      type,
      payload,
      timestamp: now(),
      source: options.source ?? 'unknown',
      metadata: options.metadata,
    };

    // Add to history
    this.addToHistory(event as NexusEvent);

    // Get handlers
    const typeHandlers = this.subscriptions.get(type) || [];
    const allHandlers = [...typeHandlers, ...this.wildcardSubscriptions];

    // Execute handlers
    const execute = async () => {
      const toRemove: { type: string; id: string }[] = [];

      for (const sub of allHandlers) {
        try {
          await sub.handler(event as NexusEvent);
          
          if (sub.once) {
            toRemove.push({ type: sub.eventType, id: sub.id });
          }
        } catch (error) {
          console.error(`Event handler error for ${type}:`, error);
        }
      }

      // Remove one-time handlers
      for (const { type: t, id } of toRemove) {
        this.off(t, id);
      }
    };

    if (this.options.async) {
      execute();
    } else {
      execute();
    }

    return event;
  }

  async emitAsync<T = unknown>(
    type: string,
    payload: T,
    options: { source?: string; metadata?: Record<string, unknown> } = {}
  ): Promise<NexusEvent<T>> {
    const event: NexusEvent<T> = {
      id: generateUUID(),
      type,
      payload,
      timestamp: now(),
      source: options.source ?? 'unknown',
      metadata: options.metadata,
    };

    this.addToHistory(event as NexusEvent);

    const typeHandlers = this.subscriptions.get(type) || [];
    const allHandlers = [...typeHandlers, ...this.wildcardSubscriptions];
    const toRemove: { type: string; id: string }[] = [];

    for (const sub of allHandlers) {
      try {
        await sub.handler(event as NexusEvent);
        
        if (sub.once) {
          toRemove.push({ type: sub.eventType, id: sub.id });
        }
      } catch (error) {
        console.error(`Event handler error for ${type}:`, error);
      }
    }

    for (const { type: t, id } of toRemove) {
      this.off(t, id);
    }

    return event;
  }

  // ----------------------------- History ------------------------------------
  private addToHistory(event: NexusEvent): void {
    this.history.push(event);
    
    // Trim history if needed
    if (this.history.length > this.options.maxHistory) {
      this.history = this.history.slice(-this.options.maxHistory);
    }
  }

  getHistory(filter?: EventFilter): NexusEvent[] {
    if (!filter) return [...this.history];
    return this.history.filter(filter);
  }

  getEventsByType(type: string): NexusEvent[] {
    return this.history.filter(e => e.type === type);
  }

  getRecentEvents(count: number = 10): NexusEvent[] {
    return this.history.slice(-count);
  }

  clearHistory(): void {
    this.history = [];
  }

  // ----------------------------- Utilities ----------------------------------
  getSubscriptionCount(eventType?: string): number {
    if (eventType) {
      return (this.subscriptions.get(eventType)?.length ?? 0) + this.wildcardSubscriptions.length;
    }
    
    let count = this.wildcardSubscriptions.length;
    const values = Array.from(this.subscriptions.values());
    for (const subs of values) {
      count += subs.length;
    }
    return count;
  }

  getEventTypes(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  hasSubscribers(eventType: string): boolean {
    return (this.subscriptions.get(eventType)?.length ?? 0) > 0 || 
           this.wildcardSubscriptions.length > 0;
  }

  // ----------------------------- Event Patterns -----------------------------
  // Emit after delay
  emitDelayed<T = unknown>(
    type: string,
    payload: T,
    delay: number,
    options?: { source?: string; metadata?: Record<string, unknown> }
  ): NodeJS.Timeout {
    return setTimeout(() => this.emit(type, payload, options), delay);
  }

  // Emit at interval
  emitInterval<T = unknown>(
    type: string,
    payloadFn: () => T,
    interval: number,
    options?: { source?: string; metadata?: Record<string, unknown> }
  ): NodeJS.Timeout {
    return setInterval(() => this.emit(type, payloadFn(), options), interval);
  }

  // Wait for event
  waitFor<T = unknown>(
    eventType: string,
    timeout?: number,
    filter?: (event: NexusEvent<T>) => boolean
  ): Promise<NexusEvent<T>> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined;
      
      const unsubscribe = this.once<T>(eventType, (event) => {
        if (!filter || filter(event as NexusEvent<T>)) {
          if (timeoutId) clearTimeout(timeoutId);
          resolve(event as NexusEvent<T>);
        }
      });

      if (timeout) {
        timeoutId = setTimeout(() => {
          unsubscribe();
          reject(new Error(`Timeout waiting for event: ${eventType}`));
        }, timeout);
      }
    });
  }

  // Pipe events to another type
  pipe(sourceType: string, targetType: string, transform?: (payload: unknown) => unknown): () => void {
    return this.on(sourceType, (event) => {
      const payload = transform ? transform(event.payload) : event.payload;
      this.emit(targetType, payload, { source: `pipe:${sourceType}` });
    });
  }
}

// Singleton instance
export const eventBus = new NexusEventBus();

// ----------------------------- Standard Events ------------------------------
export const NexusEvents = {
  // System events
  SYSTEM_READY: 'system:ready',
  SYSTEM_ERROR: 'system:error',
  SYSTEM_SHUTDOWN: 'system:shutdown',

  // Task events
  TASK_CREATED: 'task:created',
  TASK_STARTED: 'task:started',
  TASK_COMPLETED: 'task:completed',
  TASK_FAILED: 'task:failed',
  TASK_CANCELLED: 'task:cancelled',

  // Flow events
  FLOW_CREATED: 'flow:created',
  FLOW_STARTED: 'flow:started',
  FLOW_COMPLETED: 'flow:completed',
  FLOW_FAILED: 'flow:failed',
  FLOW_PAUSED: 'flow:paused',
  FLOW_RESUMED: 'flow:resumed',

  // Memory events
  MEMORY_ADDED: 'memory:added',
  MEMORY_UPDATED: 'memory:updated',
  MEMORY_DELETED: 'memory:deleted',
  MEMORY_ACCESSED: 'memory:accessed',

  // Pattern events
  PATTERN_DETECTED: 'pattern:detected',
  INSIGHT_GENERATED: 'insight:generated',

  // Plugin events
  PLUGIN_LOADED: 'plugin:loaded',
  PLUGIN_UNLOADED: 'plugin:unloaded',
  PLUGIN_ERROR: 'plugin:error',

  // User events
  USER_ACTION: 'user:action',
  USER_SESSION_START: 'user:session:start',
  USER_SESSION_END: 'user:session:end',

  // Data events
  DATA_SYNCED: 'data:synced',
  DATA_CHANGED: 'data:changed',
} as const;


