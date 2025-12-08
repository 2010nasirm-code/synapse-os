/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - API ROUTE
 * ============================================================================
 * 
 * POST /api/nexus/assistant
 * 
 * @version 3.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleAssistantRequest } from '@/nexus/assistant-v3/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await handleAssistantRequest({
      query: body.query,
      userId: body.userId,
      sessionId: body.sessionId,
      persona: body.persona,
      uiContext: body.uiContext,
      options: body.options,
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API /nexus/assistant] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
        messages: [],
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    name: 'Nexus Assistant V3 API',
    version: '3.0.0',
    endpoints: {
      'POST /api/nexus/assistant': 'Main chat endpoint',
      'POST /api/nexus/agent': 'Run specific agent',
      'POST /api/nexus/action': 'Apply confirmed action',
    },
  });
}

