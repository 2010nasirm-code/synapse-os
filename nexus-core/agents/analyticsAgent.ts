/**
 * Analytics Agent
 * Analyzes data, detects patterns, and generates statistics
 */

import type { Agent, AgentInput, AgentOutput } from "../core/types";

const analyticsAgent: Agent = {
  id: "analytics",
  name: "Analytics Agent",
  description: "Analyzes data, detects patterns, and generates statistics",
  capabilities: ["data-analysis", "pattern-detection", "statistics", "trends"],
  priority: 4,
  enabled: true,

  async process(input: AgentInput): Promise<AgentOutput> {
    const { query, context } = input;
    const items = context.items || [];
    const suggestions = context.suggestions || [];
    const automations = context.automations || [];

    try {
      const analysis = performAnalysis(items, suggestions, automations);
      const patterns = detectPatterns(items);
      const insights = generateInsights(analysis, patterns);

      return {
        success: true,
        result: {
          answer: formatAnalysisSummary(analysis, insights),
          analysis,
          patterns,
          insights,
        },
        confidence: 0.85,
        explanation: `Analyzed ${items.length} items and detected ${patterns.length} patterns`,
        suggestions: insights.recommendations,
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

function performAnalysis(items: any[], suggestions: any[], automations: any[]) {
  const completed = items.filter(i => i.status === "completed");
  const pending = items.filter(i => i.status === "pending");
  const inProgress = items.filter(i => i.status === "in_progress");
  
  const byPriority = {
    high: items.filter(i => i.priority === "high").length,
    medium: items.filter(i => i.priority === "medium").length,
    low: items.filter(i => i.priority === "low").length,
  };

  const byCategory: Record<string, number> = {};
  items.forEach(i => {
    const cat = i.category || "Uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  });

  return {
    totals: {
      items: items.length,
      completed: completed.length,
      pending: pending.length,
      inProgress: inProgress.length,
      suggestions: suggestions.length,
      automations: automations.length,
    },
    rates: {
      completion: items.length > 0 ? Math.round((completed.length / items.length) * 100) : 0,
      suggestionAdoption: suggestions.length > 0 
        ? Math.round((suggestions.filter(s => s.status === "applied").length / suggestions.length) * 100)
        : 0,
    },
    byPriority,
    byCategory,
  };
}

function detectPatterns(items: any[]): Array<{ name: string; description: string; confidence: number }> {
  const patterns = [];

  // Completion pattern
  const completed = items.filter(i => i.status === "completed");
  if (completed.length > items.length * 0.7) {
    patterns.push({
      name: "High Achiever",
      description: "You complete most tasks you create",
      confidence: 0.9,
    });
  }

  // Priority pattern
  const highPriority = items.filter(i => i.priority === "high");
  if (highPriority.length > items.length * 0.5) {
    patterns.push({
      name: "Priority Inflation",
      description: "Many items marked as high priority",
      confidence: 0.85,
    });
  }

  // Category focus
  const categories: Record<string, number> = {};
  items.forEach(i => {
    const cat = i.category || "Uncategorized";
    categories[cat] = (categories[cat] || 0) + 1;
  });
  
  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
  if (topCategory && topCategory[1] >= 3) {
    patterns.push({
      name: "Category Focus",
      description: `Strong focus on "${topCategory[0]}" (${topCategory[1]} items)`,
      confidence: 0.8,
    });
  }

  return patterns;
}

function generateInsights(analysis: any, patterns: any[]): {
  summary: string;
  recommendations: string[];
  warnings: string[];
} {
  const recommendations: string[] = [];
  const warnings: string[] = [];

  // Based on completion rate
  if (analysis.rates.completion < 30) {
    warnings.push("Low completion rate - consider breaking tasks into smaller pieces");
  } else if (analysis.rates.completion > 70) {
    recommendations.push("Great progress! Consider taking on more challenging goals");
  }

  // Based on pending count
  if (analysis.totals.pending > 10) {
    warnings.push("Many pending items - prioritize or reschedule some");
  }

  // Based on patterns
  patterns.forEach(p => {
    if (p.name === "Priority Inflation") {
      recommendations.push("Review priorities - not everything can be high priority");
    }
  });

  const summary = `${analysis.totals.items} total items, ${analysis.rates.completion}% completed. ` +
    `${patterns.length} patterns detected.`;

  return { summary, recommendations, warnings };
}

function formatAnalysisSummary(analysis: any, insights: any): string {
  let summary = `📊 **Analytics Summary**\n\n`;
  summary += `• Total Items: ${analysis.totals.items}\n`;
  summary += `• Completion Rate: ${analysis.rates.completion}%\n`;
  summary += `• Pending: ${analysis.totals.pending} | In Progress: ${analysis.totals.inProgress}\n\n`;

  if (insights.recommendations.length > 0) {
    summary += `💡 **Recommendations:**\n`;
    insights.recommendations.forEach((r: string) => {
      summary += `• ${r}\n`;
    });
  }

  return summary;
}

export default analyticsAgent;

