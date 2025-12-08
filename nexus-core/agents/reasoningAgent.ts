/**
 * Reasoning Agent
 * Handles logical reasoning, Q&A, and explanations
 */

import type { Agent, AgentInput, AgentOutput } from "../core/types";

const reasoningAgent: Agent = {
  id: "reasoning",
  name: "Reasoning Agent",
  description: "Handles logical reasoning, answers questions, and provides explanations",
  capabilities: ["question-answering", "explanation", "inference", "logic"],
  priority: 1,
  enabled: true,

  async process(input: AgentInput): Promise<AgentOutput> {
    const { query, context, memory } = input;

    try {
      // Analyze the query
      const analysis = analyzeQuery(query);
      
      // Build response based on query type
      let result: any;
      let confidence = 0.7;

      if (analysis.isQuestion) {
        result = await handleQuestion(query, context, memory || []);
        confidence = 0.8;
      } else if (analysis.isExplanation) {
        result = await handleExplanation(query, context);
        confidence = 0.75;
      } else {
        result = await handleGeneral(query, context, memory || []);
        confidence = 0.6;
      }

      return {
        success: true,
        result,
        confidence,
        explanation: `Processed as ${analysis.type} query`,
        suggestions: generateSuggestions(query, analysis),
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

function analyzeQuery(query: string): { 
  isQuestion: boolean; 
  isExplanation: boolean; 
  type: string;
  keywords: string[];
} {
  const lower = query.toLowerCase();
  
  return {
    isQuestion: lower.includes("?") || lower.match(/^(what|why|how|when|where|who|which|can|is|are|do|does)/) !== null,
    isExplanation: lower.match(/explain|describe|tell me about|what is/) !== null,
    type: lower.includes("?") ? "question" : lower.match(/explain|describe/) ? "explanation" : "statement",
    keywords: query.split(/\W+/).filter(w => w.length > 3),
  };
}

async function handleQuestion(query: string, context: Record<string, any>, memory: any[]): Promise<any> {
  const lower = query.toLowerCase();
  
  // Check memory for relevant information
  if (memory.length > 0) {
    const relevantMemory = memory.slice(0, 3).map(m => m.content).join("\n");
    return {
      answer: `Based on your history and data: ${relevantMemory.slice(0, 200)}... Let me help you with "${query}"`,
      sources: memory.slice(0, 3).map(m => m.id),
    };
  }

  // Generic helpful response
  if (lower.includes("how many") || lower.includes("count")) {
    const items = context.items || [];
    return {
      answer: `Based on your current data, you have ${items.length} items tracked.`,
      data: { count: items.length },
    };
  }

  return {
    answer: `I understand you're asking: "${query}". Let me help you with that. Could you provide more context or specify what aspect you'd like me to focus on?`,
  };
}

async function handleExplanation(query: string, context: Record<string, any>): Promise<any> {
  return {
    answer: `Here's an explanation for "${query}": This involves understanding the underlying concepts and how they connect. Would you like me to break this down further or focus on a specific aspect?`,
    followUp: ["Break it down step by step", "Give me examples", "How does this apply to my data?"],
  };
}

async function handleGeneral(query: string, context: Record<string, any>, memory: any[]): Promise<any> {
  return {
    answer: `I've processed your input: "${query}". I can help you with reasoning, analysis, planning, and more. What would you like to explore?`,
    capabilities: ["Ask questions", "Analyze data", "Create plans", "Get insights"],
  };
}

function generateSuggestions(query: string, analysis: any): string[] {
  const suggestions: string[] = [];
  
  if (analysis.isQuestion) {
    suggestions.push("Ask a follow-up question");
    suggestions.push("Request more details");
  }
  
  if (query.toLowerCase().includes("data") || query.toLowerCase().includes("items")) {
    suggestions.push("Analyze your items for patterns");
    suggestions.push("Get suggestions for your tasks");
  }

  suggestions.push("Explore related topics");
  
  return suggestions.slice(0, 3);
}

export default reasoningAgent;

