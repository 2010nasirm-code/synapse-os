/**
 * Nexus API Route
 * Main API endpoint for Nexus queries
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { 
  handleNexusQuery, 
  handleGetMemory, 
  handleAddMemory,
  handleGetLogs,
  handleGetAgents,
} from "@/nexus-core/api/nexus";

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const body = await req.json().catch(() => ({}));
    const { query, options } = body;

    if (!query) {
      return NextResponse.json({ error: "Missing required field: query" }, { status: 400 });
    }

    // Add userId from authenticated session
    const requestBody = {
      userId: user.id,
      query,
      options,
    };

    // Create a new request with the updated body
    const modifiedReq = new NextRequest(req.url, {
      method: "POST",
      headers: req.headers,
      body: JSON.stringify(requestBody),
    });

    return handleNexusQuery(modifiedReq);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const action = req.nextUrl.searchParams.get("action");
    
    // Add userId to query params for memory endpoint
    if (action === "memory") {
      const modifiedReq = new NextRequest(req.url + `&userId=${user.id}`, {
        method: "GET",
        headers: req.headers,
      });
      return handleGetMemory(modifiedReq);
    }
    
    switch (action) {
      case "logs":
        return handleGetLogs(req);
      case "agents":
        return handleGetAgents(req);
      default:
        return NextResponse.json({
          message: "Nexus API",
          version: "1.0.0",
          endpoints: {
            "POST /api/nexus": "Process a query",
            "GET /api/nexus?action=memory": "Get memory summary",
            "GET /api/nexus?action=logs": "Get operation logs",
            "GET /api/nexus?action=agents": "List available agents",
          },
        });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

