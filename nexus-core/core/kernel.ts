/**
 * Nexus Kernel
 * Core processing engine that orchestrates all components
 */

import type { 
  NexusRequest, 
  NexusResponse, 
  Agent, 
  AgentOutput,
  ProvenanceRecord 
} from "./types";
import { configManager } from "./config";
import { memorySystem } from "./memory";
import { router } from "./router";
import { logger } from "../lib/logger";

class NexusKernel {
  private initialized = false;
  private agents: Map<string, Agent> = new Map();
  private taskQueue: Array<{ id: string; task: () => Promise<any> }> = [];
  private processing = false;

  /**
   * Initialize the kernel
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    logger.info("kernel", "Initializing Nexus Kernel...");
    
    // Load agents dynamically
    await this.loadAgents();
    
    this.initialized = true;
    logger.info("kernel", `Nexus Kernel initialized with ${this.agents.size} agents`);
  }

  /**
   * Process a request through the Nexus system
   */
  async process(request: NexusRequest): Promise<NexusResponse> {
    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    
    logger.info("kernel", `Processing request ${requestId}`, { userId: request.userId });

    try {
      // Ensure initialization
      await this.initialize();

      // Parse query
      const query = typeof request.query === "string" 
        ? request.query 
        : request.query.intent;

      // Get relevant memory
      const memory = configManager.getFeatures().memoryEnabled
        ? await memorySystem.query({ userId: request.userId, query, limit: 10 })
        : [];

      // Route to appropriate agents
      const selectedAgents = await router.route(query, request.options?.agents);
      
      logger.debug("kernel", `Selected agents: ${selectedAgents.join(", ")}`);

      // Execute agents (parallel or sequential based on dependencies)
      const results = await this.executeAgents(selectedAgents, {
        query,
        context: typeof request.query === "object" ? request.query.context || {} : {},
        memory,
        options: request.options,
      });

      // Merge results
      const mergedResult = this.mergeResults(results);

      // Store interaction in memory if enabled
      if (configManager.getFeatures().memoryEnabled && request.options?.memoryScope !== "none") {
        await memorySystem.add(
          request.userId,
          `Q: ${query}\nA: ${mergedResult.answer}`,
          "conversation",
          { source: "nexus", tags: this.extractTags(query) }
        );
      }

      const response: NexusResponse = {
        success: true,
        answer: mergedResult.answer,
        agentsUsed: selectedAgents,
        provenance: mergedResult.provenance,
        data: mergedResult.data,
        suggestions: mergedResult.suggestions,
        metadata: {
          requestId,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };

      logger.info("kernel", `Request ${requestId} completed in ${response.metadata.processingTime}ms`);
      return response;

    } catch (error: any) {
      logger.error("kernel", `Request ${requestId} failed: ${error.message}`);
      
      return {
        success: false,
        answer: `I encountered an error: ${error.message}. Please try again.`,
        agentsUsed: [],
        provenance: [],
        metadata: {
          requestId,
          processingTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Register an agent
   */
  registerAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
    logger.debug("kernel", `Registered agent: ${agent.id}`);
  }

  /**
   * Get all registered agents
   */
  getAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  // Private methods

  private async loadAgents(): Promise<void> {
    // Import and register all agents
    const agentModules = [
      { id: "reasoning", module: () => import("../agents/reasoningAgent") },
      { id: "memory", module: () => import("../agents/memoryAgent") },
      { id: "planning", module: () => import("../agents/planningAgent") },
      { id: "analytics", module: () => import("../agents/analyticsAgent") },
      { id: "insight", module: () => import("../agents/insightAgent") },
      { id: "summarization", module: () => import("../agents/summarizationAgent") },
      { id: "search", module: () => import("../agents/searchAgent") },
      { id: "creativity", module: () => import("../agents/creativityAgent") },
    ];

    for (const { id, module } of agentModules) {
      if (configManager.isAgentEnabled(id)) {
        try {
          const mod = await module();
          if (mod.default) {
            this.registerAgent(mod.default);
          }
        } catch (error) {
          logger.warn("kernel", `Failed to load agent: ${id}`);
        }
      }
    }
  }

  private async executeAgents(
    agentIds: string[],
    input: { query: string; context: Record<string, any>; memory: any[]; options?: any }
  ): Promise<Map<string, AgentOutput>> {
    const results = new Map<string, AgentOutput>();

    // Execute in parallel
    const promises = agentIds.map(async (id) => {
      const agent = this.agents.get(id);
      if (!agent) return;

      try {
        const output = await agent.process({
          query: input.query,
          context: input.context,
          memory: input.memory,
          options: input.options,
        });
        results.set(id, output);
      } catch (error: any) {
        results.set(id, {
          success: false,
          result: null,
          confidence: 0,
          error: error.message,
        });
      }
    });

    await Promise.all(promises);
    return results;
  }

  private mergeResults(results: Map<string, AgentOutput>): {
    answer: string;
    provenance: ProvenanceRecord[];
    data: any;
    suggestions: string[];
  } {
    const answers: string[] = [];
    const provenance: ProvenanceRecord[] = [];
    const allData: Record<string, any> = {};
    const allSuggestions: string[] = [];

    results.forEach((output, agentId) => {
      if (output.success && output.result) {
        const agent = this.agents.get(agentId);
        
        if (typeof output.result === "string") {
          answers.push(output.result);
        } else if (output.result.answer) {
          answers.push(output.result.answer);
        }

        provenance.push({
          agentId,
          agentName: agent?.name || agentId,
          contribution: output.explanation || "Processed query",
          confidence: output.confidence,
          timestamp: new Date().toISOString(),
        });

        if (output.result.data) {
          allData[agentId] = output.result.data;
        }

        if (output.suggestions) {
          allSuggestions.push(...output.suggestions);
        }
      }
    });

    // Combine answers (take highest confidence or merge)
    const sortedProvenance = provenance.sort((a, b) => b.confidence - a.confidence);
    const bestAnswer = answers[0] || "I couldn't generate a response. Please try rephrasing your question.";

    return {
      answer: bestAnswer,
      provenance: sortedProvenance,
      data: Object.keys(allData).length > 0 ? allData : undefined,
      suggestions: Array.from(new Set(allSuggestions)).slice(0, 5),
    };
  }

  private extractTags(query: string): string[] {
    // Simple keyword extraction
    const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "what", "how", "why", "when", "where", "who"]);
    return query
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 5);
  }
}

export const kernel = new NexusKernel();

