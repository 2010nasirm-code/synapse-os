/**
 * @module data/prompts
 * @description System prompts and templates for AI interactions
 * 
 * Centralized storage for all prompt templates used by agents and skills.
 * 
 * @version 1.0.0
 */

// ============================================
// SYSTEM PROMPTS
// ============================================

export const SystemPrompts = {
  /**
   * Base system prompt for all agents
   */
  base: `You are Nexus, an advanced AI assistant that is part of the Synapse OS system.
You help users manage their tasks, generate insights, and automate workflows.
Be helpful, concise, and action-oriented. Focus on practical outcomes.`,

  /**
   * Reasoning agent prompt
   */
  reasoning: `You are a logical reasoning agent.
Analyze questions carefully, break down complex problems, and provide clear explanations.
When answering questions, cite your reasoning steps.`,

  /**
   * Planning agent prompt
   */
  planning: `You are a planning and organization specialist.
Create structured, actionable plans with clear steps, timelines, and milestones.
Consider dependencies between tasks and prioritize effectively.`,

  /**
   * Analytics agent prompt
   */
  analytics: `You are a data analysis expert.
Identify patterns, trends, and anomalies in data.
Provide actionable insights based on statistical evidence.`,

  /**
   * Creativity agent prompt
   */
  creativity: `You are a creative ideation specialist.
Generate diverse, innovative ideas and explore unconventional approaches.
Build on concepts and find unexpected connections.`,

  /**
   * Summarization agent prompt
   */
  summarization: `You are a summarization expert.
Create concise, accurate summaries that capture key points.
Maintain the essential meaning while reducing length.`,
};

// ============================================
// PROMPT TEMPLATES
// ============================================

/**
 * Template for query analysis
 */
export function queryAnalysisTemplate(query: string, context?: string): string {
  return `Analyze the following query and determine the user's intent:

Query: "${query}"
${context ? `Context: ${context}` : ""}

Identify:
1. Primary intent
2. Key entities
3. Required actions
4. Expected output type`;
}

/**
 * Template for insight generation
 */
export function insightGenerationTemplate(data: string): string {
  return `Analyze the following data and generate insights:

Data:
${data}

Provide:
1. Key observations
2. Patterns or trends
3. Anomalies or concerns
4. Actionable recommendations`;
}

/**
 * Template for plan creation
 */
export function planCreationTemplate(goal: string, constraints?: string): string {
  return `Create a detailed plan for achieving the following goal:

Goal: "${goal}"
${constraints ? `Constraints: ${constraints}` : ""}

Include:
1. Clear steps with descriptions
2. Time estimates for each step
3. Dependencies between steps
4. Potential blockers and mitigations
5. Success criteria`;
}

/**
 * Template for summarization
 */
export function summarizationTemplate(content: string, length: "short" | "medium" | "long" = "medium"): string {
  const targetLength = {
    short: "2-3 sentences",
    medium: "1 paragraph",
    long: "2-3 paragraphs",
  }[length];

  return `Summarize the following content in ${targetLength}:

Content:
${content}

Focus on the most important points and maintain accuracy.`;
}

/**
 * Template for idea expansion
 */
export function ideaExpansionTemplate(seed: string, count: number = 5): string {
  return `Given this seed idea, generate ${count} related but distinct ideas:

Seed: "${seed}"

For each idea:
1. State the idea clearly
2. Explain how it relates to the seed
3. Note what makes it unique`;
}

// ============================================
// RESPONSE FORMATS
// ============================================

export const ResponseFormats = {
  /**
   * Standard response format
   */
  standard: {
    answer: "string - The main response",
    confidence: "number - 0-1 confidence score",
    sources: "array - References used",
    suggestions: "array - Follow-up suggestions",
  },

  /**
   * Plan response format
   */
  plan: {
    goal: "string - The objective",
    steps: [
      {
        number: "number",
        title: "string",
        description: "string",
        duration: "string",
        dependencies: "array",
      },
    ],
    totalDuration: "string",
    successCriteria: "array",
  },

  /**
   * Analysis response format
   */
  analysis: {
    summary: "string - Executive summary",
    observations: "array - Key findings",
    patterns: "array - Detected patterns",
    recommendations: "array - Actionable items",
    confidence: "number - 0-1 confidence",
  },
};

export default {
  SystemPrompts,
  queryAnalysisTemplate,
  insightGenerationTemplate,
  planCreationTemplate,
  summarizationTemplate,
  ideaExpansionTemplate,
  ResponseFormats,
};

