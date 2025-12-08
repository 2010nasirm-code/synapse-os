/**
 * ============================================================================
 * NEXUS PRIME - Action API Route
 * ============================================================================
 * 
 * Apply or confirm actions.
 * POST /api/prime/action
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApplyActionRequest, handleBatchApplyRequest } from '@/nexus/prime/api';
import { initializeAgents } from '@/nexus/prime/agents';

// Initialize agents on first request
let initialized = false;

export async function POST(request: NextRequest) {
  try {
    if (!initialized) {
      initializeAgents();
      initialized = true;
    }

    const body = await request.json();

    // Require userId
    if (!body.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing userId',
        },
        { status: 400 }
      );
    }

    // Check if batch request
    if (body.actions && Array.isArray(body.actions)) {
      const response = await handleBatchApplyRequest({
        actions: body.actions,
        userId: body.userId,
        confirmAll: body.confirmAll,
      });
      return NextResponse.json(response);
    }

    // Single action or confirmation
    if (!body.action && !body.confirmationToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing action or confirmationToken',
        },
        { status: 400 }
      );
    }

    const response = await handleApplyActionRequest({
      action: body.action,
      confirmationToken: body.confirmationToken,
      userId: body.userId,
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API /prime/action] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        provenance: { agentId: 'api', operation: 'action', status: 'error', timestamp: Date.now() },
      },
      { status: 500 }
    );
  }
}

