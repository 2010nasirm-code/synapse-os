/**
 * @module tools
 * @description Tools Layer for AI Agents
 * 
 * Provides a standardized interface for AI agents to interact with external
 * services, APIs, and system capabilities. Tools are composable, validated,
 * and tracked for usage analytics.
 * 
 * @example
 * ```typescript
 * // Register a tool
 * toolRegistry.register({
 *   id: 'web-search',
 *   name: 'Web Search',
 *   execute: async (params) => { ... }
 * });
 * 
 * // Execute a tool
 * const result = await toolRegistry.execute('web-search', { query: 'test' });
 * ```
 * 
 * @version 1.0.0
 */

import { eventBus } from "../core/events";
import { logger } from "../lib/logger";

// ============================================
// TOOL TYPES
// ============================================

/**
 * Tool parameter definition
 */
export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
  default?: any;
  enum?: any[];
}

/**
 * Tool definition
 */
export interface Tool {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  parameters: ToolParameter[];
  execute: (params: Record<string, any>) => Promise<ToolResult>;
  validate?: (params: Record<string, any>) => ValidationResult;
  enabled?: boolean;
  rateLimit?: { requests: number; window: number }; // requests per window (seconds)
}

/**
 * Tool categories
 */
export type ToolCategory =
  | "search"
  | "data"
  | "communication"
  | "file"
  | "system"
  | "ai"
  | "integration"
  | "utility";

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: {
    duration: number;
    cached?: boolean;
    tokens?: number;
  };
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================
// TOOL REGISTRY
// ============================================

/**
 * @class ToolRegistry
 * @description Central registry for all available tools
 */
class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private usageStats: Map<string, { calls: number; errors: number; totalDuration: number }> = new Map();
  private rateLimiters: Map<string, { count: number; resetAt: number }> = new Map();

  /**
   * Register a new tool
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.id)) {
      logger.warn("tools", `Tool ${tool.id} already registered, overwriting`);
    }
    this.tools.set(tool.id, { ...tool, enabled: tool.enabled ?? true });
    this.usageStats.set(tool.id, { calls: 0, errors: 0, totalDuration: 0 });
    logger.info("tools", `Registered tool: ${tool.id}`);
  }

  /**
   * Unregister a tool
   */
  unregister(toolId: string): boolean {
    return this.tools.delete(toolId);
  }

  /**
   * Get a tool by ID
   */
  get(toolId: string): Tool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * List all tools
   */
  list(options?: { category?: ToolCategory; enabled?: boolean }): Tool[] {
    let tools = Array.from(this.tools.values());
    
    if (options?.category) {
      tools = tools.filter((t) => t.category === options.category);
    }
    if (options?.enabled !== undefined) {
      tools = tools.filter((t) => t.enabled === options.enabled);
    }
    
    return tools;
  }

  /**
   * Execute a tool
   */
  async execute(toolId: string, params: Record<string, any>): Promise<ToolResult> {
    const tool = this.tools.get(toolId);
    
    if (!tool) {
      return { success: false, error: `Tool not found: ${toolId}` };
    }

    if (!tool.enabled) {
      return { success: false, error: `Tool is disabled: ${toolId}` };
    }

    // Check rate limit
    if (tool.rateLimit && !this.checkRateLimit(toolId, tool.rateLimit)) {
      return { success: false, error: `Rate limit exceeded for: ${toolId}` };
    }

    // Validate parameters
    const validation = this.validateParams(tool, params);
    if (!validation.valid) {
      return { success: false, error: `Validation failed: ${validation.errors.join(", ")}` };
    }

    // Execute
    const startTime = Date.now();
    try {
      const result = await tool.execute(params);
      const duration = Date.now() - startTime;

      // Update stats
      const stats = this.usageStats.get(toolId)!;
      stats.calls++;
      stats.totalDuration += duration;

      // Emit event
      eventBus.emit("skill:executed", { skillId: toolId, duration });

      return {
        ...result,
        metadata: { ...result.metadata, duration },
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      // Update error stats
      const stats = this.usageStats.get(toolId)!;
      stats.calls++;
      stats.errors++;
      stats.totalDuration += duration;

      logger.error("tools", `Tool ${toolId} failed: ${error.message}`);
      eventBus.emit("skill:failed", { skillId: toolId, error: error.message });

      return {
        success: false,
        error: error.message,
        metadata: { duration },
      };
    }
  }

  /**
   * Get usage statistics
   */
  getStats(toolId?: string) {
    if (toolId) {
      return this.usageStats.get(toolId);
    }
    return Object.fromEntries(this.usageStats);
  }

  /**
   * Enable/disable a tool
   */
  setEnabled(toolId: string, enabled: boolean): boolean {
    const tool = this.tools.get(toolId);
    if (!tool) return false;
    tool.enabled = enabled;
    return true;
  }

  // Private helpers

  private validateParams(tool: Tool, params: Record<string, any>): ValidationResult {
    const errors: string[] = [];

    // Custom validation
    if (tool.validate) {
      return tool.validate(params);
    }

    // Default parameter validation
    for (const param of tool.parameters) {
      const value = params[param.name];

      if (param.required && value === undefined) {
        errors.push(`Missing required parameter: ${param.name}`);
        continue;
      }

      if (value !== undefined) {
        const actualType = Array.isArray(value) ? "array" : typeof value;
        if (actualType !== param.type && param.type !== "object") {
          errors.push(`Invalid type for ${param.name}: expected ${param.type}, got ${actualType}`);
        }

        if (param.enum && !param.enum.includes(value)) {
          errors.push(`Invalid value for ${param.name}: must be one of ${param.enum.join(", ")}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private checkRateLimit(toolId: string, limit: { requests: number; window: number }): boolean {
    const now = Date.now();
    const limiter = this.rateLimiters.get(toolId);

    if (!limiter || now >= limiter.resetAt) {
      this.rateLimiters.set(toolId, { count: 1, resetAt: now + limit.window * 1000 });
      return true;
    }

    if (limiter.count >= limit.requests) {
      return false;
    }

    limiter.count++;
    return true;
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();

// ============================================
// BUILT-IN TOOLS
// ============================================

// HTTP Request Tool
toolRegistry.register({
  id: "http-request",
  name: "HTTP Request",
  description: "Make HTTP requests to external APIs",
  category: "integration",
  parameters: [
    { name: "url", type: "string", description: "Request URL", required: true },
    { name: "method", type: "string", description: "HTTP method", default: "GET", enum: ["GET", "POST", "PUT", "DELETE"] },
    { name: "headers", type: "object", description: "Request headers" },
    { name: "body", type: "object", description: "Request body" },
  ],
  rateLimit: { requests: 100, window: 60 },
  execute: async (params) => {
    try {
      const response = await fetch(params.url, {
        method: params.method || "GET",
        headers: params.headers,
        body: params.body ? JSON.stringify(params.body) : undefined,
      });
      const data = await response.json();
      return { success: response.ok, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },
});

// JSON Parser Tool
toolRegistry.register({
  id: "json-parse",
  name: "JSON Parser",
  description: "Parse and validate JSON strings",
  category: "utility",
  parameters: [
    { name: "input", type: "string", description: "JSON string to parse", required: true },
  ],
  execute: async (params) => {
    try {
      const data = JSON.parse(params.input);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: `Invalid JSON: ${error.message}` };
    }
  },
});

// Date/Time Tool
toolRegistry.register({
  id: "datetime",
  name: "Date/Time",
  description: "Get current date/time and perform calculations",
  category: "utility",
  parameters: [
    { name: "operation", type: "string", description: "Operation", default: "now", enum: ["now", "format", "add", "diff"] },
    { name: "date", type: "string", description: "Date string (ISO format)" },
    { name: "format", type: "string", description: "Output format" },
    { name: "amount", type: "number", description: "Amount to add/subtract" },
    { name: "unit", type: "string", description: "Time unit", enum: ["days", "hours", "minutes", "seconds"] },
  ],
  execute: async (params) => {
    const { operation, date, amount, unit } = params;
    
    switch (operation) {
      case "now":
        return { success: true, data: { iso: new Date().toISOString(), unix: Date.now() } };
      case "add":
        const baseDate = date ? new Date(date) : new Date();
        const ms = {
          days: 86400000,
          hours: 3600000,
          minutes: 60000,
          seconds: 1000,
        }[unit as string] || 0;
        const newDate = new Date(baseDate.getTime() + (amount || 0) * ms);
        return { success: true, data: { iso: newDate.toISOString() } };
      default:
        return { success: true, data: { iso: new Date().toISOString() } };
    }
  },
});

// Text Analysis Tool
toolRegistry.register({
  id: "text-analysis",
  name: "Text Analysis",
  description: "Analyze text for statistics and patterns",
  category: "utility",
  parameters: [
    { name: "text", type: "string", description: "Text to analyze", required: true },
  ],
  execute: async (params) => {
    const { text } = params;
    const words = text.split(/\s+/).filter((w: string) => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    const paragraphs = text.split(/\n\n+/).filter((p: string) => p.trim().length > 0);

    return {
      success: true,
      data: {
        characters: text.length,
        words: words.length,
        sentences: sentences.length,
        paragraphs: paragraphs.length,
        averageWordLength: words.length > 0 ? (words.reduce((sum: number, w: string) => sum + w.length, 0) / words.length).toFixed(1) : 0,
        averageSentenceLength: sentences.length > 0 ? (words.length / sentences.length).toFixed(1) : 0,
      },
    };
  },
});

export default toolRegistry;

