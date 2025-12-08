/**
 * Vector Agent
 * Manages vector embeddings and semantic search operations
 */

import type { Agent, AgentInput, AgentOutput } from "../core/types";

const vectorAgent: Agent = {
  id: "vector",
  name: "Vector Agent",
  description: "Manages vector embeddings and semantic search",
  capabilities: ["embeddings", "semantic-search", "similarity", "clustering"],
  priority: 13,
  enabled: true,

  async process(input: AgentInput): Promise<AgentOutput> {
    const { query, context } = input;

    try {
      const action = detectVectorAction(query);
      const result = await handleVectorAction(action, query, context);

      return {
        success: true,
        result,
        confidence: 0.85,
        explanation: `Vector ${action} completed`,
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

function detectVectorAction(query: string): string {
  const lower = query.toLowerCase();
  
  if (lower.includes("similar") || lower.includes("like")) return "similar";
  if (lower.includes("cluster") || lower.includes("group")) return "cluster";
  if (lower.includes("embed") || lower.includes("vectorize")) return "embed";
  
  return "search";
}

async function handleVectorAction(
  action: string,
  query: string,
  context: Record<string, any>
): Promise<any> {
  switch (action) {
    case "similar":
      return findSimilar(query, context);
    case "cluster":
      return clusterItems(context);
    case "embed":
      return createEmbedding(query);
    default:
      return semanticSearch(query, context);
  }
}

function findSimilar(query: string, context: Record<string, any>): any {
  const items = context.items || [];
  const target = query.replace(/find similar|like|to/gi, "").trim();

  // Mock similarity results
  const similar = items.slice(0, 3).map((item: any, i: number) => ({
    id: item.id,
    name: item.name,
    similarity: (0.9 - i * 0.1).toFixed(2),
  }));

  return {
    answer: `🔗 **Similar to "${target}"**\n\n` +
      similar.map((s: any) => `• ${s.name} (${(s.similarity * 100).toFixed(0)}% match)`).join("\n"),
    similar,
  };
}

function clusterItems(context: Record<string, any>): any {
  const items = context.items || [];
  
  // Group by category (mock clustering)
  const clusters: Record<string, any[]> = {};
  items.forEach((item: any) => {
    const cat = item.category || "Uncategorized";
    if (!clusters[cat]) clusters[cat] = [];
    clusters[cat].push(item);
  });

  const clusterInfo = Object.entries(clusters).map(([name, items]) => ({
    name,
    count: items.length,
    items: items.slice(0, 3),
  }));

  return {
    answer: `📊 **Item Clusters**\n\n` +
      clusterInfo.map(c => `**${c.name}** (${c.count} items)`).join("\n"),
    clusters: clusterInfo,
  };
}

function createEmbedding(text: string): any {
  // Generate mock embedding
  const embedding = Array(128).fill(0).map(() => Math.random() * 2 - 1);

  return {
    answer: `✅ Created embedding (${embedding.length} dimensions)`,
    embedding: embedding.slice(0, 5), // Return sample
    dimensions: embedding.length,
  };
}

function semanticSearch(query: string, context: Record<string, any>): any {
  const items = context.items || [];
  
  // Mock semantic search with keyword matching
  const results = items
    .filter((item: any) => {
      const content = `${item.name} ${item.description || ""}`.toLowerCase();
      return query.toLowerCase().split(" ").some(w => content.includes(w));
    })
    .slice(0, 5)
    .map((item: any, i: number) => ({
      id: item.id,
      name: item.name,
      relevance: (1 - i * 0.1).toFixed(2),
    }));

  return {
    answer: results.length > 0
      ? `🔍 **Semantic Search Results**\n\n` +
        results.map((r: any) => `• ${r.name} (${(r.relevance * 100).toFixed(0)}% relevant)`).join("\n")
      : `No results found for "${query}"`,
    results,
  };
}

export default vectorAgent;


