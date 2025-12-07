import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { logs, sessionId, metadata } = body;

    if (!logs || !Array.isArray(logs)) {
      return NextResponse.json(
        { error: "Logs array is required" },
        { status: 400 }
      );
    }

    // Store logs batch
    const { error } = await supabase
      .from("analytics_events")
      .insert({
        user_id: user?.id || "anonymous",
        event_type: "debug_logs",
        event_data: {
          sessionId,
          logsCount: logs.length,
          logs: logs.slice(-100), // Keep last 100 logs
          metadata,
          user_agent: request.headers.get("user-agent"),
          timestamp: new Date().toISOString(),
        },
      } as any);

    if (error) {
      console.error("Failed to store logs:", error);
      return NextResponse.json(
        { error: "Failed to store logs" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      stored: logs.length,
    });
  } catch (error: any) {
    console.error("Logs API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get recent debug logs
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const sessionId = url.searchParams.get("sessionId");

    let query = supabase
      .from("analytics_events")
      .select("*")
      .eq("event_type", "debug_logs")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (sessionId) {
      query = query.eq("event_data->>sessionId", sessionId);
    }

    const { data: logs, error } = await query;

    if (error) {
      return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

