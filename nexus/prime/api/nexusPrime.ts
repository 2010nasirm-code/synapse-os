/**
 * ============================================================================
 * NEXUS PRIME - MAIN API
 * ============================================================================
 * 
 * Main entrypoint for NEXUS PRIME:
 * - POST only
 * - Validates request
 * - Builds context
 * - Calls OrchestratorAgent
 * - Returns structured result
 * 
 * @module nexus/prime/api/nexusPrime
 * @version 1.0.0
 */

import { AIRequest, AIResponse, SystemContext } from '../core/types';
import { Validator } from '../core/validator';
import { buildContext } from '../core/context';
import { isRequestAllowed, recordRequest } from '../core/rateLimit';
import { routeRequest } from '../core/router';
import { initializeAgents } from '../agents';
import { MemoryStore } from '../memory';

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export interface NexusPrimeRequest {
  prompt: string;
  userId?: string;
  targetAgent?: string;
  context?: Partial<SystemContext>;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  options?: {
    maxTokens?: number;
    temperature?: number;
    includeProvenance?: boolean;
  };
}

export interface NexusPrimeResponse extends AIResponse {
  success: boolean;
  error?: string;
}

// Memory store cache
const memoryStores = new Map<string, MemoryStore>();

function getMemoryStore(userId: string): MemoryStore {
  if (!memoryStores.has(userId)) {
    memoryStores.set(userId, new MemoryStore(userId));
  }
  return memoryStores.get(userId)!;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function handleNexusPrimeRequest(
  request: NexusPrimeRequest
): Promise<NexusPrimeResponse> {
  const startTime = Date.now();

  try {
    // Initialize agents (idempotent)
    initializeAgents();

    // Validate request
    const validation = Validator.validateAIRequest({
      id: `req-${Date.now()}`,
      prompt: request.prompt,
      conversationHistory: request.conversationHistory,
      targetAgent: request.targetAgent as any,
      context: request.context,
    });

    if (!validation.valid) {
      return {
        success: false,
        error: `Invalid request: ${validation.errors.map(e => e.message).join(', ')}`,
        requestId: '',
        answer: '',
        insights: [],
        actionDrafts: [],
        agentsUsed: [],
        provenance: [],
        confidence: 0,
        processingTime: Date.now() - startTime,
      };
    }

    // Check rate limit
    const userId = request.userId || 'anonymous';
    const rateLimitCheck = isRequestAllowed(userId);
    
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: `Rate limit exceeded: ${rateLimitCheck.reason}. Retry after ${rateLimitCheck.retryAfter}ms`,
        requestId: '',
        answer: '',
        insights: [],
        actionDrafts: [],
        agentsUsed: [],
        provenance: [],
        confidence: 0,
        processingTime: Date.now() - startTime,
      };
    }

    // Record request
    recordRequest(userId);

    // Get user memory
    const memoryStore = getMemoryStore(userId);
    const memories = await memoryStore.getAll();

    // Build AIRequest
    const aiRequest: AIRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      prompt: request.prompt,
      conversationHistory: request.conversationHistory,
      targetAgent: request.targetAgent as any,
      context: request.context,
      metadata: {
        userId,
        source: 'api',
        timestamp: Date.now(),
      },
    };

    // Build context
    const context = await buildContext(aiRequest, {
      memories,
      userId,
    });

    // Route request
    const response = await routeRequest(aiRequest);

    return {
      ...response,
      success: true,
    };

  } catch (error) {
    console.error('[NEXUS PRIME API] Error:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      requestId: '',
      answer: '',
      insights: [],
      actionDrafts: [],
      agentsUsed: [],
      provenance: [],
      confidence: 0,
      processingTime: Date.now() - startTime,
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default handleNexusPrimeRequest;

