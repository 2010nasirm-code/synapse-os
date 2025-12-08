// ============================================================================
// NEXUS PLUGINS - Plugin Management System
// ============================================================================

import { generateUUID, now } from '../../utils';
import { eventBus } from '../../core/engine';

export interface PluginDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  homepage?: string;
  dependencies?: string[];
  permissions?: string[];
  hooks: PluginHookDefinition[];
  settings?: PluginSettingDefinition[];
}

export interface PluginHookDefinition {
  name: string;
  description?: string;
  type: 'filter' | 'action' | 'provider';
}

export interface PluginSettingDefinition {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  default?: unknown;
  options?: { value: unknown; label: string }[];
}

export interface PluginHookHandler {
  pluginId: string;
  hook: string;
  priority: number;
  handler: (...args: unknown[]) => unknown | Promise<unknown>;
}

export interface InstalledPlugin {
  definition: PluginDefinition;
  enabled: boolean;
  settings: Record<string, unknown>;
  installedAt: number;
  updatedAt: number;
}

export class NexusPluginManager {
  private plugins: Map<string, InstalledPlugin> = new Map();
  private hooks: Map<string, PluginHookHandler[]> = new Map();
  private providers: Map<string, PluginHookHandler> = new Map();

  // ----------------------------- Plugin Installation ------------------------
  install(definition: PluginDefinition): InstalledPlugin {
    if (this.plugins.has(definition.id)) {
      throw new Error(`Plugin already installed: ${definition.id}`);
    }

    // Check dependencies
    for (const dep of definition.dependencies || []) {
      if (!this.plugins.has(dep)) {
        throw new Error(`Missing dependency: ${dep}`);
      }
    }

    // Initialize settings with defaults
    const settings: Record<string, unknown> = {};
    for (const setting of definition.settings || []) {
      settings[setting.key] = setting.default;
    }

    const installed: InstalledPlugin = {
      definition,
      enabled: false,
      settings,
      installedAt: now(),
      updatedAt: now(),
    };

    this.plugins.set(definition.id, installed);
    eventBus.emit('plugins:installed', { pluginId: definition.id });

    return installed;
  }

  uninstall(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    // Check if other plugins depend on this
    for (const [id, p] of this.plugins) {
      if (p.definition.dependencies?.includes(pluginId)) {
        throw new Error(`Cannot uninstall: ${id} depends on this plugin`);
      }
    }

    // Disable first
    if (plugin.enabled) {
      this.disable(pluginId);
    }

    this.plugins.delete(pluginId);
    eventBus.emit('plugins:uninstalled', { pluginId });

    return true;
  }

  // ----------------------------- Plugin Control -----------------------------
  enable(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.enabled) return false;

    plugin.enabled = true;
    plugin.updatedAt = now();
    
    eventBus.emit('plugins:enabled', { pluginId });
    
    return true;
  }

  disable(pluginId: string): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.enabled) return false;

    // Remove all hooks registered by this plugin
    for (const [hookName, handlers] of this.hooks) {
      this.hooks.set(
        hookName,
        handlers.filter(h => h.pluginId !== pluginId)
      );
    }

    // Remove providers
    for (const [name, handler] of this.providers) {
      if (handler.pluginId === pluginId) {
        this.providers.delete(name);
      }
    }

    plugin.enabled = false;
    plugin.updatedAt = now();
    
    eventBus.emit('plugins:disabled', { pluginId });
    
    return true;
  }

  // ----------------------------- Hook Registration --------------------------
  registerHook(
    pluginId: string,
    hookName: string,
    handler: (...args: unknown[]) => unknown | Promise<unknown>,
    priority: number = 10
  ): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.enabled) {
      throw new Error(`Plugin not enabled: ${pluginId}`);
    }

    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    const handlers = this.hooks.get(hookName)!;
    handlers.push({ pluginId, hook: hookName, priority, handler });
    handlers.sort((a, b) => a.priority - b.priority);
  }

  registerProvider(
    pluginId: string,
    providerName: string,
    handler: (...args: unknown[]) => unknown | Promise<unknown>
  ): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || !plugin.enabled) {
      throw new Error(`Plugin not enabled: ${pluginId}`);
    }

    if (this.providers.has(providerName)) {
      throw new Error(`Provider already registered: ${providerName}`);
    }

    this.providers.set(providerName, {
      pluginId,
      hook: providerName,
      priority: 0,
      handler,
    });
  }

  // ----------------------------- Hook Execution -----------------------------
  async runFilter<T>(hookName: string, value: T, ...args: unknown[]): Promise<T> {
    const handlers = this.hooks.get(hookName);
    if (!handlers) return value;

    let result = value;
    for (const { handler, pluginId } of handlers) {
      try {
        result = (await handler(result, ...args)) as T;
      } catch (error) {
        console.error(`Plugin ${pluginId} filter error:`, error);
      }
    }

    return result;
  }

  async runAction(hookName: string, ...args: unknown[]): Promise<void> {
    const handlers = this.hooks.get(hookName);
    if (!handlers) return;

    for (const { handler, pluginId } of handlers) {
      try {
        await handler(...args);
      } catch (error) {
        console.error(`Plugin ${pluginId} action error:`, error);
      }
    }
  }

  async getFromProvider<T>(providerName: string, ...args: unknown[]): Promise<T | null> {
    const provider = this.providers.get(providerName);
    if (!provider) return null;

    try {
      return (await provider.handler(...args)) as T;
    } catch (error) {
      console.error(`Provider ${providerName} error:`, error);
      return null;
    }
  }

  // ----------------------------- Settings -----------------------------------
  getSetting<T>(pluginId: string, key: string): T | undefined {
    const plugin = this.plugins.get(pluginId);
    return plugin?.settings[key] as T | undefined;
  }

  setSetting(pluginId: string, key: string, value: unknown): boolean {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return false;

    plugin.settings[key] = value;
    plugin.updatedAt = now();
    
    eventBus.emit('plugins:settings:changed', { pluginId, key, value });
    
    return true;
  }

  getSettings(pluginId: string): Record<string, unknown> | undefined {
    return this.plugins.get(pluginId)?.settings;
  }

  // ----------------------------- Queries ------------------------------------
  getPlugin(pluginId: string): InstalledPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): InstalledPlugin[] {
    return Array.from(this.plugins.values());
  }

  getEnabledPlugins(): InstalledPlugin[] {
    return this.getAllPlugins().filter(p => p.enabled);
  }

  getAvailableHooks(): string[] {
    return Array.from(this.hooks.keys());
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  // ----------------------------- Statistics ---------------------------------
  getStats() {
    const plugins = this.getAllPlugins();
    
    return {
      totalPlugins: plugins.length,
      enabledPlugins: plugins.filter(p => p.enabled).length,
      disabledPlugins: plugins.filter(p => !p.enabled).length,
      totalHooks: Array.from(this.hooks.values()).reduce((sum, h) => sum + h.length, 0),
      totalProviders: this.providers.size,
    };
  }
}

// Singleton instance
export const nexusPlugins = new NexusPluginManager();
export default nexusPlugins;

// ----------------------------- Standard Hooks --------------------------------
export const StandardHooks = {
  // Data hooks
  BEFORE_SAVE: 'data:beforeSave',
  AFTER_SAVE: 'data:afterSave',
  BEFORE_DELETE: 'data:beforeDelete',
  AFTER_DELETE: 'data:afterDelete',
  
  // UI hooks
  RENDER_WIDGET: 'ui:renderWidget',
  MODIFY_MENU: 'ui:modifyMenu',
  ADD_TOOLBAR_ITEM: 'ui:addToolbarItem',
  
  // Processing hooks
  BEFORE_COMPUTE: 'compute:before',
  AFTER_COMPUTE: 'compute:after',
  TRANSFORM_RESULT: 'compute:transformResult',
  
  // Suggestion hooks
  GENERATE_SUGGESTIONS: 'suggestions:generate',
  FILTER_SUGGESTIONS: 'suggestions:filter',
  
  // Analytics hooks
  TRACK_EVENT: 'analytics:trackEvent',
  PROCESS_ANALYTICS: 'analytics:process',
  
  // Memory hooks
  BEFORE_STORE_MEMORY: 'memory:beforeStore',
  AFTER_RETRIEVE_MEMORY: 'memory:afterRetrieve',
} as const;


