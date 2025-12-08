/**
 * @module core
 * @description Nexus Core - Main Entry Point
 * 
 * Central module that exports all core functionality for the Nexus system.
 * This is the primary interface for interacting with Nexus programmatically.
 * 
 * @example
 * ```typescript
 * import { processQuery, kernel, eventBus } from '@/nexus-core/core';
 * 
 * const response = await processQuery({
 *   userId: 'user-123',
 *   query: 'What should I focus on today?',
 * });
 * ```
 * 
 * @version 1.0.0
 * @since 2024-01-01
 */

// Type exports
export * from "./types";

// Configuration
export * from "./config";

// Version & metadata
export * from "./version";

// Event system
export { eventBus, on, once, off, emit, type NexusEventName } from "./events";

// Core components
export { kernel } from "./kernel";
export { router } from "./router";
export { memorySystem } from "./memory";

// Convenience function for processing requests
import { kernel } from "./kernel";
import { eventBus } from "./events";
import { getVersionInfo, VERSION_STRING } from "./version";
import type { NexusRequest, NexusResponse } from "./types";

/**
 * Process a query through the Nexus system
 * @param request - The query request
 * @returns Promise resolving to the query response
 */
export async function processQuery(request: NexusRequest): Promise<NexusResponse> {
  eventBus.emit("query:start", {
    requestId: `req-${Date.now()}`,
    userId: request.userId,
    query: typeof request.query === "string" ? request.query : request.query.intent,
  });
  
  return kernel.process(request);
}

/**
 * Initialize the Nexus system
 * @returns Promise resolving when initialization is complete
 */
export async function initialize(): Promise<void> {
  await kernel.initialize();
  const info = getVersionInfo();
  eventBus.emit("system:initialized", {
    version: info.version,
    agents: kernel.getAgents().length,
    skills: 7, // Current skill count
  });
}

/**
 * Get system status
 */
export function getStatus() {
  return {
    version: VERSION_STRING,
    initialized: true,
    agents: kernel.getAgents().map((a) => ({
      id: a.id,
      name: a.name,
      enabled: a.enabled,
    })),
    eventStats: eventBus.getStats(),
  };
}

// Re-export version info
export { VERSION_STRING as NEXUS_VERSION };
export const NEXUS_NAME = "Nexus OS Core";

