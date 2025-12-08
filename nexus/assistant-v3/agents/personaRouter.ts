/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - PERSONA ROUTER
 * ============================================================================
 * 
 * Handles persona selection and tone adjustment.
 * 
 * @module nexus/assistant-v3/agents/personaRouter
 * @version 3.0.0
 */

import { PersonaType, PersonaConfig, PERSONAS, SkillLevel } from '../core/types';
import { RuntimeContext } from '../core/contextBuilder';

// ============================================================================
// PERSONA SELECTION LOGIC
// ============================================================================

interface PersonaSelectionResult {
  persona: PersonaType;
  confidence: number;
  reason: string;
}

/**
 * Auto-select persona based on context
 */
export function autoSelectPersona(context: RuntimeContext): PersonaSelectionResult {
  const { skillAssessment, request } = context;

  // If user explicitly chose a persona, use it
  if (request.persona) {
    return {
      persona: request.persona,
      confidence: 1,
      reason: 'User selected',
    };
  }

  // Select based on skill level
  const skillToPersona: Record<SkillLevel, PersonaType> = {
    beginner: 'friendly',
    intermediate: 'teacher',
    advanced: 'expert',
    expert: 'expert',
  };

  const persona = skillToPersona[skillAssessment.level];

  // Adjust based on query characteristics
  const query = request.query.toLowerCase();

  // Short, simple questions -> concise
  if (query.length < 50 && /^(what|how|where|when|why)\s/.test(query)) {
    return {
      persona: 'concise',
      confidence: 0.7,
      reason: 'Short question detected',
    };
  }

  // Help/tutorial requests -> teacher
  if (/\b(help|learn|teach|explain|understand|how\s+do\s+i)\b/.test(query)) {
    return {
      persona: 'teacher',
      confidence: 0.8,
      reason: 'Help/learning request detected',
    };
  }

  // Technical queries -> expert
  if (/\b(api|code|debug|error|config|database|schema)\b/.test(query)) {
    return {
      persona: 'expert',
      confidence: 0.75,
      reason: 'Technical query detected',
    };
  }

  return {
    persona,
    confidence: skillAssessment.confidence,
    reason: `Based on ${skillAssessment.level} skill level`,
  };
}

// ============================================================================
// TONE ADJUSTMENT
// ============================================================================

export interface ToneAdjustment {
  greeting: string;
  closing: string;
  useEmoji: boolean;
  verbosityLevel: number;
  explainSteps: boolean;
  offerDoItForMe: boolean;
}

/**
 * Get tone adjustments for persona
 */
export function getToneAdjustment(persona: PersonaType): ToneAdjustment {
  const adjustments: Record<PersonaType, ToneAdjustment> = {
    friendly: {
      greeting: "Hey there! 👋",
      closing: "Let me know if you need anything else! 😊",
      useEmoji: true,
      verbosityLevel: 2,
      explainSteps: false,
      offerDoItForMe: true,
    },
    teacher: {
      greeting: "Great question!",
      closing: "Does that make sense? Feel free to ask follow-up questions.",
      useEmoji: false,
      verbosityLevel: 4,
      explainSteps: true,
      offerDoItForMe: false,
    },
    expert: {
      greeting: "",
      closing: "",
      useEmoji: false,
      verbosityLevel: 5,
      explainSteps: false,
      offerDoItForMe: false,
    },
    concise: {
      greeting: "",
      closing: "",
      useEmoji: false,
      verbosityLevel: 1,
      explainSteps: false,
      offerDoItForMe: true,
    },
  };

  return adjustments[persona];
}

// ============================================================================
// RESPONSE FORMATTING
// ============================================================================

/**
 * Format response according to persona
 */
export function formatResponse(
  response: string,
  persona: PersonaType,
  options?: {
    includeGreeting?: boolean;
    includeClosing?: boolean;
    addDoItForMe?: string;
  }
): string {
  const tone = getToneAdjustment(persona);
  const config = PERSONAS[persona];
  let formatted = response;

  // Add greeting
  if (options?.includeGreeting && tone.greeting) {
    formatted = `${tone.greeting}\n\n${formatted}`;
  }

  // Add "Do it for me" suggestion
  if (options?.addDoItForMe && tone.offerDoItForMe) {
    const doItForMe = config.doForMeStyle === 'explicit'
      ? `\n\n💡 **Quick action:** ${options.addDoItForMe}`
      : config.doForMeStyle === 'subtle'
        ? `\n\n_Tip: ${options.addDoItForMe}_`
        : '';
    formatted += doItForMe;
  }

  // Add closing
  if (options?.includeClosing && tone.closing) {
    formatted = `${formatted}\n\n${tone.closing}`;
  }

  // Adjust verbosity (simplified - in production would use NLP)
  if (tone.verbosityLevel === 1) {
    // Remove excessive explanation
    formatted = formatted
      .replace(/\n\n+/g, '\n')
      .replace(/^(That being said|In other words|To clarify),?\s*/gim, '');
  }

  return formatted;
}

/**
 * Add step-by-step formatting
 */
export function formatAsSteps(steps: string[], persona: PersonaType): string {
  const config = PERSONAS[persona];
  
  if (persona === 'teacher' || config.explanationStyle === 'detailed') {
    return steps.map((step, i) => `**Step ${i + 1}:** ${step}`).join('\n\n');
  }
  
  if (persona === 'concise') {
    return steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
  }

  return steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

export { PERSONAS, type PersonaConfig };

export default {
  autoSelectPersona,
  getToneAdjustment,
  formatResponse,
  formatAsSteps,
};

