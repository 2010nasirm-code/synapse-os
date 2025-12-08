/**
 * Search Agent
 * Performs semantic search across all data sources
 */

import type { Agent, AgentInput, AgentOutput } from "../core/types";
import { memorySystem } from "../core/memory";

const searchAgent: Agent = {
  id: "search",
  name: "Search Agent",
  description: "Performs semantic search across all data sources",
  capabilities: ["semantic-search", "fuzzy-search", "filter", "find"],
  priority: 7,
  enabled: true,

  async process(input: AgentInput): Promise<AgentOutput> {
    const { query, context, options } = input;
    const userId = context.userId || "default";

    try {
      const searchQuery = extractSearchQuery(query);
      const results = await performSearch(searchQuery, context, userId);

      return {
        success: true,
        result: {
          answer: formatSearchResults(results, searchQuery),
          results,
          query: searchQuery,
        },
        confidence: results.length > 0 ? 0.85 : 0.5,
        explanation: `Found ${results.length} results for "${searchQuery}"`,
      };
    } catch (error: any) {
      return {
        success: false,
        result: null,
        confidence: 0,
        error: error.message,
      };
    }
  },
};

function extractSearchQuery(query: string): string {
  // Remove common search prefixes
  return query
    .replace(/^(find|search|look for|where is|locate)\s*/i, "")
    .trim();
}

async function performSearch(
  searchQuery: string, 
  context: Record<string, any>,
  userId: string
): Promise<Array<{
  type: string;
  title: string;
  content: string;
  relevance: number;
  source: string;
}>> {
  const results: Array<{
    type: string;
    title: string;
    content: string;
    relevance: number;
    source: string;
  }> = [];

  const lowerQuery = searchQuery.toLowerCase();

  // Search items
  const items = context.items || [];
  items.forEach((item: any) => {
    const nameMatch = item.name?.toLowerCase().includes(lowerQuery);
    const descMatch = item.description?.toLowerCase().includes(lowerQuery);
    const catMatch = item.category?.toLowerCase().includes(lowerQuery);

    if (nameMatch || descMatch || catMatch) {
      results.push({
        type: "item",
        title: item.name,
        content: item.description || "",
        relevance: nameMatch ? 1 : descMatch ? 0.8 : 0.6,
        source: "tracker",
      });
    }
  });

  // Search suggestions
  const suggestions = context.suggestions || [];
  suggestions.forEach((sugg: any) => {
    const titleMatch = sugg.title?.toLowerCase().includes(lowerQuery);
    const descMatch = sugg.description?.toLowerCase().includes(lowerQuery);

    if (titleMatch || descMatch) {
      results.push({
        type: "suggestion",
        title: sugg.title,
        content: sugg.description || "",
        relevance: titleMatch ? 0.9 : 0.7,
        source: "suggestions",
      });
    }
  });

  // Search automations
  const automations = context.automations || [];
  automations.forEach((auto: any) => {
    const nameMatch = auto.name?.toLowerCase().includes(lowerQuery);

    if (nameMatch) {
      results.push({
        type: "automation",
        title: auto.name,
        content: auto.description || "",
        relevance: 0.8,
        source: "automations",
      });
    }
  });

  // Search memory
  const memories = await memorySystem.query({
    userId,
    query: searchQuery,
    limit: 5,
    minRelevance: 0.3,
  });

  memories.forEach((mem: any) => {
    results.push({
      type: "memory",
      title: mem.content.slice(0, 50) + "...",
      content: mem.content,
      relevance: (mem as any).relevance || 0.5,
      source: "memory",
    });
  });

  // Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);

  return results.slice(0, 10);
}

function formatSearchResults(
  results: Array<{ type: string; title: string; content: string; relevance: number; source: string }>,
  query: string
): string {
  if (results.length === 0) {
    return `No results found for "${query}". Try different keywords or check your spelling.`;
  }

  let output = `🔎 **Search Results for "${query}"**\n\n`;
  output += `Found ${results.length} results:\n\n`;

  results.slice(0, 5).forEach((result, i) => {
    const icon = {
      item: "📋",
      suggestion: "💡",
      automation: "⚡",
      memory: "🧠",
    }[result.type] || "📄";

    output += `${i + 1}. ${icon} **${result.title}**\n`;
    output += `   ${result.content.slice(0, 100)}${result.content.length > 100 ? "..." : ""}\n`;
    output += `   _Source: ${result.source}_\n\n`;
  });

  if (results.length > 5) {
    output += `_...and ${results.length - 5} more results_`;
  }

  return output;
}

export default searchAgent;

