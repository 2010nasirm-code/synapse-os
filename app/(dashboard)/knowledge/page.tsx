"use client";

import { useState, useEffect, useRef } from "react";
import { Network, Loader2, ZoomIn, ZoomOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";

interface Node {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
}

interface Edge {
  source: string;
  target: string;
  type: string;
}

export default function KnowledgePage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchGraph();
  }, []);

  async function fetchGraph() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [items, automations, suggestions] = await Promise.all([
      supabase.from("items").select("*").eq("user_id", user.id),
      supabase.from("automations").select("*").eq("user_id", user.id),
      supabase.from("suggestions").select("*").eq("user_id", user.id),
    ]);

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const categories = new Set<string>();

    // Create nodes for items
    (items.data || []).forEach((item, i) => {
      const angle = (i / (items.data?.length || 1)) * Math.PI * 2;
      const radius = 150;
      newNodes.push({
        id: `item-${item.id}`,
        type: "item",
        label: item.name,
        x: 300 + Math.cos(angle) * radius,
        y: 250 + Math.sin(angle) * radius,
      });
      if (item.category) categories.add(item.category);
    });

    // Create nodes for categories
    Array.from(categories).forEach((cat, i) => {
      const angle = (i / categories.size) * Math.PI * 2;
      newNodes.push({
        id: `cat-${cat}`,
        type: "category",
        label: cat,
        x: 300 + Math.cos(angle) * 250,
        y: 250 + Math.sin(angle) * 250,
      });
    });

    // Create nodes for automations
    (automations.data || []).forEach((auto, i) => {
      newNodes.push({
        id: `auto-${auto.id}`,
        type: "automation",
        label: auto.name,
        x: 100 + i * 80,
        y: 50,
      });
    });

    // Create edges
    (items.data || []).forEach((item) => {
      if (item.category) {
        newEdges.push({
          source: `item-${item.id}`,
          target: `cat-${item.category}`,
          type: "belongs_to",
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
    setLoading(false);
  }

  const getNodeColor = (type: string) => {
    switch (type) {
      case "item": return "#3b82f6";
      case "category": return "#10b981";
      case "automation": return "#8b5cf6";
      case "suggestion": return "#f59e0b";
      default: return "#6b7280";
    }
  };

  const getNodeSize = (type: string) => {
    switch (type) {
      case "category": return 20;
      case "automation": return 16;
      default: return 12;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Knowledge Graph</h1>
          <p className="text-muted-foreground">Visualize connections between your items.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(2, z + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={fetchGraph} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Items</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Categories</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span>Automations</span>
        </div>
      </div>

      {/* Graph */}
      <div className="rounded-xl border bg-card overflow-hidden" style={{ height: "500px" }}>
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : nodes.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <Network className="h-16 w-16 mb-4" />
            <p>Add items to see your knowledge graph</p>
          </div>
        ) : (
          <svg 
            width="100%" 
            height="100%" 
            viewBox="0 0 600 500"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          >
            {/* Edges */}
            {edges.map((edge, i) => {
              const source = nodes.find(n => n.id === edge.source);
              const target = nodes.find(n => n.id === edge.target);
              if (!source || !target) return null;
              return (
                <line
                  key={i}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke="#374151"
                  strokeWidth="1"
                  strokeDasharray="4"
                  opacity="0.5"
                />
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => (
              <g 
                key={node.id} 
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedNode(node)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  r={getNodeSize(node.type)}
                  fill={getNodeColor(node.type)}
                  opacity={selectedNode?.id === node.id ? 1 : 0.8}
                  stroke={selectedNode?.id === node.id ? "#fff" : "none"}
                  strokeWidth="2"
                />
                <text
                  y={getNodeSize(node.type) + 12}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#9ca3af"
                >
                  {node.label.length > 15 ? node.label.slice(0, 15) + "..." : node.label}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* Selected Node Info */}
      {selectedNode && (
        <div className="mt-4 p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-3">
            <div 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: getNodeColor(selectedNode.type) }}
            />
            <div>
              <p className="font-semibold">{selectedNode.label}</p>
              <p className="text-sm text-muted-foreground capitalize">{selectedNode.type}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border bg-card text-center">
          <div className="text-2xl font-bold text-primary">{nodes.filter(n => n.type === "item").length}</div>
          <div className="text-sm text-muted-foreground">Items</div>
        </div>
        <div className="p-4 rounded-xl border bg-card text-center">
          <div className="text-2xl font-bold text-primary">{nodes.filter(n => n.type === "category").length}</div>
          <div className="text-sm text-muted-foreground">Categories</div>
        </div>
        <div className="p-4 rounded-xl border bg-card text-center">
          <div className="text-2xl font-bold text-primary">{edges.length}</div>
          <div className="text-sm text-muted-foreground">Connections</div>
        </div>
      </div>
    </div>
  );
}
