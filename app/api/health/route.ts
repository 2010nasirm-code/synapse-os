import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Health check endpoint for monitoring
export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0",
    checks: {
      api: true,
      database: false,
    },
  };

  try {
    // Check Supabase connection
    const supabase = await createClient();
    const { error } = await supabase.from("items").select("id").limit(1);
    health.checks.database = !error;
  } catch {
    health.checks.database = false;
  }

  // Overall status
  health.status = Object.values(health.checks).every(Boolean) ? "healthy" : "degraded";

  return NextResponse.json(health, {
    status: health.status === "healthy" ? 200 : 503,
  });
}

