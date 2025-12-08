/**
 * Thought Graph Engine
 * Builds and analyzes knowledge graphs from user data
 */

export interface GraphNode {
  id: string;
  type: "item" | "automation" | "suggestion" | "category" | "event";
  label: string;
  data: Record<string, any>;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "triggers" | "influences" | "depends_on" | "related_to" | "generates" | "belongs_to";
  weight: number;
}

export interface ThoughtGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    nodeCount: number;
    edgeCount: number;
    density: number;
    clusters: number;
  };
}

export interface GraphInsight {
  id: string;
  type: "hub" | "bottleneck" | "opportunity" | "pattern";
  title: string;
  description: string;
  nodeIds: string[];
  confidence: number;
}

export class GraphEngine {
  buildGraph(
    items: any[],
    automations: any[],
    suggestions: any[]
  ): ThoughtGraph {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const categories = new Set<string>();

    // Add item nodes
    items.forEach((item) => {
      nodes.push({
        id: `item-${item.id}`,
        type: "item",
        label: item.name,
        data: item,
      });

      if (item.category) {
        categories.add(item.category);
      }
    });

    // Add category nodes
    categories.forEach((category) => {
      nodes.push({
        id: `category-${category}`,
        type: "category",
        label: category,
        data: { name: category },
      });
    });

    // Add automation nodes
    automations.forEach((automation) => {
      nodes.push({
        id: `automation-${automation.id}`,
        type: "automation",
        label: automation.name,
        data: automation,
      });
    });

    // Add suggestion nodes
    suggestions.forEach((suggestion) => {
      nodes.push({
        id: `suggestion-${suggestion.id}`,
        type: "suggestion",
        label: suggestion.title,
        data: suggestion,
      });
    });

    // Create edges
    // Items belong to categories
    items.forEach((item) => {
      if (item.category) {
        edges.push({
          id: `edge-${item.id}-cat-${item.category}`,
          source: `item-${item.id}`,
          target: `category-${item.category}`,
          type: "belongs_to",
          weight: 1,
        });
      }
    });

    // Automations influence items (limited to relevant items)
    automations.forEach((automation) => {
      const triggerConfig = automation.trigger_config || {};
      const relevantItems = items.filter((item) => {
        // Only connect to items that match the automation's trigger criteria
        if (triggerConfig.category && item.category === triggerConfig.category) return true;
        if (triggerConfig.priority && item.priority === triggerConfig.priority) return true;
        if (automation.trigger_type === "item_created" || automation.trigger_type === "item_completed") {
          return true;
        }
        return false;
      }).slice(0, 5); // Limit to 5 items max

      relevantItems.forEach((item) => {
        edges.push({
          id: `edge-auto-${automation.id}-item-${item.id}`,
          source: `automation-${automation.id}`,
          target: `item-${item.id}`,
          type: "influences",
          weight: 0.5,
        });
      });
    });

    // Suggestions relate to items (limited)
    suggestions.slice(0, 10).forEach((suggestion) => {
      // Connect each suggestion to at most 3 random items
      const relatedItems = items.slice(0, 3);
      relatedItems.forEach((item) => {
        edges.push({
          id: `edge-sugg-${suggestion.id}-item-${item.id}`,
          source: `suggestion-${suggestion.id}`,
          target: `item-${item.id}`,
          type: "related_to",
          weight: 0.3,
        });
      });
    });

    // Calculate metadata
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxEdges > 0 ? edgeCount / maxEdges : 0;

    return {
      nodes,
      edges,
      metadata: {
        nodeCount,
        edgeCount,
        density: Math.round(density * 1000) / 1000,
        clusters: categories.size,
      },
    };
  }

  analyzeGraph(graph: ThoughtGraph): GraphInsight[] {
    const insights: GraphInsight[] = [];

    // Find hub nodes (nodes with many connections)
    const connectionCounts: Record<string, number> = {};
    graph.edges.forEach((edge) => {
      connectionCounts[edge.source] = (connectionCounts[edge.source] || 0) + 1;
      connectionCounts[edge.target] = (connectionCounts[edge.target] || 0) + 1;
    });

    const hubs = Object.entries(connectionCounts)
      .filter(([_, count]) => count >= 5)
      .map(([nodeId]) => nodeId);

    if (hubs.length > 0) {
      insights.push({
        id: "insight-hubs",
        type: "hub",
        title: "Key connection points identified",
        description: `Found ${hubs.length} nodes that are central to your workflow.`,
        nodeIds: hubs,
        confidence: 0.85,
      });
    }

    // Find isolated nodes (no connections)
    const connectedNodes = new Set([
      ...graph.edges.map((e) => e.source),
      ...graph.edges.map((e) => e.target),
    ]);

    const isolatedNodes = graph.nodes
      .filter((n) => !connectedNodes.has(n.id))
      .map((n) => n.id);

    if (isolatedNodes.length > 0) {
      insights.push({
        id: "insight-isolated",
        type: "opportunity",
        title: "Disconnected items found",
        description: `${isolatedNodes.length} items could benefit from better organization or automation.`,
        nodeIds: isolatedNodes,
        confidence: 0.7,
      });
    }

    // Detect category patterns
    const categoryItems: Record<string, number> = {};
    graph.nodes
      .filter((n) => n.type === "item")
      .forEach((n) => {
        const category = n.data.category || "Uncategorized";
        categoryItems[category] = (categoryItems[category] || 0) + 1;
      });

    const dominantCategory = Object.entries(categoryItems)
      .sort((a, b) => b[1] - a[1])[0];

    if (dominantCategory && dominantCategory[1] >= 5) {
      insights.push({
        id: "insight-pattern",
        type: "pattern",
        title: `Strong focus on ${dominantCategory[0]}`,
        description: `${dominantCategory[1]} items in this category. Consider creating dedicated automations.`,
        nodeIds: graph.nodes
          .filter((n) => n.type === "item" && n.data.category === dominantCategory[0])
          .map((n) => n.id),
        confidence: 0.9,
      });
    }

    return insights;
  }
}

// Export singleton instance
export const graphEngine = new GraphEngine();


