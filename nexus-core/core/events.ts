/**
 * @module events
 * @description Internal Event Bus System for Nexus
 * 
 * Provides a centralized pub/sub mechanism for inter-module communication.
 * Supports typed events, async handlers, and event history for debugging.
 * 
 * @example
 * ```typescript
 * // Subscribe to an event
 * eventBus.on('agent:completed', (data) => console.log(data));
 * 
 * // Emit an event
 * eventBus.emit('agent:completed', { agentId: 'reasoning', result: {...} });
 * 
 * // One-time listener
 * eventBus.once('query:start', (data) => {...});
 * ```
 * 
 * @version 1.0.0
 * @since 2024-01-01
 */

import { logger } from "../lib/logger";

// ============================================
// EVENT TYPES
// ============================================

/**
 * All possible event names in the Nexus system
 */
export type NexusEventName =
  // Query lifecycle
  | "query:start"
  | "query:routed"
  | "query:completed"
  | "query:failed"
  // Agent events
  | "agent:start"
  | "agent:completed"
  | "agent:failed"
  | "agent:registered"
  | "agent:enabled"
  | "agent:disabled"
  // Memory events
  | "memory:added"
  | "memory:deleted"
  | "memory:queried"
  | "memory:cleared"
  // Automation events
  | "automation:created"
  | "automation:triggered"
  | "automation:completed"
  | "automation:failed"
  // Skill events
  | "skill:executed"
  | "skill:failed"
  // System events
  | "system:initialized"
  | "system:shutdown"
  | "system:error"
  | "system:warning"
  // Custom events
  | `custom:${string}`;

/**
 * Event payload types for type safety
 */
export interface NexusEventPayloads {
  "query:start": { requestId: string; userId: string; query: string };
  "query:routed": { requestId: string; agents: string[] };
  "query:completed": { requestId: string; duration: number; success: boolean };
  "query:failed": { requestId: string; error: string };
  "agent:start": { agentId: string; requestId: string };
  "agent:completed": { agentId: string; requestId: string; duration: number; confidence: number };
  "agent:failed": { agentId: string; requestId: string; error: string };
  "agent:registered": { agentId: string; name: string };
  "agent:enabled": { agentId: string };
  "agent:disabled": { agentId: string };
  "memory:added": { userId: string; memoryId: string; type: string };
  "memory:deleted": { userId: string; memoryId: string };
  "memory:queried": { userId: string; query: string; resultCount: number };
  "memory:cleared": { userId: string };
  "automation:created": { automationId: string; userId: string };
  "automation:triggered": { automationId: string; trigger: string };
  "automation:completed": { automationId: string; success: boolean };
  "automation:failed": { automationId: string; error: string };
  "skill:executed": { skillId: string; duration: number };
  "skill:failed": { skillId: string; error: string };
  "system:initialized": { version: string; agents: number; skills: number };
  "system:shutdown": { reason: string };
  "system:error": { error: string; stack?: string };
  "system:warning": { message: string };
  [key: `custom:${string}`]: Record<string, any>;
}

/**
 * Event handler function type
 */
type EventHandler<T = any> = (payload: T) => void | Promise<void>;

/**
 * Stored event for history
 */
interface EventRecord {
  id: string;
  name: NexusEventName;
  payload: any;
  timestamp: string;
}

// ============================================
// EVENT BUS IMPLEMENTATION
// ============================================

/**
 * @class NexusEventBus
 * @description Central event bus for pub/sub communication
 * 
 * Features:
 * - Type-safe event emissions
 * - Async handler support
 * - Event history for debugging
 * - Wildcard subscriptions
 * - Error isolation (one handler failure doesn't affect others)
 */
class NexusEventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private history: EventRecord[] = [];
  private maxHistory = 100;
  private enabled = true;

  /**
   * Subscribe to an event
   * @param event - Event name to listen for
   * @param handler - Callback function
   * @returns Unsubscribe function
   */
  on<E extends NexusEventName>(
    event: E,
    handler: EventHandler<E extends keyof NexusEventPayloads ? NexusEventPayloads[E] : any>
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  /**
   * Subscribe to an event (one-time)
   * @param event - Event name to listen for
   * @param handler - Callback function (called once then removed)
   */
  once<E extends NexusEventName>(
    event: E,
    handler: EventHandler<E extends keyof NexusEventPayloads ? NexusEventPayloads[E] : any>
  ): void {
    const wrapper: EventHandler = (payload) => {
      this.off(event, wrapper);
      handler(payload);
    };
    this.on(event, wrapper);
  }

  /**
   * Unsubscribe from an event
   * @param event - Event name
   * @param handler - Handler to remove
   */
  off<E extends NexusEventName>(event: E, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  /**
   * Emit an event
   * @param event - Event name
   * @param payload - Event data
   */
  async emit<E extends NexusEventName>(
    event: E,
    payload: E extends keyof NexusEventPayloads ? NexusEventPayloads[E] : any
  ): Promise<void> {
    if (!this.enabled) return;

    // Record event in history
    const record: EventRecord = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: event,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.history.push(record);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Log event
    logger.debug("events", `Event: ${event}`, payload);

    // Call handlers
    const handlers = this.handlers.get(event);
    if (!handlers || handlers.size === 0) return;

    const promises = Array.from(handlers).map(async (handler) => {
      try {
        await handler(payload);
      } catch (error: any) {
        logger.error("events", `Handler error for ${event}: ${error.message}`);
      }
    });

    await Promise.all(promises);

    // Also emit to wildcard listeners
    const wildcardHandlers = this.handlers.get("*" as NexusEventName);
    if (wildcardHandlers) {
      const wildcardArray = Array.from(wildcardHandlers);
      for (const handler of wildcardArray) {
        try {
          await handler({ event, payload });
        } catch (error: any) {
          logger.error("events", `Wildcard handler error: ${error.message}`);
        }
      }
    }
  }

  /**
   * Get event history
   * @param options - Filter options
   */
  getHistory(options?: {
    event?: NexusEventName;
    limit?: number;
    since?: string;
  }): EventRecord[] {
    let result = [...this.history];

    if (options?.event) {
      result = result.filter((r) => r.name === options.event);
    }

    if (options?.since) {
      const since = options.since;
      result = result.filter((r) => r.timestamp >= since);
    }

    if (options?.limit) {
      result = result.slice(-options.limit);
    }

    return result;
  }

  /**
   * Clear all handlers and history
   */
  clear(): void {
    this.handlers.clear();
    this.history = [];
  }

  /**
   * Enable/disable the event bus
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get statistics about the event bus
   */
  getStats(): {
    totalEvents: number;
    handlerCount: number;
    eventTypes: string[];
  } {
    return {
      totalEvents: this.history.length,
      handlerCount: Array.from(this.handlers.values()).reduce((sum, set) => sum + set.size, 0),
      eventTypes: Array.from(this.handlers.keys()),
    };
  }
}

// Singleton instance
export const eventBus = new NexusEventBus();

// Convenience exports
export const on = eventBus.on.bind(eventBus);
export const once = eventBus.once.bind(eventBus);
export const off = eventBus.off.bind(eventBus);
export const emit = eventBus.emit.bind(eventBus);

