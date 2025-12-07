import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { graphEngine } from "@/lib/graph/engine";
import { layoutGraph } from "@/lib/graph/simulation";

// GET: Fetch full graph analysis
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all data
    const [itemsResult, automationsResult, suggestionsResult] = await Promise.all([
      supabase.from("items").select("*").eq("user_id", user.id),
      supabase.from("automations").select("*").eq("user_id", user.id),
      supabase.from("suggestions").select("*").eq("user_id", user.id),
    ]);

    if (itemsResult.error) {
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    // Build the graph
    const graph = graphEngine.buildGraph(
      itemsResult.data || [],
      automationsResult.data || [],
      suggestionsResult.data || []
    );

    // Apply layout
    const layoutedGraph = layoutGraph(graph);

    // Analyze the graph for insights
    const insights = graphEngine.analyzeGraph(graph);

    return NextResponse.json({
      graph: layoutedGraph,
      insights,
      stats: {
        nodes: graph.metadata.nodeCount,
        edges: graph.metadata.edgeCount,
        density: graph.metadata.density,
        clusters: graph.metadata.clusters,
      },
    });
  } catch (error) {
    console.error("Graph API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Track graph interaction
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { action, nodeId } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Track graph interaction
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type: "graph_interaction",
      event_data: { action, nodeId },
    } as any);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Graph POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
