/**
 * Moderation Agent
 * Handles content moderation, safety checks, and privacy
 */

import type { Agent, AgentInput, AgentOutput } from "../core/types";

const moderationAgent: Agent = {
  id: "moderation",
  name: "Moderation Agent",
  description: "Handles content moderation, safety, and privacy",
  capabilities: ["moderation", "safety", "privacy", "content-filter"],
  priority: 15,
  enabled: true,

  async process(input: AgentInput): Promise<AgentOutput> {
    const { query, context } = input;

    try {
      const check = await moderateContent(query);
      
      if (!check.safe) {
        return {
          success: false,
          result: {
            answer: "This content cannot be processed due to safety guidelines.",
            reason: check.reason,
          },
          confidence: 0.95,
          error: check.reason,
        };
      }

      return {
        success: true,
        result: {
          answer: "Content passed moderation checks.",
          check,
        },
        confidence: 0.9,
        explanation: "Content moderation completed",
      };
    } catch (error: any) {
      return {
        success: false,
        result: null,
        confidence: 0,
        error: error.message,
      };
    }
  },
};

interface ModerationResult {
  safe: boolean;
  reason?: string;
  flags: string[];
  score: number;
}

async function moderateContent(content: string): Promise<ModerationResult> {
  const flags: string[] = [];
  let score = 1.0;

  // Check for sensitive patterns (very basic)
  const sensitivePatterns = [
    { pattern: /password|secret|api.?key/i, flag: "potential_secrets" },
    { pattern: /credit.?card|\b\d{16}\b/i, flag: "financial_data" },
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/i, flag: "ssn_pattern" },
  ];

  sensitivePatterns.forEach(({ pattern, flag }) => {
    if (pattern.test(content)) {
      flags.push(flag);
      score -= 0.2;
    }
  });

  // Check for excessive length
  if (content.length > 10000) {
    flags.push("excessive_length");
    score -= 0.1;
  }

  const safe = flags.length === 0 && score > 0.5;
  
  return {
    safe,
    reason: safe ? undefined : `Content flagged for: ${flags.join(", ")}`,
    flags,
    score: Math.max(0, score),
  };
}

// Privacy helpers
export async function anonymizeData(data: any): Promise<any> {
  if (typeof data === "string") {
    // Mask email addresses
    data = data.replace(/[\w.-]+@[\w.-]+\.\w+/g, "[EMAIL]");
    // Mask phone numbers
    data = data.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, "[PHONE]");
  }
  return data;
}

export async function checkPrivacyConsent(userId: string): Promise<boolean> {
  // Would check user settings in production
  return true;
}

export default moderationAgent;

