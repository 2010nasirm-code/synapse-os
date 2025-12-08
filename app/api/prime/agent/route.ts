/**
 * ============================================================================
 * NEXUS PRIME - Agent API Route
 * ============================================================================
 * 
 * Run a specific agent directly.
 * POST /api/prime/agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleRunAgentRequest, handleBatchAgentRequest } from '@/nexus/prime/api';
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

    // Check if batch request
    if (body.agents && Array.isArray(body.agents)) {
      const response = await handleBatchAgentRequest({
        agents: body.agents,
        userId: body.userId || 'anonymous',
        context: body.context,
        parallel: body.parallel,
      });
      return NextResponse.json(response);
    }

    // Single agent request
    if (!body.agentId || !body.prompt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing agentId or prompt',
        },
        { status: 400 }
      );
    }

    const response = await handleRunAgentRequest({
      agentId: body.agentId,
      prompt: body.prompt,
      userId: body.userId || 'anonymous',
      context: body.context,
      options: body.options,
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API /prime/agent] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        processingTime: 0,
      },
      { status: 500 }
    );
  }
}

