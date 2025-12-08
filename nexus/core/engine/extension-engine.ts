// ============================================================================
// NEXUS EXTENSION ENGINE - Plugin Loader & Manager
// ============================================================================

import { NexusPlugin, PluginManifest, PluginInstance, PluginStatus, NexusEvent } from '../../types';
import { generateUUID, now } from '../../utils';
import { getConfig } from '../../config';
import { eventBus, NexusEvents } from './event-bus';

export interface PluginHooks {
  onLoad?: () => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
  onEvent?: (event: NexusEvent) => void | Promise<void>;
  onCompute?: (data: unknown) => unknown | Promise<unknown>;
  onSuggest?: (context: unknown) => unknown[] | Promise<unknown[]>;
  onTrack?: (data: unknown) => void | Promise<void>;
}

export interface PluginContext {
  pluginId: string;
  config: Record<string, unknown>;
  emit: (event: string, data: unknown) => void;
  on: (event: string, handler: (data: unknown) => void) => () => void;
  getService: <T>(name: string) => T | undefined;
  storage: PluginStorage;
}

export interface PluginStorage {
  get: <T>(key: string) => T | undefined;
  set: <T>(key: string, value: T) => void;
  delete: (key: string) => boolean;
  clear: () => void;
}

export class NexusExtensionEngine {
  private plugins: Map<string, NexusPlugin> = new Map();
  private services: Map<string, unknown> = new Map();
  private pluginStorage: Map<string, Map<string, unknown>> = new Map();
  private eventUnsubscribers: Map<string, (() => void)[]> = new Map();

  // ----------------------------- Plugin Registration ------------------------
  async registerPlugin(manifest: PluginManifest): Promise<NexusPlugin> {
    const config = getConfig();
    
    if (this.plugins.size >= config.plugins.maxPlugins) {
      throw new Error(`Maximum plugins (${config.plugins.maxPlugins}) reached`);
    }

    if (this.plugins.has(manifest.id)) {
      throw new Error(`Plugin already registered: ${manifest.id}`);
    }

    // Check dependencies
    for (const dep of manifest.dependencies || []) {
      if (!this.plugins.has(dep)) {
        throw new Error(`Missing dependency: ${dep}`);
      }
    }

    const plugin: NexusPlugin = {
      manifest,
      status: 'inactive',
    };

    this.plugins.set(manifest.id, plugin);
    this.pluginStorage.set(manifest.id, new Map());

    return plugin;
  }

  async unregisterPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    // Check if other plugins depend on this one
    const entries = Array.from(this.plugins.entries());
    for (const [id, p] of entries) {
      if (p.manifest.dependencies?.includes(pluginId)) {
        throw new Error(`Plugin ${id} depends on ${pluginId}`);
      }
    }

    // Unload if active
    if (plugin.status === 'active') {
      await this.unloadPlugin(pluginId);
    }

    // Clean up storage
    this.pluginStorage.delete(pluginId);

    return this.plugins.delete(pluginId);
  }

  // ----------------------------- Plugin Lifecycle ---------------------------
  async loadPlugin(pluginId: string, instance: PluginInstance): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    if (plugin.status === 'active') {
      throw new Error(`Plugin already loaded: ${pluginId}`);
    }

    plugin.status = 'loading';

    try {
      const config = getConfig();
      
      // Create plugin context
      const context = this.createPluginContext(pluginId);

      // Wrap instance methods with context
      plugin.instance = instance;

      // Run onLoad hook with timeout
      if (instance.onLoad) {
        await Promise.race([
          instance.onLoad(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Plugin load timeout')), config.plugins.timeout)
          ),
        ]);
      }

      // Set up event listeners
      if (instance.onEvent) {
        const unsubscribe = eventBus.on('*', instance.onEvent);
        this.eventUnsubscribers.set(pluginId, [unsubscribe]);
      }

      plugin.status = 'active';
      plugin.loadedAt = now();

      eventBus.emit(NexusEvents.PLUGIN_LOADED, { pluginId, manifest: plugin.manifest });

    } catch (error) {
      plugin.status = 'error';
      plugin.error = error instanceof Error ? error : new Error(String(error));
      
      eventBus.emit(NexusEvents.PLUGIN_ERROR, { pluginId, error: plugin.error });
      
      throw error;
    }
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.status !== 'active') {
      return;
    }

    try {
      // Run onUnload hook
      if (plugin.instance?.onUnload) {
        await plugin.instance.onUnload();
      }

      // Remove event listeners
      const unsubscribers = this.eventUnsubscribers.get(pluginId) || [];
      unsubscribers.forEach(unsub => unsub());
      this.eventUnsubscribers.delete(pluginId);

      plugin.status = 'inactive';
      plugin.instance = undefined;

      eventBus.emit(NexusEvents.PLUGIN_UNLOADED, { pluginId });

    } catch (error) {
      plugin.status = 'error';
      plugin.error = error instanceof Error ? error : new Error(String(error));
      throw error;
    }
  }

  async reloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin not found: ${pluginId}`);
    }

    const instance = plugin.instance;
    await this.unloadPlugin(pluginId);
    
    if (instance) {
      await this.loadPlugin(pluginId, instance);
    }
  }

  // ----------------------------- Plugin Context -----------------------------
  private createPluginContext(pluginId: string): PluginContext {
    const storage = this.pluginStorage.get(pluginId)!;

    return {
      pluginId,
      config: {},
      emit: (event, data) => eventBus.emit(`plugin:${pluginId}:${event}`, data),
      on: (event, handler) => eventBus.on(`plugin:${pluginId}:${event}`, (e) => handler(e.payload)),
      getService: <T>(name: string) => this.services.get(name) as T | undefined,
      storage: {
        get: <T>(key: string) => storage.get(key) as T | undefined,
        set: <T>(key: string, value: T) => storage.set(key, value),
        delete: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
    };
  }

  // ----------------------------- Service Registration -----------------------
  registerService<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  unregisterService(name: string): boolean {
    return this.services.delete(name);
  }

  getService<T>(name: string): T | undefined {
    return this.services.get(name) as T | undefined;
  }

  // ----------------------------- Plugin Queries -----------------------------
  getPlugin(pluginId: string): NexusPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): NexusPlugin[] {
    return Array.from(this.plugins.values());
  }

  getActivePlugins(): NexusPlugin[] {
    return this.getAllPlugins().filter(p => p.status === 'active');
  }

  getPluginsByStatus(status: PluginStatus): NexusPlugin[] {
    return this.getAllPlugins().filter(p => p.status === status);
  }

  // ----------------------------- Hook Execution -----------------------------
  async executeHook<T, R>(
    hookName: keyof PluginHooks,
    data: T
  ): Promise<Map<string, R>> {
    const results = new Map<string, R>();
    
    for (const plugin of this.getActivePlugins()) {
      if (!plugin.instance) continue;
      
      const hookFn = plugin.instance[hookName] as ((data: unknown) => Promise<unknown>) | undefined;
      if (typeof hookFn === 'function') {
        try {
          const result = await hookFn(data);
          results.set(plugin.manifest.id, result as R);
        } catch (error) {
          console.error(`Plugin ${plugin.manifest.id} hook ${hookName} error:`, error);
        }
      }
    }
    
    return results;
  }

  // ----------------------------- Auto-Load ----------------------------------
  async autoLoadPlugins(): Promise<void> {
    const config = getConfig();
    if (!config.plugins.autoLoad) return;

    // In a real implementation, this would scan for plugins
    // and load them from a registry or file system
  }

  // ----------------------------- Statistics ---------------------------------
  getStats() {
    const plugins = this.getAllPlugins();
    
    return {
      total: plugins.length,
      active: plugins.filter(p => p.status === 'active').length,
      inactive: plugins.filter(p => p.status === 'inactive').length,
      loading: plugins.filter(p => p.status === 'loading').length,
      error: plugins.filter(p => p.status === 'error').length,
      services: this.services.size,
    };
  }
}

// Singleton instance
export const extensionEngine = new NexusExtensionEngine();

// ----------------------------- Built-in Plugins -----------------------------
// Logger plugin
const loggerPlugin: PluginInstance = {
  onLoad: () => {
    console.log('[Logger Plugin] Loaded');
  },
  onUnload: () => {
    console.log('[Logger Plugin] Unloaded');
  },
  onEvent: (event) => {
    console.log(`[Logger] ${event.type}:`, event.payload);
  },
};

// Analytics plugin
const analyticsPlugin: PluginInstance = {
  onTrack: (data) => {
    console.log('[Analytics] Track:', data);
  },
};

// Register built-in plugins (disabled by default)
extensionEngine.registerPlugin({
  id: 'nexus-logger',
  name: 'Nexus Logger',
  version: '1.0.0',
  description: 'Logs all events for debugging',
  entry: 'logger',
  hooks: ['onEvent'],
});

extensionEngine.registerPlugin({
  id: 'nexus-analytics',
  name: 'Nexus Analytics',
  version: '1.0.0',
  description: 'Tracks user analytics',
  entry: 'analytics',
  hooks: ['onTrack'],
});


