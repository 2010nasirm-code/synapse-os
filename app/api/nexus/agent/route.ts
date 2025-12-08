/**
 * Nexus Agent API Route
 */

import { NextRequest, NextResponse } from "next/server";
import { handleRunAgent, handleGetAgent } from "@/nexus-core/api/agent";
import { kernel } from "@/nexus-core/core/kernel";

export async function POST(req: NextRequest) {
  return handleRunAgent(req);
}

export async function GET(req: NextRequest) {
  // List all agents
  try {
    await kernel.initialize();
    const agents = kernel.getAgents();

    return NextResponse.json({
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        capabilities: a.capabilities,
        enabled: a.enabled,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

