/**
 * Nexus Automation API Route
 */

import { NextRequest, NextResponse } from "next/server";
import type { Automation, AutomationTrigger, AutomationAction } from "@/nexus-core/core/types";
import { logger } from "@/nexus-core/lib/logger";

// In-memory automation store (would use DB in production)
const automationStore: Map<string, Automation[]> = new Map();

/**
 * GET /api/nexus/automation
 * List user automations
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    const automations = automationStore.get(userId) || [];

    return NextResponse.json({
      automations,
      count: automations.length,
    });
  } catch (error: any) {
    logger.error("api", `Get automations error: ${error.message}`);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/nexus/automation
 * Create a new automation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, name, description, trigger, conditions, actions } = body;

    if (!userId || !name || !trigger || !actions) {
      return NextResponse.json(
        { error: "Missing required fields: userId, name, trigger, actions" },
        { status: 400 }
      );
    }

    const automation: Automation = {
      id: `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      name,
      description,
      trigger,
      conditions: conditions || [],
      actions,
      enabled: true,
      runCount: 0,
      createdAt: new Date().toISOString(),
    };

    const userAutomations = automationStore.get(userId) || [];
    userAutomations.push(automation);
    automationStore.set(userId, userAutomations);

    logger.info("api", `Created automation: ${automation.id}`);

    return NextResponse.json({
      success: true,
      automation,
    });
  } catch (error: any) {
    logger.error("api", `Create automation error: ${error.message}`);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/nexus/automation
 * Delete an automation
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, automationId } = body;

    if (!userId || !automationId) {
      return NextResponse.json(
        { error: "Missing required fields: userId and automationId" },
        { status: 400 }
      );
    }

    const userAutomations = automationStore.get(userId) || [];
    const index = userAutomations.findIndex(a => a.id === automationId);
    
    if (index === -1) {
      return NextResponse.json(
        { error: "Automation not found" },
        { status: 404 }
      );
    }

    userAutomations.splice(index, 1);
    automationStore.set(userId, userAutomations);

    logger.info("api", `Deleted automation: ${automationId}`);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    logger.error("api", `Delete automation error: ${error.message}`);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/nexus/automation
 * Update automation (enable/disable)
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, automationId, enabled } = body;

    if (!userId || !automationId || enabled === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const userAutomations = automationStore.get(userId) || [];
    const automation = userAutomations.find(a => a.id === automationId);
    
    if (!automation) {
      return NextResponse.json(
        { error: "Automation not found" },
        { status: 404 }
      );
    }

    automation.enabled = enabled;

    return NextResponse.json({
      success: true,
      automation,
    });
  } catch (error: any) {
    logger.error("api", `Update automation error: ${error.message}`);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

