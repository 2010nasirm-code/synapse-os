/**
 * ============================================================================
 * NEXUS PRIME - API Route
 * ============================================================================
 * 
 * Main API endpoint for NEXUS PRIME system.
 * POST /api/prime
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleNexusPrimeRequest } from '@/nexus/prime/api';
import { initializeAgents } from '@/nexus/prime/agents';

// Initialize agents on first request
let initialized = false;

export async function POST(request: NextRequest) {
  try {
    // Initialize agents (idempotent)
    if (!initialized) {
      initializeAgents();
      initialized = true;
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.prompt || typeof body.prompt !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid prompt',
        },
        { status: 400 }
      );
    }

    // Get user ID from body or default
    const userId = body.userId || 'anonymous';

    // Handle the request
    const response = await handleNexusPrimeRequest({
      prompt: body.prompt,
      userId,
      targetAgent: body.targetAgent,
      context: body.context,
      conversationHistory: body.conversationHistory,
      options: body.options,
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API /prime] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        requestId: '',
        answer: '',
        insights: [],
        actionDrafts: [],
        agentsUsed: [],
        provenance: [],
        confidence: 0,
        processingTime: 0,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'NEXUS PRIME API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      'POST /api/prime': 'Main NEXUS PRIME endpoint',
      'POST /api/prime/agent': 'Run specific agent',
      'POST /api/prime/action': 'Apply action',
    },
  });
}
