/**
 * Analytics Engine
 * Track and analyze user data for insights
 */

export interface AnalyticsEvent {
  user_id: string;
  event_type: string;
  event_data: Record<string, any>;
  timestamp?: string;
}

export interface AnalyticsDashboard {
  totalItems: number;
  completedItems: number;
  pendingItems: number;
  completionRate: number;
  activeAutomations: number;
  suggestionsApplied: number;
  trends: TrendData[];
  insights: Insight[];
}

export interface TrendData {
  date: string;
  completed: number;
  created: number;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  type: "positive" | "negative" | "neutral";
  metric: string;
  change: number;
}

export class AnalyticsEngine {
  async generateDashboard(
    items: any[],
    automations: any[],
    suggestions: any[]
  ): Promise<AnalyticsDashboard> {
    const totalItems = items.length;
    const completedItems = items.filter((i) => i.status === "completed").length;
    const pendingItems = items.filter((i) => i.status === "pending").length;
    const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    const activeAutomations = automations.filter((a) => a.is_active).length;
    const suggestionsApplied = suggestions.filter((s) => s.status === "applied").length;

    // Generate trends (last 7 days)
    const trends = this.generateTrends(items);

    // Generate insights
    const insights = this.generateInsights(items, automations, suggestions);

    return {
      totalItems,
      completedItems,
      pendingItems,
      completionRate: Math.round(completionRate * 10) / 10,
      activeAutomations,
      suggestionsApplied,
      trends,
      insights,
    };
  }

  private generateTrends(items: any[]): TrendData[] {
    const trends: TrendData[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const completed = items.filter((item) => {
        if (item.status !== "completed" || !item.updated_at) return false;
        return item.updated_at.startsWith(dateStr);
      }).length;

      const created = items.filter((item) => {
        if (!item.created_at) return false;
        return item.created_at.startsWith(dateStr);
      }).length;

      trends.push({ date: dateStr, completed, created });
    }

    return trends;
  }

  private generateInsights(
    items: any[],
    automations: any[],
    suggestions: any[]
  ): Insight[] {
    const insights: Insight[] = [];

    // Completion rate insight
    const completedItems = items.filter((i) => i.status === "completed").length;
    const completionRate = items.length > 0 ? (completedItems / items.length) * 100 : 0;

    if (completionRate >= 70) {
      insights.push({
        id: "insight-1",
        title: "Great completion rate!",
        description: `You've completed ${Math.round(completionRate)}% of your items.`,
        type: "positive",
        metric: "completion_rate",
        change: completionRate,
      });
    } else if (completionRate < 30 && items.length > 5) {
      insights.push({
        id: "insight-2",
        title: "Completion rate needs attention",
        description: "Consider focusing on completing existing items before adding new ones.",
        type: "negative",
        metric: "completion_rate",
        change: completionRate,
      });
    }

    // Automation insight
    if (automations.length > 0) {
      const activeCount = automations.filter((a) => a.is_active).length;
      insights.push({
        id: "insight-3",
        title: "Automations active",
        description: `${activeCount} of ${automations.length} automations are running.`,
        type: activeCount > 0 ? "positive" : "neutral",
        metric: "automations",
        change: activeCount,
      });
    }

    // Suggestion adoption insight
    const appliedSuggestions = suggestions.filter((s) => s.status === "applied").length;
    if (appliedSuggestions > 0) {
      insights.push({
        id: "insight-4",
        title: "AI suggestions adopted",
        description: `You've applied ${appliedSuggestions} AI suggestions.`,
        type: "positive",
        metric: "suggestions",
        change: appliedSuggestions,
      });
    }

    return insights;
  }

  async trackEvent(supabase: any, event: AnalyticsEvent) {
    try {
      await supabase.from("analytics_events").insert({
        user_id: event.user_id,
        event_type: event.event_type,
        event_data: event.event_data,
        created_at: event.timestamp || new Date().toISOString(),
      } as any);
    } catch (error) {
      console.error("Failed to track event:", error);
    }
  }
}

// Export singleton instance
export const analyticsEngine = new AnalyticsEngine();


