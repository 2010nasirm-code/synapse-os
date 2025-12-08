/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - CONTEXT BUILDER
 * ============================================================================
 * 
 * Builds runtime context for agent execution.
 * 
 * @module nexus/assistant-v3/core/contextBuilder
 * @version 3.0.0
 */

import {
  AIRequest,
  SkillLevel,
  SkillAssessment,
  PersonaType,
  PERSONAS,
  MemoryItem,
} from './types';
import { ConsentManager } from './safety';

// ============================================================================
// CONTEXT TYPES
// ============================================================================

export interface RuntimeContext {
  /** Request information */
  request: AIRequest;
  /** User ID */
  userId: string;
  /** Session ID */
  sessionId: string;
  /** Detected skill level */
  skillAssessment: SkillAssessment;
  /** Active persona */
  persona: PersonaType;
  /** Relevant memories */
  memories: MemoryItem[];
  /** Consent status */
  consent: {
    memory: boolean;
    personalization: boolean;
  };
  /** Current timestamp */
  timestamp: number;
  /** Additional context data */
  data: Record<string, unknown>;
}

// ============================================================================
// SESSION TRACKING
// ============================================================================

interface SessionData {
  userId: string;
  queryHistory: string[];
  commandTypes: string[];
  errorCount: number;
  lastActive: number;
}

const sessionStore = new Map<string, SessionData>();

// ============================================================================
// SKILL DETECTION
// ============================================================================

export function detectSkillLevel(session: SessionData, query: string): SkillAssessment {
  const indicators: string[] = [];
  let level: SkillLevel = 'beginner';
  let confidence = 0.5;

  // Check query complexity
  const queryLower = query.toLowerCase();
  
  // Technical terms suggest higher skill
  const technicalTerms = [
    'api', 'database', 'automation', 'webhook', 'integration',
    'schema', 'query', 'pipeline', 'config', 'endpoint',
  ];
  const techCount = technicalTerms.filter(t => queryLower.includes(t)).length;
  
  if (techCount >= 3) {
    level = 'expert';
    confidence += 0.2;
    indicators.push('Uses technical terminology');
  } else if (techCount >= 1) {
    level = 'advanced';
    confidence += 0.1;
    indicators.push('Familiar with technical concepts');
  }

  // Check session history
  if (session.queryHistory.length > 20) {
    indicators.push('Extended session history');
    confidence += 0.1;
    if (level === 'beginner') level = 'intermediate';
  }

  // Check command diversity
  const uniqueCommands = new Set(session.commandTypes);
  if (uniqueCommands.size > 5) {
    indicators.push('Uses diverse commands');
    confidence += 0.1;
    if (level === 'beginner') level = 'intermediate';
  }

  // Error rate suggests struggle
  if (session.errorCount > 5 && session.queryHistory.length < 10) {
    indicators.push('Higher error rate');
    level = 'beginner';
    confidence = Math.max(0.3, confidence - 0.2);
  }

  // Simple language patterns
  const simplePatterns = [
    /^(what is|how do i|can you|help me)/i,
    /^(please|could you)/i,
  ];
  
  if (simplePatterns.some(p => p.test(query)) && techCount === 0) {
    if (level !== 'expert') {
      level = level === 'advanced' ? 'intermediate' : level;
    }
    indicators.push('Uses simple language patterns');
  }

  return {
    level,
    confidence: Math.min(1, confidence),
    indicators,
  };
}

// ============================================================================
// COMMAND TYPE DETECTION
// ============================================================================

function detectCommandType(query: string): string {
  const lower = query.toLowerCase();

  if (/\b(create|add|new|make)\b/.test(lower)) return 'create';
  if (/\b(delete|remove|clear)\b/.test(lower)) return 'delete';
  if (/\b(update|edit|change|modify)\b/.test(lower)) return 'update';
  if (/\b(show|list|display|view)\b/.test(lower)) return 'read';
  if (/\b(analyze|insight|pattern|trend)\b/.test(lower)) return 'analyze';
  if (/\b(automate|trigger|when|if)\b/.test(lower)) return 'automate';
  if (/\b(help|how|what|why)\b/.test(lower)) return 'help';
  if (/\b(search|find|look up)\b/.test(lower)) return 'search';
  
  return 'general';
}

// ============================================================================
// CONTEXT BUILDER
// ============================================================================

export class ContextBuilder {
  /**
   * Build runtime context for a request
   */
  static async build(
    request: AIRequest,
    options?: {
      memories?: MemoryItem[];
    }
  ): Promise<RuntimeContext> {
    const userId = request.userId || 'anonymous';
    const sessionId = request.sessionId || `session-${Date.now()}`;

    // Get or create session
    let session = sessionStore.get(sessionId);
    if (!session) {
      session = {
        userId,
        queryHistory: [],
        commandTypes: [],
        errorCount: 0,
        lastActive: Date.now(),
      };
      sessionStore.set(sessionId, session);
    }

    // Update session
    session.queryHistory.push(request.query);
    session.commandTypes.push(detectCommandType(request.query));
    session.lastActive = Date.now();

    // Keep session history bounded
    if (session.queryHistory.length > 50) {
      session.queryHistory = session.queryHistory.slice(-50);
      session.commandTypes = session.commandTypes.slice(-50);
    }

    // Detect skill level
    const skillAssessment = request.options?.skillLevel
      ? { level: request.options.skillLevel, confidence: 1, indicators: ['User specified'] }
      : detectSkillLevel(session, request.query);

    // Determine persona
    let persona = request.persona || 'friendly';
    
    // Auto-select persona based on skill level if not specified
    if (!request.persona) {
      if (skillAssessment.level === 'expert') {
        persona = 'expert';
      } else if (skillAssessment.level === 'beginner') {
        persona = 'friendly';
      }
    }

    // Get consent status
    const consent = {
      memory: ConsentManager.canStoreMemory(userId),
      personalization: ConsentManager.canPersonalize(userId),
    };

    return {
      request,
      userId,
      sessionId,
      skillAssessment,
      persona,
      memories: options?.memories || [],
      consent,
      timestamp: Date.now(),
      data: {},
    };
  }

  /**
   * Record an error in the session
   */
  static recordError(sessionId: string): void {
    const session = sessionStore.get(sessionId);
    if (session) {
      session.errorCount++;
    }
  }

  /**
   * Get session data
   */
  static getSession(sessionId: string): SessionData | undefined {
    return sessionStore.get(sessionId);
  }

  /**
   * Clear session
   */
  static clearSession(sessionId: string): void {
    sessionStore.delete(sessionId);
  }

  /**
   * Cleanup old sessions
   */
  static cleanup(maxAgeMs: number = 30 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    let cleared = 0;

    const entries = Array.from(sessionStore.entries());
    for (const [id, session] of entries) {
      if (session.lastActive < cutoff) {
        sessionStore.delete(id);
        cleared++;
      }
    }

    return cleared;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get persona config
 */
export function getPersonaConfig(persona: PersonaType) {
  return PERSONAS[persona];
}

/**
 * Build system prompt for persona
 */
export function buildSystemPrompt(context: RuntimeContext): string {
  const personaConfig = PERSONAS[context.persona];
  
  let prompt = personaConfig.systemPrompt;
  
  // Add skill-level adjustments
  if (context.skillAssessment.level === 'beginner') {
    prompt += '\n\nThe user is a beginner. Use simple language and avoid technical jargon.';
  } else if (context.skillAssessment.level === 'expert') {
    prompt += '\n\nThe user is an expert. You can use technical terminology freely.';
  }

  // Add memory context if available and consented
  if (context.consent.memory && context.memories.length > 0) {
    const memoryContext = context.memories
      .slice(0, 5)
      .map(m => `- ${m.text}`)
      .join('\n');
    prompt += `\n\nRelevant context from previous interactions:\n${memoryContext}`;
  }

  return prompt;
}

export default ContextBuilder;

