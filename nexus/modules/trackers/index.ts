// ============================================================================
// NEXUS MODULES - Trackers Module
// ============================================================================

import { TrackerItem, AnalyticsEvent } from '../../types';
import { generateUUID, now, groupBy } from '../../utils';
import { eventBus } from '../../core/engine';
import { nexusMemory } from '../../systems/nexus_memory';
import { patternMiner } from '../../systems/nexus_brain';

export interface TrackerCreateInput {
  name: string;
  type: string;
  value?: unknown;
  unit?: string;
  category?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface TrackerFilter {
  userId?: string;
  type?: string;
  category?: string;
  tags?: string[];
  minStreak?: number;
  search?: string;
}

export class TrackersModule {
  private items: Map<string, TrackerItem> = new Map();

  // ----------------------------- CRUD Operations ----------------------------
  create(userId: string, input: TrackerCreateInput): TrackerItem {
    const item: TrackerItem = {
      id: generateUUID(),
      userId,
      name: input.name,
      type: input.type,
      value: input.value,
      unit: input.unit,
      category: input.category,
      tags: input.tags || [],
      streak: 0,
      createdAt: now(),
      metadata: input.metadata,
    };

    this.items.set(item.id, item);
    
    // Store in memory for cross-module access
    nexusMemory.setCrossModule(`tracker:${item.id}`, item);
    
    eventBus.emit('trackers:created', item);
    
    return item;
  }

  get(id: string): TrackerItem | undefined {
    return this.items.get(id);
  }

  update(id: string, updates: Partial<TrackerCreateInput>): TrackerItem | undefined {
    const item = this.items.get(id);
    if (!item) return undefined;

    Object.assign(item, updates);
    nexusMemory.setCrossModule(`tracker:${item.id}`, item);
    eventBus.emit('trackers:updated', item);

    return item;
  }

  delete(id: string): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    this.items.delete(id);
    nexusMemory.deleteCrossModule(`tracker:${id}`);
    eventBus.emit('trackers:deleted', { id });

    return true;
  }

  // ----------------------------- Tracking -----------------------------------
  track(id: string, value: unknown): TrackerItem | undefined {
    const item = this.items.get(id);
    if (!item) return undefined;

    const previousValue = item.value;
    item.value = value;
    
    // Update streak
    const lastTrackedDate = item.lastTracked ? new Date(item.lastTracked).toDateString() : null;
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (lastTrackedDate === today) {
      // Already tracked today, no streak change
    } else if (lastTrackedDate === yesterday) {
      item.streak++;
    } else if (!lastTrackedDate) {
      item.streak = 1;
    } else {
      item.streak = 1; // Reset streak
    }

    item.lastTracked = now();
    
    eventBus.emit('trackers:tracked', { item, previousValue, newValue: value });
    
    return item;
  }

  log(id: string, entry: { value: unknown; note?: string; timestamp?: number }): TrackerItem | undefined {
    const item = this.items.get(id);
    if (!item) return undefined;

    // Store log entry in metadata
    const logs = (item.metadata?.logs as unknown[]) || [];
    logs.push({
      value: entry.value,
      note: entry.note,
      timestamp: entry.timestamp || now(),
    });
    
    if (!item.metadata) item.metadata = {};
    item.metadata.logs = logs;

    return this.track(id, entry.value);
  }

  // ----------------------------- Query Operations ---------------------------
  filter(filter: TrackerFilter): TrackerItem[] {
    let results = Array.from(this.items.values());

    if (filter.userId) {
      results = results.filter(i => i.userId === filter.userId);
    }

    if (filter.type) {
      results = results.filter(i => i.type === filter.type);
    }

    if (filter.category) {
      results = results.filter(i => i.category === filter.category);
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(i => 
        filter.tags!.some(tag => i.tags.includes(tag))
      );
    }

    if (filter.minStreak !== undefined) {
      results = results.filter(i => i.streak >= filter.minStreak!);
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      results = results.filter(i => 
        i.name.toLowerCase().includes(searchLower) ||
        i.category?.toLowerCase().includes(searchLower) ||
        i.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }

    return results;
  }

  getByUser(userId: string): TrackerItem[] {
    return this.filter({ userId });
  }

  getByCategory(userId: string, category: string): TrackerItem[] {
    return this.filter({ userId, category });
  }

  getStreaks(userId: string, minStreak: number = 1): TrackerItem[] {
    return this.filter({ userId, minStreak })
      .sort((a, b) => b.streak - a.streak);
  }

  // ----------------------------- Analytics ----------------------------------
  getAnalytics(userId: string): {
    totalItems: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
    avgStreak: number;
    topStreaks: TrackerItem[];
    recentlyTracked: TrackerItem[];
  } {
    const items = this.getByUser(userId);
    
    const byCategory = groupBy(items, 'category');
    const byType = groupBy(items, 'type');
    
    const streaks = items.map(i => i.streak);
    const avgStreak = streaks.length > 0 
      ? streaks.reduce((a, b) => a + b, 0) / streaks.length 
      : 0;

    return {
      totalItems: items.length,
      byCategory: Object.fromEntries(
        Object.entries(byCategory).map(([k, v]) => [k || 'uncategorized', v.length])
      ),
      byType: Object.fromEntries(
        Object.entries(byType).map(([k, v]) => [k, v.length])
      ),
      avgStreak,
      topStreaks: this.getStreaks(userId).slice(0, 5),
      recentlyTracked: items
        .filter(i => i.lastTracked)
        .sort((a, b) => (b.lastTracked || 0) - (a.lastTracked || 0))
        .slice(0, 5),
    };
  }

  async detectPatterns(userId: string) {
    const items = this.getByUser(userId);
    return patternMiner.minePatterns({ trackerItems: items });
  }

  // ----------------------------- Statistics ---------------------------------
  getStats() {
    const items = Array.from(this.items.values());
    
    return {
      totalItems: items.length,
      totalUsers: new Set(items.map(i => i.userId)).size,
      avgStreakLength: items.length > 0
        ? items.reduce((sum, i) => sum + i.streak, 0) / items.length
        : 0,
      categories: new Set(items.map(i => i.category).filter(Boolean)).size,
      types: new Set(items.map(i => i.type)).size,
    };
  }
}

// Singleton instance
export const trackersModule = new TrackersModule();
export default trackersModule;


