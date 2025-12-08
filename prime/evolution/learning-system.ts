// ============================================================================
// NEXUS PRIME - LEARNING SYSTEM
// Continuous system improvement through usage analysis
// ============================================================================

import { globalEvents } from '../core/events';
import { globalState } from '../core/state';

export interface LearningData {
  interactions: InteractionData[];
  preferences: Map<string, number>;
  successRates: Map<string, { success: number; total: number }>;
  timingPatterns: Map<string, number[]>;
}

export interface InteractionData {
  type: string;
  target: string;
  timestamp: number;
  duration: number;
  success: boolean;
  context: Record<string, any>;
}

export interface LearningInsight {
  id: string;
  type: 'optimization' | 'warning' | 'suggestion' | 'pattern';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  action?: () => void;
  createdAt: number;
}

export class LearningSystem {
  private static instance: LearningSystem;
  private data: LearningData;
  private insights: Map<string, LearningInsight> = new Map();
  private learningRate: number = 0.1;

  private constructor() {
    this.data = this.initializeData();
    this.setupTracking();
    this.startLearningLoop();
  }

  static getInstance(): LearningSystem {
    if (!LearningSystem.instance) {
      LearningSystem.instance = new LearningSystem();
    }
    return LearningSystem.instance;
  }

  // ----------------------------- Setup --------------------------------------
  private initializeData(): LearningData {
    return {
      interactions: [],
      preferences: new Map(),
      successRates: new Map(),
      timingPatterns: new Map(),
    };
  }

  private setupTracking(): void {
    // Track all user interactions
    globalEvents.on('user:action', (data) => {
      this.recordInteraction({
        type: data.type,
        target: data.target,
        timestamp: Date.now(),
        duration: data.duration || 0,
        success: data.success !== false,
        context: data.context || {},
      });
    });

    // Track feature usage
    globalEvents.on('feature:used', (data) => {
      this.recordFeatureUsage(data.featureId, data.success);
    });

    // Track preferences
    globalEvents.on('preference:changed', (data) => {
      this.updatePreference(data.key, data.value);
    });
  }

  // ----------------------------- Data Recording -----------------------------
  recordInteraction(interaction: InteractionData): void {
    this.data.interactions.push(interaction);

    // Keep last 10000 interactions
    if (this.data.interactions.length > 10000) {
      this.data.interactions = this.data.interactions.slice(-5000);
    }

    // Update success rate
    const key = `${interaction.type}:${interaction.target}`;
    let rate = this.data.successRates.get(key) || { success: 0, total: 0 };
    rate.total++;
    if (interaction.success) rate.success++;
    this.data.successRates.set(key, rate);

    // Update timing patterns
    const hour = new Date(interaction.timestamp).getHours();
    let times = this.data.timingPatterns.get(interaction.type) || [];
    times.push(hour);
    if (times.length > 100) times = times.slice(-50);
    this.data.timingPatterns.set(interaction.type, times);
  }

  recordFeatureUsage(featureId: string, success: boolean): void {
    let rate = this.data.successRates.get(`feature:${featureId}`) || { success: 0, total: 0 };
    rate.total++;
    if (success) rate.success++;
    this.data.successRates.set(`feature:${featureId}`, rate);
  }

  updatePreference(key: string, value: any): void {
    // Convert value to numeric score
    const score = typeof value === 'boolean' 
      ? (value ? 1 : 0) 
      : (typeof value === 'number' ? value : 0.5);
    
    // Weighted update
    const current = this.data.preferences.get(key) || 0.5;
    const newValue = current * (1 - this.learningRate) + score * this.learningRate;
    this.data.preferences.set(key, newValue);
  }

  // ----------------------------- Learning Loop ------------------------------
  private startLearningLoop(): void {
    // Analyze every 5 minutes
    setInterval(() => this.analyze(), 5 * 60 * 1000);
  }

  private async analyze(): Promise<void> {
    const newInsights: LearningInsight[] = [];

    // Analyze success rates
    for (const [key, rate] of this.data.successRates) {
      if (rate.total >= 10 && rate.success / rate.total < 0.5) {
        newInsights.push({
          id: `insight-lowsuccess-${key}`,
          type: 'warning',
          title: `Low Success Rate: ${key}`,
          description: `Only ${Math.round((rate.success / rate.total) * 100)}% success rate over ${rate.total} attempts`,
          confidence: Math.min(0.9, rate.total / 50),
          actionable: true,
          action: () => {
            globalEvents.emit('learning:improve-feature', { key });
          },
          createdAt: Date.now(),
        });
      }
    }

    // Analyze timing patterns
    for (const [type, times] of this.data.timingPatterns) {
      if (times.length >= 20) {
        const peakHour = this.findPeakHour(times);
        newInsights.push({
          id: `insight-timing-${type}`,
          type: 'pattern',
          title: `Peak Usage: ${type}`,
          description: `Most common usage at ${peakHour}:00`,
          confidence: 0.7,
          actionable: false,
          createdAt: Date.now(),
        });
      }
    }

    // Analyze preferences
    for (const [key, score] of this.data.preferences) {
      if (score > 0.8) {
        newInsights.push({
          id: `insight-pref-${key}`,
          type: 'suggestion',
          title: `Strong Preference: ${key}`,
          description: `User strongly prefers this setting (${Math.round(score * 100)}% confidence)`,
          confidence: score,
          actionable: true,
          action: () => {
            globalEvents.emit('learning:apply-preference', { key, value: true });
          },
          createdAt: Date.now(),
        });
      } else if (score < 0.2) {
        newInsights.push({
          id: `insight-pref-${key}`,
          type: 'suggestion',
          title: `Avoidance: ${key}`,
          description: `User avoids this setting (${Math.round((1 - score) * 100)}% confidence)`,
          confidence: 1 - score,
          actionable: true,
          action: () => {
            globalEvents.emit('learning:apply-preference', { key, value: false });
          },
          createdAt: Date.now(),
        });
      }
    }

    // Store insights
    for (const insight of newInsights) {
      this.insights.set(insight.id, insight);
    }

    // Emit insights
    if (newInsights.length > 0) {
      globalEvents.emit('learning:insights-generated', newInsights);
    }

    // Auto-apply high-confidence actionable insights
    for (const insight of newInsights) {
      if (insight.actionable && insight.confidence > 0.85 && insight.action) {
        insight.action();
        globalEvents.emit('learning:insight-applied', insight);
      }
    }
  }

  private findPeakHour(times: number[]): number {
    const counts = new Map<number, number>();
    for (const time of times) {
      counts.set(time, (counts.get(time) || 0) + 1);
    }

    let peakHour = 12;
    let maxCount = 0;
    for (const [hour, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        peakHour = hour;
      }
    }

    return peakHour;
  }

  // ----------------------------- Queries ------------------------------------
  getSuccessRate(key: string): number {
    const rate = this.data.successRates.get(key);
    if (!rate || rate.total === 0) return 1;
    return rate.success / rate.total;
  }

  getPreference(key: string): number {
    return this.data.preferences.get(key) || 0.5;
  }

  getInsights(): LearningInsight[] {
    return Array.from(this.insights.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  getActionableInsights(): LearningInsight[] {
    return this.getInsights().filter(i => i.actionable);
  }

  // ----------------------------- Learning Control ---------------------------
  setLearningRate(rate: number): void {
    this.learningRate = Math.max(0.01, Math.min(0.5, rate));
  }

  clearLearningData(): void {
    this.data = this.initializeData();
    this.insights.clear();
    globalEvents.emit('learning:data-cleared');
  }
}

export const learningSystem = LearningSystem.getInstance();

