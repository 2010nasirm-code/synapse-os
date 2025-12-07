import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/debug/logger";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { type, message, rating, email, page_url, screenshot, session_logs } = body;

    // Validate required fields
    if (!type || (!message && type !== "rating")) {
      return NextResponse.json(
        { error: "Type and message are required" },
        { status: 400 }
      );
    }

    // Store feedback
    const { data, error } = await supabase
      .from("analytics_events")
      .insert({
        user_id: user?.id || "anonymous",
        event_type: "beta_feedback",
        event_data: {
          type,
          message,
          rating,
          email,
          page_url,
          screenshot,
          session_logs_length: session_logs?.length || 0,
          user_agent: request.headers.get("user-agent"),
          timestamp: new Date().toISOString(),
        },
      } as any)
      .select()
      .single();

    if (error) {
      console.error("Failed to store feedback:", error);
      return NextResponse.json(
        { error: "Failed to store feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      message: "Feedback submitted successfully",
    });
  } catch (error: any) {
    console.error("Feedback API error:", error);
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

    // Check if user is admin (you can customize this check)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get all feedback
    const { data: feedback, error } = await supabase
      .from("analytics_events")
      .select("*")
      .eq("event_type", "beta_feedback")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
    }

    return NextResponse.json({ feedback });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

