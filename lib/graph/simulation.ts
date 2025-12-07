/**
 * Graph Layout Simulation
 * Force-directed layout algorithm for graph visualization
 */

import type { GraphNode, GraphEdge, ThoughtGraph } from "./engine";

interface LayoutNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface LayoutConfig {
  width: number;
  height: number;
  iterations: number;
  repulsion: number;
  attraction: number;
  damping: number;
}

const defaultConfig: LayoutConfig = {
  width: 800,
  height: 600,
  iterations: 100,
  repulsion: 1000,
  attraction: 0.01,
  damping: 0.9,
};

// Simple LRU cache for graph layouts
const layoutCache = new Map<string, { nodes: LayoutNode[]; timestamp: number }>();
const CACHE_MAX_SIZE = 10;
const CACHE_TTL = 60000; // 1 minute

function getCacheKey(graph: ThoughtGraph): string {
  return `${graph.metadata.nodeCount}-${graph.metadata.edgeCount}`;
}

function cleanCache() {
  if (layoutCache.size > CACHE_MAX_SIZE) {
    const entries = Array.from(layoutCache.entries());
    const oldest = entries.sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) {
      layoutCache.delete(oldest[0]);
    }
  }
}

export function layoutGraph(
  graph: ThoughtGraph,
  config: Partial<LayoutConfig> = {}
): ThoughtGraph {
  const cfg = { ...defaultConfig, ...config };
  
  // Check cache
  const cacheKey = getCacheKey(graph);
  const cached = layoutCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Merge cached positions with current nodes
    const nodePositions = new Map(cached.nodes.map(n => [n.id, { x: n.x, y: n.y }]));
    return {
      ...graph,
      nodes: graph.nodes.map(node => ({
        ...node,
        x: nodePositions.get(node.id)?.x ?? Math.random() * cfg.width,
        y: nodePositions.get(node.id)?.y ?? Math.random() * cfg.height,
      })),
    };
  }

  // Initialize nodes with random positions
  const nodes: LayoutNode[] = graph.nodes.map((node) => ({
    ...node,
    x: Math.random() * cfg.width,
    y: Math.random() * cfg.height,
    vx: 0,
    vy: 0,
  }));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Adaptive iterations based on graph size
  const iterations = Math.min(cfg.iterations, Math.max(50, 200 - graph.nodes.length));

  // Run simulation
  for (let i = 0; i < iterations; i++) {
    // Apply repulsion between all nodes
    for (let j = 0; j < nodes.length; j++) {
      for (let k = j + 1; k < nodes.length; k++) {
        const nodeA = nodes[j];
        const nodeB = nodes[k];

        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        const force = cfg.repulsion / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        nodeA.vx -= fx;
        nodeA.vy -= fy;
        nodeB.vx += fx;
        nodeB.vy += fy;
      }
    }

    // Apply attraction along edges
    for (const edge of graph.edges) {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);

      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      const force = dist * cfg.attraction * edge.weight;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      source.vx += fx;
      source.vy += fy;
      target.vx -= fx;
      target.vy -= fy;
    }

    // Update positions and apply damping
    for (const node of nodes) {
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= cfg.damping;
      node.vy *= cfg.damping;

      // Keep within bounds with padding
      const padding = 50;
      node.x = Math.max(padding, Math.min(cfg.width - padding, node.x));
      node.y = Math.max(padding, Math.min(cfg.height - padding, node.y));
    }
  }

  // Cache the result
  cleanCache();
  layoutCache.set(cacheKey, {
    nodes: nodes.map(n => ({ ...n })),
    timestamp: Date.now(),
  });

  return {
    ...graph,
    nodes: nodes.map(({ vx, vy, ...node }) => node),
  };
}

export function getNodeColor(type: GraphNode["type"]): string {
  switch (type) {
    case "item":
      return "#3b82f6"; // blue
    case "automation":
      return "#8b5cf6"; // purple
    case "suggestion":
      return "#f59e0b"; // amber
    case "category":
      return "#10b981"; // green
    case "event":
      return "#ef4444"; // red
    default:
      return "#6b7280"; // gray
  }
}

export function getNodeSize(type: GraphNode["type"]): number {
  switch (type) {
    case "category":
      return 16;
    case "automation":
      return 12;
    case "item":
      return 10;
    case "suggestion":
      return 8;
    case "event":
      return 8;
    default:
      return 8;
  }
}

export function getEdgeStyle(type: GraphEdge["type"]): {
  color: string;
  dashed: boolean;
  width: number;
} {
  switch (type) {
    case "triggers":
      return { color: "#8b5cf6", dashed: false, width: 2 };
    case "influences":
      return { color: "#3b82f6", dashed: true, width: 1 };
    case "depends_on":
      return { color: "#ef4444", dashed: false, width: 2 };
    case "related_to":
      return { color: "#6b7280", dashed: true, width: 1 };
    case "generates":
      return { color: "#10b981", dashed: false, width: 2 };
    case "belongs_to":
      return { color: "#f59e0b", dashed: true, width: 1 };
    default:
      return { color: "#6b7280", dashed: true, width: 1 };
  }
}

