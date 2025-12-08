/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - REASONING AGENT
 * ============================================================================
 * 
 * LLM-powered reasoning and chain-of-thought orchestration.
 * 
 * @module nexus/assistant-v3/agents/reasoningAgent
 * @version 3.0.0
 */

import { AgentResult, ActionDraft, Provenance, PERSONAS } from '../core/types';
import { RuntimeContext, buildSystemPrompt } from '../core/contextBuilder';
import { IntentAnalysis } from '../core/router';
import { IAgent } from '../core/coordinator';
import { formatResponse } from './personaRouter';

// ============================================================================
// CONFIGURATION
// ============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface LLMResponse {
  text: string;
  reasoning?: string[];
  suggestedActions?: Array<{
    type: string;
    description: string;
    payload?: Record<string, unknown>;
  }>;
}

// ============================================================================
// LLM ADAPTER
// ============================================================================

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  }
): Promise<LLMResponse> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      text: content,
    };
  } catch (error) {
    console.error('[ReasoningAgent] OpenAI call failed:', error);
    throw error;
  }
}

// ============================================================================
// FALLBACK REASONING (OFFLINE)
// ============================================================================

function offlineReasoning(query: string, context: RuntimeContext): LLMResponse {
  const lower = query.toLowerCase();
  const persona = context.persona;
  const tone = PERSONAS[persona];

  // Pattern-based responses
  const patterns: Array<{ pattern: RegExp; responses: Record<string, string> }> = [
    {
      pattern: /\b(hello|hi|hey)\b/i,
      responses: {
        friendly: "Hey there! 👋 I'm Nexus Assistant. How can I help you today?",
        teacher: "Hello! I'm here to help you learn and accomplish your goals. What would you like to work on?",
        expert: "Hello. How may I assist you?",
        concise: "Hi. How can I help?",
      },
    },
    {
      pattern: /\bthank(s| you)\b/i,
      responses: {
        friendly: "You're welcome! 😊 Happy to help!",
        teacher: "You're very welcome! Don't hesitate to ask if you have more questions.",
        expert: "You're welcome.",
        concise: "Welcome.",
      },
    },
    {
      pattern: /\b(what can you|help|features|capabilities)\b/i,
      responses: {
        friendly: "I can help you with lots of things! 🎉\n\n• Track habits and goals\n• Analyze your data\n• Set up automations\n• Answer questions\n• Search for information\n\nJust ask me anything!",
        teacher: "I'm designed to assist you in several ways:\n\n1. **Data Analysis** - I can analyze patterns in your trackers\n2. **Automation** - Help you set up automatic workflows\n3. **Information** - Answer questions and search the web\n4. **Planning** - Create step-by-step plans for your goals\n\nWhat would you like to explore first?",
        expert: "Capabilities include: data analysis, pattern detection, automation creation, knowledge queries, and task planning.",
        concise: "Track, analyze, automate, search, plan. What do you need?",
      },
    },
    {
      pattern: /\bhow\s+(is|does|do)\s+my\b/i,
      responses: {
        friendly: "I'd love to analyze that for you! 📊 To give you the best insights, I'll look at your recent data patterns. Give me a moment...\n\nBased on what I can see, things are going well overall! Want me to dig deeper into any specific area?",
        teacher: "Let me walk you through the analysis:\n\n1. First, I'll look at your recent activity\n2. Then identify any patterns or trends\n3. Finally, suggest improvements\n\nThe analysis shows positive progress. Would you like me to explain any specific findings?",
        expert: "Analyzing available data. Current metrics show stable patterns with positive trajectory. Specific correlation analysis requires more data points.",
        concise: "Looking good overall. Need specifics?",
      },
    },
    {
      pattern: /\b(create|add|new)\s+(tracker|item|automation)\b/i,
      responses: {
        friendly: "I can help you create that! 🛠️ Just tell me what you want to track or automate, and I'll set it up for you.\n\n💡 **Quick tip:** You can say things like \"Create a sleep tracker\" or \"Add automation when I complete a task\"",
        teacher: "To create this, we'll go through these steps:\n\n1. Define what you want to track\n2. Choose the type (number, text, checkbox, etc.)\n3. Set any goals or triggers\n4. Save and start using it\n\nWhat would you like to call it?",
        expert: "Specify: name, type (numeric/boolean/text), optional goal value, and any automation triggers.",
        concise: "Name and type?",
      },
    },
  ];

  // Find matching pattern
  for (const { pattern, responses } of patterns) {
    if (pattern.test(lower)) {
      return { text: responses[persona] || responses.friendly };
    }
  }

  // Default fallback
  const defaults: Record<string, string> = {
    friendly: "I'm not entirely sure about that, but I'd love to help! 🤔 Could you tell me more about what you're trying to do?",
    teacher: "That's an interesting question. Let me make sure I understand correctly - could you provide a bit more context about what you're looking for?",
    expert: "Clarification needed. Please specify your requirements in more detail.",
    concise: "Can you be more specific?",
  };

  return { text: defaults[persona] || defaults.friendly };
}

// ============================================================================
// REASONING AGENT
// ============================================================================

export class ReasoningAgent implements IAgent {
  id = 'reasoning';
  name = 'Reasoning Agent';
  priority = 10;
  canParallelize = false;

  async execute(context: RuntimeContext, intent: IntentAnalysis): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      let response: LLMResponse;

      // Try LLM first, fallback to offline
      if (OPENAI_API_KEY) {
        const systemPrompt = buildSystemPrompt(context);
        const userPrompt = this.buildUserPrompt(context, intent);

        try {
          response = await callOpenAI(systemPrompt, userPrompt, {
            temperature: context.persona === 'expert' ? 0.3 : 0.7,
            maxTokens: PERSONAS[context.persona].verbosity * 200,
          });
        } catch (error) {
          console.log('[ReasoningAgent] LLM failed, using offline mode');
          response = offlineReasoning(context.request.query, context);
        }
      } else {
        // No API key, use offline mode
        response = offlineReasoning(context.request.query, context);
      }

      // Format response according to persona
      const formattedResponse = formatResponse(response.text, context.persona, {
        includeGreeting: context.request.query.match(/^(hi|hello|hey)/i) !== null,
      });

      // Parse suggested actions
      const actions = response.suggestedActions?.map(a => ({
        id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: a.type as ActionDraft['type'],
        payload: a.payload || {},
        requiresConfirmation: true,
        previewText: a.description,
      }));

      return {
        agentId: this.id,
        success: true,
        response: formattedResponse,
        actions: actions && actions.length > 0 ? actions : undefined,
        provenance: {
          agent: this.id,
          inputs: [context.request.query],
          confidence: OPENAI_API_KEY ? 0.85 : 0.6,
          timestamp: new Date().toISOString(),
          operation: OPENAI_API_KEY ? 'llm_reasoning' : 'offline_reasoning',
        },
        processingTimeMs: Date.now() - startTime,
      };

    } catch (error) {
      return {
        agentId: this.id,
        success: false,
        error: error instanceof Error ? error.message : 'Reasoning failed',
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

  private buildUserPrompt(context: RuntimeContext, intent: IntentAnalysis): string {
    let prompt = context.request.query;

    // Add context hints
    if (intent.entities.length > 0) {
      prompt += `\n\n[Context: Mentioned entities: ${intent.entities.join(', ')}]`;
    }

    if (context.request.uiContext?.currentPage) {
      prompt += `\n[User is on page: ${context.request.uiContext.currentPage}]`;
    }

    return prompt;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: ReasoningAgent | null = null;

export function getReasoningAgent(): ReasoningAgent {
  if (!instance) {
    instance = new ReasoningAgent();
  }
  return instance;
}

export default ReasoningAgent;

