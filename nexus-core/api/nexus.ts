/**
 * Nexus API Handler
 * Main entry point for all Nexus queries
 */

import { NextRequest, NextResponse } from "next/server";
import { kernel, memorySystem, processQuery } from "../core";
import type { NexusRequest, NexusResponse, MemoryItem } from "../core/types";
import { logger } from "../lib/logger";

/**
 * POST /api/nexus
 * Universal query endpoint
 */
export async function handleNexusQuery(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { userId, query, options } = body as NexusRequest;

    if (!userId || !query) {
      return NextResponse.json(
        { error: "Missing required fields: userId and query" },
        { status: 400 }
      );
    }

    logger.info("api", `Processing query for user ${userId}`);

    // Process through Nexus kernel
    const response = await processQuery({
      userId,
      query,
      options: {
        ...options,
        memoryScope: options?.memoryScope || "persistent",
      },
    });

    return NextResponse.json(response);
  } catch (error: any) {
    logger.error("api", `Nexus query error: ${error.message}`);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nexus/memory
 * Get user memory summary
 */
export async function handleGetMemory(req: NextRequest): Promise<NextResponse> {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    const summary = await memorySystem.getSummary(userId);
    const recentMemories = await memorySystem.query({
      userId,
      limit: 10,
    });

    return NextResponse.json({
      summary,
      recent: recentMemories,
    });
  } catch (error: any) {
    logger.error("api", `Get memory error: ${error.message}`);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/nexus/memory
 * Add memory item
 */
export async function handleAddMemory(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { userId, content, type = "fact", metadata = {} } = body;

    if (!userId || !content) {
      return NextResponse.json(
        { error: "Missing required fields: userId and content" },
        { status: 400 }
      );
    }

    const memory = await memorySystem.add(userId, content, type, metadata);

    return NextResponse.json({
      success: true,
      memory,
    });
  } catch (error: any) {
    logger.error("api", `Add memory error: ${error.message}`);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/nexus/memory
 * Delete memory item
 */
export async function handleDeleteMemory(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { userId, memoryId } = body;

    if (!userId || !memoryId) {
      return NextResponse.json(
        { error: "Missing required fields: userId and memoryId" },
        { status: 400 }
      );
    }

    const deleted = await memorySystem.delete(userId, memoryId);

    return NextResponse.json({
      success: deleted,
    });
  } catch (error: any) {
    logger.error("api", `Delete memory error: ${error.message}`);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nexus/logs
 * Get operation logs (admin/debug)
 */
export async function handleGetLogs(req: NextRequest): Promise<NextResponse> {
  try {
    const level = req.nextUrl.searchParams.get("level") as any;
    const category = req.nextUrl.searchParams.get("category") || undefined;
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "100");

    const logs = logger.getLogs({ level, category, limit });

    return NextResponse.json({ logs });
  } catch (error: any) {
    logger.error("api", `Get logs error: ${error.message}`);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/nexus/agents
 * List available agents
 */
export async function handleGetAgents(req: NextRequest): Promise<NextResponse> {
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
    logger.error("api", `Get agents error: ${error.message}`);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

