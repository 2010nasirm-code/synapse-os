/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - MAIN API
 * ============================================================================
 * 
 * POST /api/nexus/assistant — Main entry point.
 * 
 * @module nexus/assistant-v3/api/assistant
 * @version 3.0.0
 */

import { AIRequest, AIResponse, PERSONAS } from '../core/types';
import { SafetyChecker, ConsentManager, ContentFilter } from '../core/safety';
import { checkRateLimit, recordRequest, getRateLimiter } from '../core/rateLimit';
import { ProvenanceManager } from '../core/provenance';
import { ContextBuilder, buildSystemPrompt } from '../core/contextBuilder';
import { getCoordinator } from '../core/coordinator';
import { initializeAgents } from '../agents';
import { getMemoryStore } from '../memory';
import { estimateCost } from '../utils/costEstimator';

// ============================================================================
// INITIALIZATION
// ============================================================================

let initialized = false;

function initialize(): void {
  if (initialized) return;
  initializeAgents();
  initialized = true;
  console.log('[AssistantV3 API] Initialized');
}

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export interface AssistantRequest {
  query: string;
  userId?: string;
  sessionId?: string;
  persona?: string;
  uiContext?: Record<string, unknown>;
  options?: {
    stream?: boolean;
    maxTokens?: number;
    temperature?: number;
    includeProvenance?: boolean;
    enableWebSearch?: boolean;
  };
}

export async function handleAssistantRequest(
  request: AssistantRequest
): Promise<AIResponse> {
  const startTime = Date.now();
  
  // Initialize if needed
  initialize();

  const requestId = `asst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    // Validate required fields
    if (!request.query || typeof request.query !== 'string') {
      return createErrorResponse(requestId, 'Query is required', startTime);
    }

    // Sanitize query
    const sanitizedQuery = SafetyChecker.sanitize(request.query);
    if (!sanitizedQuery) {
      return createErrorResponse(requestId, 'Invalid query', startTime);
    }

    // Safety check
    const safetyCheck = SafetyChecker.validateRequest({
      query: sanitizedQuery,
      userId: request.userId,
    });

    if (!safetyCheck.valid) {
      return createErrorResponse(requestId, safetyCheck.reason || 'Request blocked', startTime);
    }

    // Handle crisis detection
    if (safetyCheck.crisisCheck?.detected) {
      return {
        id: requestId,
        success: true,
        messages: [{
          role: 'assistant',
          text: SafetyChecker.getCrisisResponse(),
          timestamp: Date.now(),
        }],
        metadata: {
          processingTime: Date.now() - startTime,
          agentsUsed: ['safety'],
          persona: 'friendly',
          skillLevel: 'beginner',
        },
      };
    }

    // Rate limit check
    const userId = request.userId || 'anonymous';
    const rateLimitStatus = checkRateLimit(userId);
    if (!rateLimitStatus.allowed) {
      return createErrorResponse(requestId, rateLimitStatus.reason || 'Rate limit exceeded', startTime);
    }
    recordRequest(userId);

    // Build AI request
    const aiRequest: AIRequest = {
      query: sanitizedQuery,
      userId,
      sessionId: request.sessionId,
      persona: validatePersona(request.persona),
      uiContext: request.uiContext,
      options: request.options,
    };

    // Execute through coordinator
    const coordinator = getCoordinator();
    const response = await coordinator.execute(aiRequest);

    // Sanitize response
    if (response.messages) {
      for (const message of response.messages) {
        message.text = ContentFilter.sanitizeResponse(message.text);
      }
    }

    // Estimate cost
    if (response.metadata) {
      response.metadata.estimatedCost = estimateCost({
        inputTokens: sanitizedQuery.length / 4,
        outputTokens: (response.messages?.[0]?.text?.length || 0) / 4,
      }).totalCost;
    }

    return response;

  } catch (error) {
    console.error('[AssistantV3 API] Error:', error);
    return createErrorResponse(
      requestId,
      error instanceof Error ? error.message : 'Internal error',
      startTime
    );
  }
}

// ============================================================================
// STREAMING HANDLER
// ============================================================================

export async function* handleStreamingRequest(
  request: AssistantRequest
): AsyncGenerator<string, void, unknown> {
  // Initialize if needed
  initialize();

  const requestId = `asst-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    // Validation
    if (!request.query) {
      yield JSON.stringify({ type: 'error', content: 'Query is required' });
      return;
    }

    // Safety check
    const safetyCheck = SafetyChecker.validateRequest({
      query: request.query,
      userId: request.userId,
    });

    if (!safetyCheck.valid) {
      yield JSON.stringify({ type: 'error', content: safetyCheck.reason });
      return;
    }

    // Handle crisis
    if (safetyCheck.crisisCheck?.detected) {
      yield JSON.stringify({ 
        type: 'text', 
        content: SafetyChecker.getCrisisResponse() 
      });
      yield JSON.stringify({ type: 'done' });
      return;
    }

    // Rate limit
    const userId = request.userId || 'anonymous';
    const rateLimitStatus = checkRateLimit(userId);
    if (!rateLimitStatus.allowed) {
      yield JSON.stringify({ type: 'error', content: rateLimitStatus.reason });
      return;
    }
    recordRequest(userId);

    // For now, get full response and stream it in chunks
    const response = await handleAssistantRequest(request);

    if (!response.success) {
      yield JSON.stringify({ type: 'error', content: response.error });
      return;
    }

    // Stream text in chunks
    const text = response.messages?.[0]?.text || '';
    const chunkSize = 20;
    
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      yield JSON.stringify({
        type: 'text',
        content: chunk,
        agent: response.messages?.[0]?.agent,
        timestamp: Date.now(),
      });
      
      // Small delay for natural feel
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Send actions if any
    if (response.actions && response.actions.length > 0) {
      for (const action of response.actions) {
        yield JSON.stringify({
          type: 'action',
          content: JSON.stringify(action),
          timestamp: Date.now(),
        });
      }
    }

    // Send provenance
    if (response.messages?.[0]?.provenance) {
      yield JSON.stringify({
        type: 'provenance',
        content: JSON.stringify(response.messages[0].provenance),
        timestamp: Date.now(),
      });
    }

    yield JSON.stringify({ type: 'done', timestamp: Date.now() });

  } catch (error) {
    yield JSON.stringify({ 
      type: 'error', 
      content: error instanceof Error ? error.message : 'Streaming error' 
    });
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function createErrorResponse(
  requestId: string,
  error: string,
  startTime: number
): AIResponse {
  return {
    id: requestId,
    success: false,
    error,
    messages: [],
    metadata: {
      processingTime: Date.now() - startTime,
      agentsUsed: [],
      persona: 'friendly',
      skillLevel: 'beginner',
    },
  };
}

function validatePersona(persona?: string): AIRequest['persona'] {
  const validPersonas = ['friendly', 'teacher', 'expert', 'concise'];
  if (persona && validPersonas.includes(persona)) {
    return persona as AIRequest['persona'];
  }
  return 'friendly';
}

// ============================================================================
// EXPORTS
// ============================================================================

export { initialize };
export default handleAssistantRequest;

