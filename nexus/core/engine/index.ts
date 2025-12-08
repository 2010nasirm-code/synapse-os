// ============================================================================
// NEXUS CORE ENGINE - Main Export
// ============================================================================

export * from './task-engine';
export * from './flow-engine';
export * from './compute-engine';
export * from './event-bus';
export * from './extension-engine';

// Re-export singleton instances
import { taskEngine } from './task-engine';
import { flowEngine } from './flow-engine';
import { computeEngine } from './compute-engine';
import { eventBus, NexusEvents } from './event-bus';
import { extensionEngine } from './extension-engine';

export const NexusEngine = {
  task: taskEngine,
  flow: flowEngine,
  compute: computeEngine,
  events: eventBus,
  extensions: extensionEngine,
  
  // Convenience methods
  emit: eventBus.emit.bind(eventBus),
  on: eventBus.on.bind(eventBus),
  once: eventBus.once.bind(eventBus),
  
  // Initialize all engines
  async initialize(): Promise<void> {
    eventBus.emit(NexusEvents.SYSTEM_READY, { timestamp: Date.now() });
  },
  
  // Shutdown all engines
  async shutdown(): Promise<void> {
    eventBus.emit(NexusEvents.SYSTEM_SHUTDOWN, { timestamp: Date.now() });
    
    // Unload all plugins
    for (const plugin of extensionEngine.getActivePlugins()) {
      await extensionEngine.unloadPlugin(plugin.manifest.id);
    }
    
    // Clear all tasks
    taskEngine.clearAll();
    
    // Clear event history
    eventBus.clearHistory();
  },
  
  // Get overall stats
  getStats() {
    return {
      tasks: taskEngine.getStats(),
      compute: computeEngine.getStats(),
      events: {
        subscriptions: eventBus.getSubscriptionCount(),
        history: eventBus.getRecentEvents(10).length,
      },
      plugins: extensionEngine.getStats(),
      flows: flowEngine.getAllFlows().length,
    };
  },
};

export default NexusEngine;


