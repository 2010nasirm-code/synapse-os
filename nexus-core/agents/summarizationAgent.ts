/**
 * Summarization Agent
 * Creates summaries, abstracts, and condensed versions of content
 */

import type { Agent, AgentInput, AgentOutput } from "../core/types";

const summarizationAgent: Agent = {
  id: "summarization",
  name: "Summarization Agent",
  description: "Creates summaries, abstracts, and condensed versions of content",
  capabilities: ["summarization", "tldr", "abstract", "condensation"],
  priority: 8,
  enabled: true,

  async process(input: AgentInput): Promise<AgentOutput> {
    const { query, context } = input;

    try {
      const target = detectSummarizationTarget(query, context);
      const summary = await generateSummary(target, context);

      return {
        success: true,
        result: summary,
        confidence: 0.85,
        explanation: `Summarized ${target.type}`,
        suggestions: [
          "Get more details on specific points",
          "Export summary as markdown",
          "Create action items from summary",
        ],
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

function detectSummarizationTarget(query: string, context: Record<string, any>): {
  type: string;
  content: any;
} {
  const lower = query.toLowerCase();

  if (lower.includes("items") || lower.includes("tasks") || lower.includes("tracker")) {
    return { type: "items", content: context.items || [] };
  }

  if (lower.includes("suggestion")) {
    return { type: "suggestions", content: context.suggestions || [] };
  }

  if (lower.includes("day") || lower.includes("today")) {
    return { type: "daily", content: context };
  }

  if (lower.includes("week")) {
    return { type: "weekly", content: context };
  }

  // Default to overall summary
  return { type: "overall", content: context };
}

async function generateSummary(target: { type: string; content: any }, context: Record<string, any>): Promise<any> {
  switch (target.type) {
    case "items":
      return summarizeItems(target.content);
    case "suggestions":
      return summarizeSuggestions(target.content);
    case "daily":
      return summarizeDaily(context);
    case "weekly":
      return summarizeWeekly(context);
    default:
      return summarizeOverall(context);
  }
}

function summarizeItems(items: any[]): { answer: string; summary: any } {
  const completed = items.filter(i => i.status === "completed");
  const pending = items.filter(i => i.status === "pending");
  const inProgress = items.filter(i => i.status === "in_progress");
  const highPriority = items.filter(i => i.priority === "high" && i.status !== "completed");

  const summary = {
    total: items.length,
    completed: completed.length,
    pending: pending.length,
    inProgress: inProgress.length,
    completionRate: items.length > 0 ? Math.round((completed.length / items.length) * 100) : 0,
    highPriorityPending: highPriority.length,
  };

  let answer = `📋 **Items Summary**\n\n`;
  answer += `• Total: ${summary.total} items\n`;
  answer += `• Completed: ${summary.completed} (${summary.completionRate}%)\n`;
  answer += `• In Progress: ${summary.inProgress}\n`;
  answer += `• Pending: ${summary.pending}\n`;

  if (summary.highPriorityPending > 0) {
    answer += `\n⚠️ ${summary.highPriorityPending} high-priority items need attention`;
  }

  return { answer, summary };
}

function summarizeSuggestions(suggestions: any[]): { answer: string; summary: any } {
  const pending = suggestions.filter(s => s.status === "pending");
  const applied = suggestions.filter(s => s.status === "applied");
  const dismissed = suggestions.filter(s => s.status === "dismissed");

  const summary = {
    total: suggestions.length,
    pending: pending.length,
    applied: applied.length,
    dismissed: dismissed.length,
    adoptionRate: suggestions.length > 0 ? Math.round((applied.length / suggestions.length) * 100) : 0,
  };

  let answer = `💡 **Suggestions Summary**\n\n`;
  answer += `• Total: ${summary.total} suggestions\n`;
  answer += `• Applied: ${summary.applied} (${summary.adoptionRate}%)\n`;
  answer += `• Pending: ${summary.pending}\n`;
  answer += `• Dismissed: ${summary.dismissed}\n`;

  if (summary.pending > 0) {
    answer += `\n📌 Review ${summary.pending} pending suggestions`;
  }

  return { answer, summary };
}

function summarizeDaily(context: Record<string, any>): { answer: string; summary: any } {
  const items = context.items || [];
  const today = new Date().toISOString().split("T")[0];

  const todayItems = items.filter((i: any) => i.created_at?.startsWith(today));
  const todayCompleted = items.filter((i: any) => 
    i.status === "completed" && i.updated_at?.startsWith(today)
  );

  const summary = {
    date: today,
    created: todayItems.length,
    completed: todayCompleted.length,
  };

  let answer = `📅 **Daily Summary** (${today})\n\n`;
  answer += `• Created: ${summary.created} items\n`;
  answer += `• Completed: ${summary.completed} items\n`;

  return { answer, summary };
}

function summarizeWeekly(context: Record<string, any>): { answer: string; summary: any } {
  const items = context.items || [];
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString();

  const weekItems = items.filter((i: any) => i.created_at >= weekAgoStr);
  const weekCompleted = items.filter((i: any) => 
    i.status === "completed" && i.updated_at >= weekAgoStr
  );

  const summary = {
    period: "Last 7 days",
    created: weekItems.length,
    completed: weekCompleted.length,
  };

  let answer = `📊 **Weekly Summary**\n\n`;
  answer += `• Created: ${summary.created} items\n`;
  answer += `• Completed: ${summary.completed} items\n`;

  return { answer, summary };
}

function summarizeOverall(context: Record<string, any>): { answer: string; summary: any } {
  const items = context.items || [];
  const suggestions = context.suggestions || [];
  const automations = context.automations || [];

  const summary = {
    items: items.length,
    completed: items.filter((i: any) => i.status === "completed").length,
    suggestions: suggestions.length,
    automations: automations.length,
  };

  let answer = `📈 **Overall Summary**\n\n`;
  answer += `• Items: ${summary.items} (${summary.completed} completed)\n`;
  answer += `• Suggestions: ${summary.suggestions}\n`;
  answer += `• Automations: ${summary.automations}\n`;

  return { answer, summary };
}

export default summarizationAgent;


