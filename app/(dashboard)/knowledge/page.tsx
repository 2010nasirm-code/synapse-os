"use client";

import { useState, useEffect } from "react";
import { Network, Loader2 } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function KnowledgePage() {
  const [stats, setStats] = useState({ nodes: 0, edges: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function fetchGraph() {
      try {
        const response = await fetch("/api/graph");
        if (response.ok) {
          const data = await response.json();
          setStats({
            nodes: data.stats?.nodes || 0,
            edges: data.stats?.edges || 0,
          });
        }
      } catch (error) {
        console.error("Failed to fetch graph");
      }
      setLoading(false);
    }
    fetchGraph();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Knowledge Graph</h1>
        <p className="text-muted-foreground">Visualize connections between your items and automations.</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-6 rounded-xl border bg-card text-center">
              <div className="text-3xl font-bold text-primary mb-1">{stats.nodes}</div>
              <div className="text-sm text-muted-foreground">Nodes</div>
            </div>
            <div className="p-6 rounded-xl border bg-card text-center">
              <div className="text-3xl font-bold text-primary mb-1">{stats.edges}</div>
              <div className="text-sm text-muted-foreground">Connections</div>
            </div>
          </div>

          {/* Placeholder Graph */}
          <div className="p-12 rounded-xl border-2 border-dashed text-center">
            <Network className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Graph Visualization</h3>
            <p className="text-muted-foreground">
              Add more items and automations to see connections in your knowledge graph.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

