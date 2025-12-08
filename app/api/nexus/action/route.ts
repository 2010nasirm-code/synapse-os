/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - APPLY ACTION API ROUTE
 * ============================================================================
 * 
 * POST /api/nexus/action
 * 
 * @version 3.0.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { handleApplyAction } from '@/nexus/assistant-v3/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.token) {
      return NextResponse.json(
        { success: false, error: 'Confirmation token is required' },
        { status: 400 }
      );
    }

    if (!body.userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    if (typeof body.confirm !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Confirm must be a boolean' },
        { status: 400 }
      );
    }

    const response = await handleApplyAction({
      token: body.token,
      userId: body.userId,
      confirm: body.confirm,
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('[API /nexus/action] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      },
      { status: 500 }
    );
  }
}

