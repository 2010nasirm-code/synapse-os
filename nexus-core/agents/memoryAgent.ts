/**
 * Memory Agent
 * Handles memory retrieval, storage, and context management
 */

import type { Agent, AgentInput, AgentOutput } from "../core/types";
import { memorySystem } from "../core/memory";

const memoryAgent: Agent = {
  id: "memory",
  name: "Memory Agent",
  description: "Manages long-term memory, retrieval, and context awareness",
  capabilities: ["memory-retrieval", "context-management", "history-search", "recall"],
  priority: 2,
  enabled: true,

  async process(input: AgentInput): Promise<AgentOutput> {
    const { query, context, options } = input;
    const userId = context.userId || "default";

    try {
      const lower = query.toLowerCase();
      
      // Determine memory operation
      if (lower.includes("remember") || lower.includes("save") || lower.includes("store")) {
        return await handleRemember(userId, query, context);
      }
      
      if (lower.includes("recall") || lower.includes("what did") || lower.includes("history")) {
        return await handleRecall(userId, query);
      }
      
      if (lower.includes("forget") || lower.includes("delete") || lower.includes("remove")) {
        return await handleForget(userId, query);
      }

      // Default: search memory for relevant context
      return await handleSearch(userId, query);
      
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

async function handleRemember(userId: string, query: string, context: Record<string, any>): Promise<AgentOutput> {
  // Extract what to remember
  const content = query.replace(/remember|save|store/gi, "").trim();
  
  if (content.length < 5) {
    return {
      success: false,
      result: { answer: "Please specify what you'd like me to remember." },
      confidence: 0.5,
    };
  }

  const memory = await memorySystem.add(userId, content, "fact", {
    source: "user",
    tags: extractTags(content),
    importance: 0.7,
  });

  return {
    success: true,
    result: {
      answer: `I've remembered: "${content.slice(0, 100)}..."`,
      memoryId: memory.id,
    },
    confidence: 0.95,
    explanation: "Stored new memory item",
  };
}

async function handleRecall(userId: string, query: string): Promise<AgentOutput> {
  const memories = await memorySystem.query({
    userId,
    query,
    limit: 5,
    minRelevance: 0.3,
  });

  if (memories.length === 0) {
    return {
      success: true,
      result: {
        answer: "I don't have any relevant memories about that. Would you like to tell me something to remember?",
        memories: [],
      },
      confidence: 0.7,
    };
  }

  const summary = memories.map(m => `- ${m.content.slice(0, 100)}`).join("\n");
  
  return {
    success: true,
    result: {
      answer: `Here's what I remember:\n${summary}`,
      memories: memories.map(m => ({
        id: m.id,
        content: m.content,
        type: m.type,
        createdAt: m.createdAt,
      })),
    },
    confidence: 0.85,
    explanation: `Found ${memories.length} relevant memories`,
  };
}

async function handleForget(userId: string, query: string): Promise<AgentOutput> {
  // For safety, require confirmation or specific ID
  return {
    success: true,
    result: {
      answer: "To delete memories, please go to the Memory settings page where you can safely manage your stored memories.",
      action: "navigate_to_memory_settings",
    },
    confidence: 0.9,
    explanation: "Redirected to memory management",
  };
}

async function handleSearch(userId: string, query: string): Promise<AgentOutput> {
  const memories = await memorySystem.query({
    userId,
    query,
    limit: 3,
    minRelevance: 0.4,
  });

  const summary = await memorySystem.getSummary(userId);

  return {
    success: true,
    result: {
      answer: memories.length > 0
        ? `Found ${memories.length} relevant memories that might help with your query.`
        : "No directly relevant memories found, but I can still help you.",
      relevantMemories: memories.slice(0, 3),
      memorySummary: summary,
    },
    confidence: memories.length > 0 ? 0.8 : 0.5,
    explanation: "Searched memory for relevant context",
  };
}

function extractTags(content: string): string[] {
  const words = content.toLowerCase().split(/\W+/);
  const stopWords = new Set(["the", "a", "an", "is", "are", "was", "were", "to", "for", "of", "and", "or"]);
  return words
    .filter(w => w.length > 3 && !stopWords.has(w))
    .slice(0, 5);
}

export default memoryAgent;

