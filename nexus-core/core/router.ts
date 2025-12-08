/**
 * Nexus Router
 * Analyzes requests and routes to appropriate agents
 */

import { configManager } from "./config";
import { logger } from "../lib/logger";

interface RoutePattern {
  pattern: RegExp | string[];
  agents: string[];
  priority: number;
}

class NexusRouter {
  private patterns: RoutePattern[] = [
    // Question/reasoning patterns
    {
      pattern: ["what", "why", "how", "explain", "tell me", "describe"],
      agents: ["reasoning", "memory", "search"],
      priority: 1,
    },
    // Analysis patterns
    {
      pattern: ["analyze", "analysis", "insight", "pattern", "trend", "data"],
      agents: ["analytics", "insight", "reasoning"],
      priority: 2,
    },
    // Planning patterns
    {
      pattern: ["plan", "schedule", "organize", "steps", "roadmap", "goal"],
      agents: ["planning", "reasoning"],
      priority: 3,
    },
    // Memory patterns
    {
      pattern: ["remember", "recall", "forgot", "history", "past", "before"],
      agents: ["memory", "search"],
      priority: 4,
    },
    // Summarization patterns
    {
      pattern: ["summarize", "summary", "brief", "tldr", "overview", "recap"],
      agents: ["summarization", "reasoning"],
      priority: 5,
    },
    // Creative patterns
    {
      pattern: ["create", "generate", "write", "compose", "idea", "brainstorm"],
      agents: ["creativity", "reasoning"],
      priority: 6,
    },
    // Search patterns
    {
      pattern: ["find", "search", "look for", "where is", "locate"],
      agents: ["search", "memory"],
      priority: 7,
    },
  ];

  /**
   * Route a query to appropriate agents
   */
  async route(query: string, preferredAgents?: string[]): Promise<string[]> {
    const lowerQuery = query.toLowerCase();
    const matchedAgents = new Set<string>();

    // If specific agents requested, use those
    if (preferredAgents?.length) {
      preferredAgents.forEach(a => {
        if (configManager.isAgentEnabled(a)) {
          matchedAgents.add(a);
        }
      });
      
      if (matchedAgents.size > 0) {
        return Array.from(matchedAgents);
      }
    }

    // Match against patterns
    for (const route of this.patterns) {
      const matches = Array.isArray(route.pattern)
        ? route.pattern.some(p => lowerQuery.includes(p))
        : route.pattern.test(lowerQuery);

      if (matches) {
        route.agents.forEach(a => {
          if (configManager.isAgentEnabled(a)) {
            matchedAgents.add(a);
          }
        });
      }
    }

    // Default to reasoning agent if no matches
    if (matchedAgents.size === 0) {
      if (configManager.isAgentEnabled("reasoning")) {
        matchedAgents.add("reasoning");
      }
    }

    const result = Array.from(matchedAgents).slice(0, 5); // Max 5 agents
    logger.debug("router", `Routed query to agents: ${result.join(", ")}`);
    
    return result;
  }

  /**
   * Add a custom routing pattern
   */
  addPattern(pattern: RoutePattern): void {
    this.patterns.push(pattern);
    this.patterns.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get all patterns
   */
  getPatterns(): RoutePattern[] {
    return [...this.patterns];
  }

  /**
   * Analyze query intent
   */
  analyzeIntent(query: string): {
    primaryIntent: string;
    confidence: number;
    entities: string[];
  } {
    const lowerQuery = query.toLowerCase();
    
    // Simple intent detection
    let primaryIntent = "general";
    let confidence = 0.5;

    if (lowerQuery.includes("?")) {
      primaryIntent = "question";
      confidence = 0.8;
    }
    
    if (lowerQuery.match(/^(create|make|generate|write)/)) {
      primaryIntent = "create";
      confidence = 0.9;
    }
    
    if (lowerQuery.match(/^(find|search|look)/)) {
      primaryIntent = "search";
      confidence = 0.9;
    }
    
    if (lowerQuery.match(/^(analyze|analyse|show.*data)/)) {
      primaryIntent = "analyze";
      confidence = 0.85;
    }

    // Extract potential entities (simple noun extraction)
    const entities = query
      .split(/\W+/)
      .filter(word => word.length > 3 && word[0] === word[0].toUpperCase())
      .slice(0, 5);

    return { primaryIntent, confidence, entities };
  }
}

export const router = new NexusRouter();

