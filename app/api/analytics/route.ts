import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { analyticsEngine } from "@/lib/analytics/engine";

// GET: Fetch analytics dashboard data
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all data
    const [itemsResult, suggestionsResult, automationsResult] = await Promise.all([
      supabase.from("items").select("*").eq("user_id", user.id),
      supabase.from("suggestions").select("*").eq("user_id", user.id),
      supabase.from("automations").select("*").eq("user_id", user.id),
    ]);

    if (itemsResult.error) {
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    // Generate dashboard
    const dashboard = await analyticsEngine.generateDashboard(
      itemsResult.data || [],
      automationsResult.data || [],
      suggestionsResult.data || []
    );

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Track custom analytics event
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { event_type, event_data } = body;

    const { error } = await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type,
      event_data: event_data || {},
    } as any);

    if (error) {
      return NextResponse.json({ error: "Failed to track event" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics tracking error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
