/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - MEMORY AGENT
 * ============================================================================
 * 
 * Handles memory read/write operations with embeddings.
 * 
 * @module nexus/assistant-v3/agents/memoryAgent
 * @version 3.0.0
 */

import { AgentResult, MemoryItem, MemorySearchResult } from '../core/types';
import { RuntimeContext } from '../core/contextBuilder';
import { IntentAnalysis } from '../core/router';
import { IAgent } from '../core/coordinator';
import { ConsentManager } from '../core/safety';

// ============================================================================
// MEMORY OPERATIONS
// ============================================================================

interface MemoryContext {
  relevant: MemoryItem[];
  summary?: string;
}

/**
 * Build memory context for a query
 */
async function buildMemoryContext(
  context: RuntimeContext,
  intent: IntentAnalysis
): Promise<MemoryContext> {
  // Import memory store lazily to avoid circular deps
  const { getMemoryStore } = await import('../memory/memoryStore');
  const store = getMemoryStore(context.userId);

  // Get relevant memories
  const searchResults = await store.search(context.request.query, 5);
  const relevant = searchResults.map(r => r.item);

  // Build summary if we have memories
  let summary: string | undefined;
  if (relevant.length > 0) {
    const types = [...new Set(relevant.map(m => m.type))];
    summary = `Found ${relevant.length} relevant memories (${types.join(', ')})`;
  }

  return { relevant, summary };
}

/**
 * Extract memory-worthy content from conversation
 */
function extractMemoryContent(
  query: string,
  response: string
): { text: string; type: MemoryItem['type']; importance: number } | null {
  // Check for preference statements
  if (/\b(i prefer|i like|i don't like|i hate|i love)\b/i.test(query)) {
    return {
      text: query,
      type: 'preference',
      importance: 0.7,
    };
  }

  // Check for fact statements
  if (/\b(i am|my name is|i work|i live)\b/i.test(query)) {
    return {
      text: query,
      type: 'fact',
      importance: 0.8,
    };
  }

  // Check for learning/insight
  if (/\b(i learned|i realized|i figured out)\b/i.test(query)) {
    return {
      text: query,
      type: 'insight',
      importance: 0.6,
    };
  }

  return null;
}

// ============================================================================
// MEMORY AGENT
// ============================================================================

export class MemoryAgent implements IAgent {
  id = 'memory';
  name = 'Memory Agent';
  priority = 5;
  canParallelize = true;

  async execute(context: RuntimeContext, intent: IntentAnalysis): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const query = context.request.query;
      const lower = query.toLowerCase();

      // Determine memory operation
      if (/\b(remember|recall|what\s+did\s+i|you\s+said)\b/i.test(lower)) {
        return await this.handleRecall(context, intent, startTime);
      }

      if (/\b(forget|delete\s+memory|clear\s+memory)\b/i.test(lower)) {
        return await this.handleForget(context, intent, startTime);
      }

      // Default: provide context from memory
      return await this.provideContext(context, intent, startTime);

    } catch (error) {
      return {
        agentId: this.id,
        success: false,
        error: error instanceof Error ? error.message : 'Memory operation failed',
        provenance: {
          agent: this.id,
          inputs: [context.request.query],
          confidence: 0,
          timestamp: new Date().toISOString(),
          operation: 'error',
        },
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  private async handleRecall(
    context: RuntimeContext,
    intent: IntentAnalysis,
    startTime: number
  ): Promise<AgentResult> {
    // Check consent
    if (!ConsentManager.canStoreMemory(context.userId)) {
      return {
        agentId: this.id,
        success: true,
        response: "I don't have any memories stored - you haven't enabled memory storage yet. Would you like to turn it on?",
        provenance: {
          agent: this.id,
          inputs: ['recall_request'],
          confidence: 1,
          timestamp: new Date().toISOString(),
          operation: 'recall_no_consent',
        },
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Search memories
    const memoryContext = await buildMemoryContext(context, intent);

    if (memoryContext.relevant.length === 0) {
      return {
        agentId: this.id,
        success: true,
        response: "I don't have any memories that match your query. As we chat more, I'll learn about your preferences and context!",
        provenance: {
          agent: this.id,
          inputs: [context.request.query],
          confidence: 0.8,
          timestamp: new Date().toISOString(),
          operation: 'recall_empty',
        },
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Format memories
    const memoryList = memoryContext.relevant
      .map((m, i) => `${i + 1}. ${m.text}`)
      .join('\n');

    const response = context.persona === 'friendly'
      ? `Here's what I remember! 🧠\n\n${memoryList}`
      : `Retrieved memories:\n\n${memoryList}`;

    return {
      agentId: this.id,
      success: true,
      response,
      provenance: {
        agent: this.id,
        inputs: [context.request.query],
        confidence: 0.85,
        timestamp: new Date().toISOString(),
        operation: 'recall',
      },
      processingTimeMs: Date.now() - startTime,
    };
  }

  private async handleForget(
    context: RuntimeContext,
    intent: IntentAnalysis,
    startTime: number
  ): Promise<AgentResult> {
    // This requires confirmation
    return {
      agentId: this.id,
      success: true,
      response: "I can clear my memories of our conversations. This action requires your confirmation.",
      actions: [{
        id: `action-${Date.now()}`,
        type: 'delete_item' as const,
        payload: { target: 'memories', userId: context.userId },
        requiresConfirmation: true,
        previewText: 'Clear all stored memories',
        explanation: 'This will delete all memories I have stored about your preferences and context.',
        impact: 'high',
      }],
      provenance: {
        agent: this.id,
        inputs: ['forget_request'],
        confidence: 1,
        timestamp: new Date().toISOString(),
        operation: 'forget_request',
      },
      processingTimeMs: Date.now() - startTime,
    };
  }

  private async provideContext(
    context: RuntimeContext,
    intent: IntentAnalysis,
    startTime: number
  ): Promise<AgentResult> {
    // Check consent
    if (!ConsentManager.canStoreMemory(context.userId)) {
      return {
        agentId: this.id,
        success: true,
        // No response - just return silently
        provenance: {
          agent: this.id,
          inputs: ['context_check'],
          confidence: 1,
          timestamp: new Date().toISOString(),
          operation: 'no_consent',
        },
        processingTimeMs: Date.now() - startTime,
      };
    }

    // Get memory context
    const memoryContext = await buildMemoryContext(context, intent);

    // Store this interaction if relevant
    const memoryContent = extractMemoryContent(context.request.query, '');
    if (memoryContent) {
      const { getMemoryStore } = await import('../memory/memoryStore');
      const store = getMemoryStore(context.userId);
      await store.add({
        text: memoryContent.text,
        type: memoryContent.type,
        importance: memoryContent.importance,
      });
    }

    // Don't generate a visible response, just provide context
    return {
      agentId: this.id,
      success: true,
      // Response is optional - memory agent primarily provides context
      provenance: {
        agent: this.id,
        inputs: [memoryContext.summary || 'no_memories'],
        confidence: memoryContext.relevant.length > 0 ? 0.7 : 0.5,
        timestamp: new Date().toISOString(),
        operation: 'context_provision',
      },
      processingTimeMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: MemoryAgent | null = null;

export function getMemoryAgent(): MemoryAgent {
  if (!instance) {
    instance = new MemoryAgent();
  }
  return instance;
}

export default MemoryAgent;

