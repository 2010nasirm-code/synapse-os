/**
 * Agent API Handler
 * Run specific agents with parameters
 */

import { NextRequest, NextResponse } from "next/server";
import { kernel } from "../core/kernel";
import type { AgentInput } from "../core/types";
import { logger } from "../lib/logger";

/**
 * POST /api/agent/run
 * Run a specific agent with parameters
 */
export async function handleRunAgent(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    const { agentId, input } = body as { agentId: string; input: AgentInput };

    if (!agentId || !input) {
      return NextResponse.json(
        { error: "Missing required fields: agentId and input" },
        { status: 400 }
      );
    }

    // Initialize kernel if needed
    await kernel.initialize();

    // Get the agent
    const agent = kernel.getAgent(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: `Agent not found: ${agentId}` },
        { status: 404 }
      );
    }

    if (!agent.enabled) {
      return NextResponse.json(
        { error: `Agent is disabled: ${agentId}` },
        { status: 400 }
      );
    }

    logger.info("api", `Running agent: ${agentId}`);

    // Execute the agent
    const startTime = Date.now();
    const output = await agent.process(input);
    const duration = Date.now() - startTime;

    logger.info("api", `Agent ${agentId} completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      agentId,
      output,
      duration,
    });
  } catch (error: any) {
    logger.error("api", `Run agent error: ${error.message}`);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent/:id
 * Get agent details
 */
export async function handleGetAgent(
  req: NextRequest,
  agentId: string
): Promise<NextResponse> {
  try {
    await kernel.initialize();

    const agent = kernel.getAgent(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: `Agent not found: ${agentId}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      capabilities: agent.capabilities,
      priority: agent.priority,
      enabled: agent.enabled,
    });
  } catch (error: any) {
    logger.error("api", `Get agent error: ${error.message}`);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent/:id/enable
 * Enable an agent
 */
export async function handleEnableAgent(
  req: NextRequest,
  agentId: string
): Promise<NextResponse> {
  try {
    await kernel.initialize();

    const agent = kernel.getAgent(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: `Agent not found: ${agentId}` },
        { status: 404 }
      );
    }

    // Note: This modifies the in-memory agent state
    // For persistent changes, update the config
    (agent as any).enabled = true;

    return NextResponse.json({
      success: true,
      agentId,
      enabled: true,
    });
  } catch (error: any) {
    logger.error("api", `Enable agent error: ${error.message}`);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent/:id/disable
 * Disable an agent
 */
export async function handleDisableAgent(
  req: NextRequest,
  agentId: string
): Promise<NextResponse> {
  try {
    await kernel.initialize();

    const agent = kernel.getAgent(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: `Agent not found: ${agentId}` },
        { status: 404 }
      );
    }

    (agent as any).enabled = false;

    return NextResponse.json({
      success: true,
      agentId,
      enabled: false,
    });
  } catch (error: any) {
    logger.error("api", `Disable agent error: ${error.message}`);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

