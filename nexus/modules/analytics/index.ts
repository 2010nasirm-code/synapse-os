// ============================================================================
// NEXUS MODULES - Analytics Module
// ============================================================================

import { generateUUID, now, groupBy } from '../../utils';
import { eventBus } from '../../core/engine';

export interface AnalyticsEvent {
  id: string;
  userId: string;
  type: string;
  category: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface MetricPoint {
  timestamp: number;
  value: number;
}

export interface Dashboard {
  totalEvents: number;
  eventsByCategory: Record<string, number>;
  eventsByType: Record<string, number>;
  recentActivity: AnalyticsEvent[];
  trends: Record<string, 'up' | 'down' | 'stable'>;
}

export class AnalyticsModule {
  private events: AnalyticsEvent[] = [];
  private metrics: Map<string, MetricPoint[]> = new Map();

  // ----------------------------- Event Tracking -----------------------------
  track(userId: string, type: string, category: string, data: Record<string, unknown> = {}): AnalyticsEvent {
    const event: AnalyticsEvent = {
      id: generateUUID(),
      userId,
      type,
      category,
      data,
      timestamp: now(),
    };

    this.events.push(event);

    // Cleanup old events (keep last 30 days)
    const thirtyDaysAgo = now() - 30 * 24 * 60 * 60 * 1000;
    this.events = this.events.filter(e => e.timestamp > thirtyDaysAgo);

    eventBus.emit('analytics:event', event);
    return event;
  }

  // ----------------------------- Metric Recording ---------------------------
  recordMetric(key: string, value: number): void {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const points = this.metrics.get(key)!;
    points.push({ timestamp: now(), value });

    // Keep last 1000 points
    if (points.length > 1000) {
      points.shift();
    }
  }

  getMetric(key: string, since?: number): MetricPoint[] {
    const points = this.metrics.get(key) || [];
    if (since) {
      return points.filter(p => p.timestamp >= since);
    }
    return points;
  }

  // ----------------------------- Query Events -------------------------------
  getEvents(userId: string, options: {
    type?: string;
    category?: string;
    since?: number;
    limit?: number;
  } = {}): AnalyticsEvent[] {
    let results = this.events.filter(e => e.userId === userId);

    if (options.type) {
      results = results.filter(e => e.type === options.type);
    }

    if (options.category) {
      results = results.filter(e => e.category === options.category);
    }

    if (options.since) {
      const since = options.since;
      results = results.filter(e => e.timestamp >= since);
    }

    results.sort((a, b) => b.timestamp - a.timestamp);

    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  // ----------------------------- Dashboard ----------------------------------
  getDashboard(userId: string): Dashboard {
    const userEvents = this.events.filter(e => e.userId === userId);
    const byCategory = groupBy(userEvents, 'category');
    const byType = groupBy(userEvents, 'type');

    // Calculate trends (compare last 7 days to previous 7 days)
    const sevenDaysAgo = now() - 7 * 24 * 60 * 60 * 1000;
    const fourteenDaysAgo = now() - 14 * 24 * 60 * 60 * 1000;

    const recentEvents = userEvents.filter(e => e.timestamp >= sevenDaysAgo);
    const previousEvents = userEvents.filter(e => 
      e.timestamp >= fourteenDaysAgo && e.timestamp < sevenDaysAgo
    );

    const trends: Record<string, 'up' | 'down' | 'stable'> = {};
    const categories = Object.keys(byCategory);

    for (const category of categories) {
      const recentCount = recentEvents.filter(e => e.category === category).length;
      const previousCount = previousEvents.filter(e => e.category === category).length;
      
      if (recentCount > previousCount * 1.1) trends[category] = 'up';
      else if (recentCount < previousCount * 0.9) trends[category] = 'down';
      else trends[category] = 'stable';
    }

    return {
      totalEvents: userEvents.length,
      eventsByCategory: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k, v.length])
      ),
      eventsByType: Object.fromEntries(
        Object.entries(byType).map(([k, v]) => [k, v.length])
      ),
      recentActivity: userEvents.slice(-20).reverse(),
      trends,
    };
  }

  // ----------------------------- Aggregations -------------------------------
  aggregate(
    userId: string,
    options: {
      groupBy: 'hour' | 'day' | 'week' | 'month';
      category?: string;
      since?: number;
    }
  ): Array<{ period: string; count: number }> {
    let events = this.events.filter(e => e.userId === userId);

    if (options.category) {
      events = events.filter(e => e.category === options.category);
    }

    if (options.since) {
      const since = options.since;
      events = events.filter(e => e.timestamp >= since);
    }

    const groups = new Map<string, number>();

    for (const event of events) {
      const date = new Date(event.timestamp);
      let period: string;

      switch (options.groupBy) {
        case 'hour':
          period = `${date.toISOString().slice(0, 13)}:00`;
          break;
        case 'day':
          period = date.toISOString().slice(0, 10);
          break;
        case 'week':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          period = weekStart.toISOString().slice(0, 10);
          break;
        case 'month':
          period = date.toISOString().slice(0, 7);
          break;
      }

      groups.set(period, (groups.get(period) || 0) + 1);
    }

    return Array.from(groups.entries())
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  // ----------------------------- Insights -----------------------------------
  getInsights(userId: string): {
    mostActiveCategory: string | null;
    peakActivityTime: string | null;
    weeklyGrowth: number;
    topEvents: Array<{ type: string; count: number }>;
  } {
    const userEvents = this.events.filter(e => e.userId === userId);

    if (userEvents.length === 0) {
      return {
        mostActiveCategory: null,
        peakActivityTime: null,
        weeklyGrowth: 0,
        topEvents: [],
      };
    }

    // Most active category
    const byCategory = groupBy(userEvents, 'category');
    const mostActiveCategory = Object.entries(byCategory)
      .sort((a, b) => b[1].length - a[1].length)[0]?.[0] || null;

    // Peak activity time
    const byHour = new Map<number, number>();
    for (const event of userEvents) {
      const hour = new Date(event.timestamp).getHours();
      byHour.set(hour, (byHour.get(hour) || 0) + 1);
    }
    const peakHour = Array.from(byHour.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    const peakActivityTime = peakHour !== undefined 
      ? `${peakHour.toString().padStart(2, '0')}:00`
      : null;

    // Weekly growth
    const sevenDaysAgo = now() - 7 * 24 * 60 * 60 * 1000;
    const fourteenDaysAgo = now() - 14 * 24 * 60 * 60 * 1000;
    const thisWeek = userEvents.filter(e => e.timestamp >= sevenDaysAgo).length;
    const lastWeek = userEvents.filter(e => 
      e.timestamp >= fourteenDaysAgo && e.timestamp < sevenDaysAgo
    ).length;
    const weeklyGrowth = lastWeek > 0 
      ? ((thisWeek - lastWeek) / lastWeek) * 100 
      : 0;

    // Top events
    const byType = groupBy(userEvents, 'type');
    const topEvents = Object.entries(byType)
      .map(([type, events]) => ({ type, count: events.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      mostActiveCategory,
      peakActivityTime,
      weeklyGrowth,
      topEvents,
    };
  }

  // ----------------------------- Statistics ---------------------------------
  getStats() {
    return {
      totalEvents: this.events.length,
      uniqueUsers: new Set(this.events.map(e => e.userId)).size,
      categories: new Set(this.events.map(e => e.category)).size,
      metricsTracked: this.metrics.size,
    };
  }
}

export const analyticsModule = new AnalyticsModule();
export default analyticsModule;


