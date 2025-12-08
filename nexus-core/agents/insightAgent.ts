/**
 * Insight Agent
 * Generates insights, correlations, and discoveries from data
 */

import type { Agent, AgentInput, AgentOutput } from "../core/types";

const insightAgent: Agent = {
  id: "insight",
  name: "Insight Agent",
  description: "Generates insights, discovers correlations, and finds hidden patterns",
  capabilities: ["insight-generation", "correlation", "anomaly-detection", "discovery"],
  priority: 5,
  enabled: true,

  async process(input: AgentInput): Promise<AgentOutput> {
    const { query, context, memory } = input;

    try {
      const items = context.items || [];
      const insights = await generateInsights(items, memory || []);

      return {
        success: true,
        result: {
          answer: formatInsights(insights),
          insights,
        },
        confidence: 0.75,
        explanation: `Generated ${insights.length} insights`,
        suggestions: insights.map(i => i.actionable).filter((s): s is string => Boolean(s)),
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

interface Insight {
  id: string;
  type: "trend" | "correlation" | "anomaly" | "opportunity";
  title: string;
  description: string;
  confidence: number;
  actionable?: string;
  data?: any;
}

async function generateInsights(items: any[], memory: any[]): Promise<Insight[]> {
  const insights: Insight[] = [];

  // Trend insights
  const completed = items.filter(i => i.status === "completed");
  const completionRate = items.length > 0 ? completed.length / items.length : 0;

  if (completionRate > 0.7) {
    insights.push({
      id: "insight-trend-1",
      type: "trend",
      title: "High Productivity Trend",
      description: `You're completing ${Math.round(completionRate * 100)}% of your items. This is excellent!`,
      confidence: 0.9,
      actionable: "Consider setting more ambitious goals",
    });
  } else if (completionRate < 0.3 && items.length > 5) {
    insights.push({
      id: "insight-trend-2",
      type: "trend",
      title: "Completion Rate Concern",
      description: "Your completion rate is below 30%. Tasks may be too large or numerous.",
      confidence: 0.85,
      actionable: "Try breaking tasks into smaller, achievable steps",
    });
  }

  // Category correlation
  const categoryCompletion: Record<string, { completed: number; total: number }> = {};
  items.forEach(i => {
    const cat = i.category || "Uncategorized";
    if (!categoryCompletion[cat]) {
      categoryCompletion[cat] = { completed: 0, total: 0 };
    }
    categoryCompletion[cat].total++;
    if (i.status === "completed") {
      categoryCompletion[cat].completed++;
    }
  });

  Object.entries(categoryCompletion).forEach(([cat, data]) => {
    if (data.total >= 3) {
      const rate = data.completed / data.total;
      if (rate > 0.8) {
        insights.push({
          id: `insight-cat-${cat}`,
          type: "correlation",
          title: `Strong in ${cat}`,
          description: `You excel at "${cat}" tasks with ${Math.round(rate * 100)}% completion`,
          confidence: 0.8,
          data: { category: cat, rate },
        });
      }
    }
  });

  // Opportunity insights
  const highPriorityPending = items.filter(i => i.priority === "high" && i.status === "pending");
  if (highPriorityPending.length > 0) {
    insights.push({
      id: "insight-opp-1",
      type: "opportunity",
      title: "Quick Wins Available",
      description: `${highPriorityPending.length} high-priority items await completion`,
      confidence: 0.9,
      actionable: `Focus on: "${highPriorityPending[0]?.name || 'your top priority'}"`,
    });
  }

  // Memory-based insights
  if (memory.length > 10) {
    const recentTopics = memory
      .slice(0, 10)
      .flatMap(m => m.metadata?.tags || [])
      .reduce((acc: Record<string, number>, tag: string) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {});

    const topicEntries = Object.entries(recentTopics) as [string, number][];
    const topTopic = topicEntries.sort((a, b) => b[1] - a[1])[0];
    if (topTopic && topTopic[1] >= 3) {
      insights.push({
        id: "insight-mem-1",
        type: "trend",
        title: `Focus on ${topTopic[0]}`,
        description: `You've been thinking about "${topTopic[0]}" frequently`,
        confidence: 0.7,
        data: { topic: topTopic[0], frequency: topTopic[1] },
      });
    }
  }

  return insights;
}

function formatInsights(insights: Insight[]): string {
  if (insights.length === 0) {
    return "No significant insights found yet. Add more data for personalized insights.";
  }

  let output = `🔍 **Insights Discovered**\n\n`;
  
  insights.forEach((insight, i) => {
    const icon = {
      trend: "📈",
      correlation: "🔗",
      anomaly: "⚠️",
      opportunity: "💡",
    }[insight.type];

    output += `${icon} **${insight.title}**\n`;
    output += `${insight.description}\n`;
    if (insight.actionable) {
      output += `→ ${insight.actionable}\n`;
    }
    output += `\n`;
  });

  return output;
}

export default insightAgent;

