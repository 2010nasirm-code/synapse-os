import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Cron job to clean up old analytics events (runs daily)
export async function GET(request: Request) {
  try {
    // Verify cron secret (Vercel sends this header)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // Delete analytics events older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error } = await supabase
      .from("analytics_events")
      .delete()
      .lt("created_at", thirtyDaysAgo.toISOString());

    if (error) {
      console.error("Cleanup error:", error);
      return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Old analytics events cleaned up",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

