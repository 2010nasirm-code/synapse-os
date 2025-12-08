// ============================================================================
// NEXUS BRAIN - Pattern Miner
// Detects patterns from user data and behavior
// ============================================================================

import { Pattern, TrackerItem, AnalyticsEvent } from '../../types';
import { generateUUID, now, groupBy, average, standardDeviation } from '../../utils';
import { getConfig } from '../../config';
import { eventBus, NexusEvents } from '../../core/engine';

export interface PatternInput {
  trackerItems?: TrackerItem[];
  events?: AnalyticsEvent[];
  customData?: Record<string, unknown>[];
}

export type PatternType = 
  | 'frequency'    // How often something occurs
  | 'sequence'     // Order of events
  | 'temporal'     // Time-based patterns
  | 'correlation'  // Related items
  | 'trend'        // Increasing/decreasing
  | 'anomaly'      // Unusual behavior
  | 'cluster';     // Grouped items

export interface DetectedPattern extends Pattern {
  examples: unknown[];
  strength: number;
}

export class PatternMiner {
  private patterns: Map<string, DetectedPattern> = new Map();
  private config = getConfig();

  // ----------------------------- Pattern Detection --------------------------
  async minePatterns(input: PatternInput): Promise<DetectedPattern[]> {
    const detected: DetectedPattern[] = [];

    // Mine different pattern types
    if (input.trackerItems?.length) {
      detected.push(...this.mineTrackerPatterns(input.trackerItems));
    }

    if (input.events?.length) {
      detected.push(...this.mineEventPatterns(input.events));
    }

    if (input.customData?.length) {
      detected.push(...this.mineCustomPatterns(input.customData));
    }

    // Filter by minimum frequency
    const filtered = detected.filter(
      p => p.frequency >= this.config.brain.patternMinFrequency
    );

    // Store patterns
    for (const pattern of filtered) {
      this.patterns.set(pattern.id, pattern);
      
      // Emit pattern detected event
      eventBus.emit(NexusEvents.PATTERN_DETECTED, pattern);
    }

    return filtered;
  }

  // ----------------------------- Tracker Patterns ---------------------------
  private mineTrackerPatterns(items: TrackerItem[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Frequency patterns (what categories/types are most common)
    const categoryGroups = groupBy(items, 'category');
    for (const [category, categoryItems] of Object.entries(categoryGroups)) {
      if (categoryItems.length >= 3) {
        patterns.push({
          id: generateUUID(),
          type: 'frequency',
          name: `Frequent Category: ${category}`,
          description: `${category} items are tracked frequently`,
          frequency: categoryItems.length,
          confidence: Math.min(1, categoryItems.length / 10),
          data: { category, count: categoryItems.length },
          detectedAt: now(),
          lastSeen: now(),
          examples: categoryItems.slice(0, 3),
          strength: categoryItems.length / items.length,
        });
      }
    }

    // Streak patterns
    const streakItems = items.filter(i => i.streak > 3);
    if (streakItems.length > 0) {
      patterns.push({
        id: generateUUID(),
        type: 'trend',
        name: 'Consistent Tracking',
        description: `${streakItems.length} items with strong streaks`,
        frequency: streakItems.length,
        confidence: average(streakItems.map(i => Math.min(1, i.streak / 30))),
        data: { 
          items: streakItems.map(i => ({ id: i.id, name: i.name, streak: i.streak })),
          avgStreak: average(streakItems.map(i => i.streak)),
        },
        detectedAt: now(),
        lastSeen: now(),
        examples: streakItems.slice(0, 3),
        strength: average(streakItems.map(i => Math.min(1, i.streak / 30))),
      });
    }

    // Type patterns
    const typeGroups = groupBy(items, 'type');
    for (const [type, typeItems] of Object.entries(typeGroups)) {
      if (typeItems.length >= 3) {
        patterns.push({
          id: generateUUID(),
          type: 'cluster',
          name: `Item Type: ${type}`,
          description: `Cluster of ${type} items`,
          frequency: typeItems.length,
          confidence: typeItems.length / items.length,
          data: { type, count: typeItems.length },
          detectedAt: now(),
          lastSeen: now(),
          examples: typeItems.slice(0, 3),
          strength: typeItems.length / items.length,
        });
      }
    }

    return patterns;
  }

  // ----------------------------- Event Patterns -----------------------------
  private mineEventPatterns(events: AnalyticsEvent[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Sort events by timestamp
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

    // Temporal patterns (time of day)
    const hourGroups = new Map<number, AnalyticsEvent[]>();
    for (const event of sorted) {
      const hour = new Date(event.timestamp).getHours();
      if (!hourGroups.has(hour)) hourGroups.set(hour, []);
      hourGroups.get(hour)!.push(event);
    }

    // Find peak hours
    let maxCount = 0;
    let peakHour = 0;
    const hourEntries = Array.from(hourGroups.entries());
    for (const [hour, hourEvents] of hourEntries) {
      if (hourEvents.length > maxCount) {
        maxCount = hourEvents.length;
        peakHour = hour;
      }
    }

    if (maxCount >= 5) {
      patterns.push({
        id: generateUUID(),
        type: 'temporal',
        name: 'Peak Activity Time',
        description: `Most active around ${peakHour}:00`,
        frequency: maxCount,
        confidence: maxCount / events.length,
        data: { peakHour, eventCount: maxCount },
        detectedAt: now(),
        lastSeen: now(),
        examples: (hourGroups.get(peakHour) || []).slice(0, 3),
        strength: maxCount / events.length,
      });
    }

    // Sequence patterns
    const sequences = this.findSequences(sorted);
    for (const seq of sequences) {
      if (seq.count >= 3) {
        patterns.push({
          id: generateUUID(),
          type: 'sequence',
          name: `Common Sequence: ${seq.sequence.join(' → ')}`,
          description: `This action sequence occurs frequently`,
          frequency: seq.count,
          confidence: seq.count / events.length,
          data: { sequence: seq.sequence, count: seq.count },
          detectedAt: now(),
          lastSeen: now(),
          examples: seq.examples,
          strength: seq.count / events.length,
        });
      }
    }

    // Event type frequency
    const typeGroups = groupBy(events, 'type');
    for (const [type, typeEvents] of Object.entries(typeGroups)) {
      if (typeEvents.length >= 5) {
        patterns.push({
          id: generateUUID(),
          type: 'frequency',
          name: `Frequent Event: ${type}`,
          description: `${type} events occur often`,
          frequency: typeEvents.length,
          confidence: typeEvents.length / events.length,
          data: { eventType: type, count: typeEvents.length },
          detectedAt: now(),
          lastSeen: now(),
          examples: typeEvents.slice(0, 3),
          strength: typeEvents.length / events.length,
        });
      }
    }

    return patterns;
  }

  private findSequences(events: AnalyticsEvent[]): { sequence: string[]; count: number; examples: unknown[] }[] {
    const seqCounts = new Map<string, { count: number; examples: unknown[] }>();
    
    // Find 2 and 3-event sequences
    for (let i = 0; i < events.length - 1; i++) {
      // 2-event sequence
      const seq2 = [events[i].type, events[i + 1].type];
      const key2 = seq2.join('|');
      if (!seqCounts.has(key2)) {
        seqCounts.set(key2, { count: 0, examples: [] });
      }
      const entry2 = seqCounts.get(key2)!;
      entry2.count++;
      if (entry2.examples.length < 3) {
        entry2.examples.push([events[i], events[i + 1]]);
      }

      // 3-event sequence
      if (i < events.length - 2) {
        const seq3 = [events[i].type, events[i + 1].type, events[i + 2].type];
        const key3 = seq3.join('|');
        if (!seqCounts.has(key3)) {
          seqCounts.set(key3, { count: 0, examples: [] });
        }
        const entry3 = seqCounts.get(key3)!;
        entry3.count++;
        if (entry3.examples.length < 3) {
          entry3.examples.push([events[i], events[i + 1], events[i + 2]]);
        }
      }
    }

    return Array.from(seqCounts.entries())
      .map(([key, data]) => ({
        sequence: key.split('|'),
        count: data.count,
        examples: data.examples,
      }))
      .filter(s => s.count >= 3)
      .sort((a, b) => b.count - a.count);
  }

  // ----------------------------- Custom Patterns ----------------------------
  private mineCustomPatterns(data: Record<string, unknown>[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    if (data.length === 0) return patterns;

    // Analyze numeric fields for trends
    const sample = data[0];
    for (const key of Object.keys(sample)) {
      const values = data
        .map(d => d[key])
        .filter((v): v is number => typeof v === 'number');

      if (values.length >= 5) {
        const avg = average(values);
        const std = standardDeviation(values);

        // Check for anomalies
        const anomalies = values.filter(v => Math.abs(v - avg) > 2 * std);
        if (anomalies.length > 0) {
          patterns.push({
            id: generateUUID(),
            type: 'anomaly',
            name: `Anomalies in ${key}`,
            description: `${anomalies.length} unusual values detected in ${key}`,
            frequency: anomalies.length,
            confidence: 0.7,
            data: { field: key, anomalies, avg, std },
            detectedAt: now(),
            lastSeen: now(),
            examples: anomalies.slice(0, 3),
            strength: anomalies.length / values.length,
          });
        }

        // Check for trends
        if (values.length >= 10) {
          const firstHalf = average(values.slice(0, values.length / 2));
          const secondHalf = average(values.slice(values.length / 2));
          const change = (secondHalf - firstHalf) / firstHalf;

          if (Math.abs(change) > 0.2) {
            patterns.push({
              id: generateUUID(),
              type: 'trend',
              name: `${change > 0 ? 'Increasing' : 'Decreasing'} ${key}`,
              description: `${key} has ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change * 100).toFixed(0)}%`,
              frequency: values.length,
              confidence: Math.min(1, Math.abs(change)),
              data: { field: key, change, firstHalf, secondHalf },
              detectedAt: now(),
              lastSeen: now(),
              examples: values.slice(-3),
              strength: Math.abs(change),
            });
          }
        }
      }
    }

    return patterns;
  }

  // ----------------------------- Pattern Management -------------------------
  getPattern(id: string): DetectedPattern | undefined {
    return this.patterns.get(id);
  }

  getAllPatterns(): DetectedPattern[] {
    return Array.from(this.patterns.values());
  }

  getPatternsByType(type: PatternType): DetectedPattern[] {
    return this.getAllPatterns().filter(p => p.type === type);
  }

  clearPatterns(): void {
    this.patterns.clear();
  }

  // ----------------------------- Statistics ---------------------------------
  getStats() {
    const patterns = this.getAllPatterns();
    const byType = groupBy(patterns, 'type');

    return {
      totalPatterns: patterns.length,
      byType: Object.fromEntries(
        Object.entries(byType).map(([type, items]) => [type, items.length])
      ),
      avgConfidence: average(patterns.map(p => p.confidence)),
      avgStrength: average(patterns.map(p => p.strength)),
    };
  }
}

// Singleton instance
export const patternMiner = new PatternMiner();


