// ============================================================================
// NEXUS PRIME - PATTERN RECOGNITION ENGINE
// Detects user behavior patterns for system adaptation
// ============================================================================

import { globalEvents } from '../core/events';
import { globalState } from '../core/state';

export interface BehaviorPattern {
  id: string;
  type: 'temporal' | 'sequential' | 'frequency' | 'preference';
  name: string;
  confidence: number;
  data: Record<string, any>;
  detectedAt: number;
  lastSeen: number;
  occurrences: number;
}

export interface TemporalPattern {
  hour: number;
  dayOfWeek: number;
  activity: string;
  frequency: number;
}

export interface UserPreference {
  key: string;
  value: any;
  confidence: number;
  source: 'explicit' | 'inferred';
}

export class PatternRecognitionEngine {
  private static instance: PatternRecognitionEngine;
  private patterns: Map<string, BehaviorPattern> = new Map();
  private temporalData: TemporalPattern[] = [];
  private inferredPreferences: Map<string, UserPreference> = new Map();
  private eventBuffer: Array<{ type: string; data: any; timestamp: number }> = [];

  private constructor() {
    this.setupListeners();
    this.loadSavedData();
    this.startAnalysisLoop();
  }

  static getInstance(): PatternRecognitionEngine {
    if (!PatternRecognitionEngine.instance) {
      PatternRecognitionEngine.instance = new PatternRecognitionEngine();
    }
    return PatternRecognitionEngine.instance;
  }

  // ----------------------------- Setup --------------------------------------
  private setupListeners(): void {
    // Listen to all user interactions
    globalEvents.on('*', (event) => {
      if (event.type.startsWith('user:') || event.type.startsWith('ui:')) {
        this.recordEvent(event.type, event.payload);
      }
    });
  }

  private recordEvent(type: string, data: any): void {
    this.eventBuffer.push({
      type,
      data,
      timestamp: Date.now(),
    });

    // Keep buffer manageable
    if (this.eventBuffer.length > 1000) {
      this.eventBuffer = this.eventBuffer.slice(-500);
    }
  }

  // ----------------------------- Analysis Loop ------------------------------
  private startAnalysisLoop(): void {
    // Run analysis every minute
    setInterval(() => this.runAnalysis(), 60000);
  }

  private async runAnalysis(): Promise<void> {
    await Promise.all([
      this.analyzeTemporalPatterns(),
      this.analyzeSequentialPatterns(),
      this.analyzeFrequencyPatterns(),
      this.inferPreferences(),
    ]);

    // Update global state with detected patterns
    globalState.setKey('user', prev => ({
      ...prev,
      patterns: Array.from(this.patterns.values()),
    }));

    // Emit analysis complete
    globalEvents.emit('patterns:analysis-complete', {
      patternsCount: this.patterns.size,
      preferencesCount: this.inferredPreferences.size,
    });
  }

  // ----------------------------- Temporal Analysis --------------------------
  private async analyzeTemporalPatterns(): Promise<void> {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // Group events by hour
    const hourlyActivity = new Map<number, number>();
    const recentEvents = this.eventBuffer.filter(
      e => Date.now() - e.timestamp < 24 * 60 * 60 * 1000
    );

    for (const event of recentEvents) {
      const eventHour = new Date(event.timestamp).getHours();
      hourlyActivity.set(eventHour, (hourlyActivity.get(eventHour) || 0) + 1);
    }

    // Detect peak activity hours
    let peakHour = 0;
    let peakCount = 0;
    for (const [h, count] of hourlyActivity) {
      if (count > peakCount) {
        peakHour = h;
        peakCount = count;
      }
    }

    if (peakCount > 10) {
      this.addOrUpdatePattern({
        id: 'temporal-peak-hour',
        type: 'temporal',
        name: 'Peak Activity Hour',
        confidence: Math.min(0.9, peakCount / 50),
        data: { peakHour, activityCount: peakCount },
        detectedAt: Date.now(),
        lastSeen: Date.now(),
        occurrences: 1,
      });
    }

    // Determine temporal mode
    let temporalMode: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 5 && hour < 12) temporalMode = 'morning';
    else if (hour >= 12 && hour < 17) temporalMode = 'afternoon';
    else if (hour >= 17 && hour < 21) temporalMode = 'evening';
    else temporalMode = 'night';

    globalState.setKey('ui', prev => ({
      ...prev,
      temporalMode,
    }));
  }

  // ----------------------------- Sequential Analysis ------------------------
  private async analyzeSequentialPatterns(): Promise<void> {
    const recentEvents = this.eventBuffer.slice(-100);
    const sequences = new Map<string, number>();

    // Look for 3-event sequences
    for (let i = 0; i < recentEvents.length - 2; i++) {
      const sequence = [
        recentEvents[i].type,
        recentEvents[i + 1].type,
        recentEvents[i + 2].type,
      ].join('→');

      sequences.set(sequence, (sequences.get(sequence) || 0) + 1);
    }

    // Find significant sequences
    for (const [sequence, count] of sequences) {
      if (count >= 3) {
        const patternId = `seq-${sequence.replace(/[^a-z0-9]/gi, '-')}`;
        
        this.addOrUpdatePattern({
          id: patternId,
          type: 'sequential',
          name: `Sequence: ${sequence}`,
          confidence: Math.min(0.9, count / 10),
          data: { sequence, count },
          detectedAt: Date.now(),
          lastSeen: Date.now(),
          occurrences: count,
        });
      }
    }
  }

  // ----------------------------- Frequency Analysis -------------------------
  private async analyzeFrequencyPatterns(): Promise<void> {
    const eventCounts = new Map<string, number>();
    const recentEvents = this.eventBuffer.filter(
      e => Date.now() - e.timestamp < 60 * 60 * 1000 // Last hour
    );

    for (const event of recentEvents) {
      eventCounts.set(event.type, (eventCounts.get(event.type) || 0) + 1);
    }

    // Find high-frequency events
    for (const [eventType, count] of eventCounts) {
      if (count >= 20) { // More than 20 times per hour
        this.addOrUpdatePattern({
          id: `freq-${eventType}`,
          type: 'frequency',
          name: `High Frequency: ${eventType}`,
          confidence: Math.min(0.9, count / 100),
          data: { eventType, countPerHour: count },
          detectedAt: Date.now(),
          lastSeen: Date.now(),
          occurrences: count,
        });
      }
    }
  }

  // ----------------------------- Preference Inference -----------------------
  private async inferPreferences(): Promise<void> {
    // Infer theme preference
    const themeClicks = this.eventBuffer.filter(
      e => e.type.includes('theme')
    );
    
    const darkClicks = themeClicks.filter(e => 
      e.data?.theme === 'dark' || e.data?.action?.includes('dark')
    ).length;
    
    const lightClicks = themeClicks.filter(e => 
      e.data?.theme === 'light' || e.data?.action?.includes('light')
    ).length;

    if (darkClicks > lightClicks && darkClicks >= 3) {
      this.setInferredPreference('theme', 'dark', darkClicks / (darkClicks + lightClicks));
    } else if (lightClicks > darkClicks && lightClicks >= 3) {
      this.setInferredPreference('theme', 'light', lightClicks / (darkClicks + lightClicks));
    }

    // Infer sidebar preference
    const sidebarEvents = this.eventBuffer.filter(e => e.type.includes('sidebar'));
    const collapseEvents = sidebarEvents.filter(e => e.data?.collapsed === true).length;
    const expandEvents = sidebarEvents.filter(e => e.data?.collapsed === false).length;

    if (collapseEvents > expandEvents * 2) {
      this.setInferredPreference('sidebarCollapsed', true, 0.7);
    }
  }

  private setInferredPreference(key: string, value: any, confidence: number): void {
    this.inferredPreferences.set(key, {
      key,
      value,
      confidence,
      source: 'inferred',
    });

    globalEvents.emit('patterns:preference-inferred', { key, value, confidence });
  }

  // ----------------------------- Pattern Management -------------------------
  private addOrUpdatePattern(pattern: BehaviorPattern): void {
    const existing = this.patterns.get(pattern.id);

    if (existing) {
      existing.lastSeen = pattern.lastSeen;
      existing.occurrences += 1;
      existing.confidence = Math.min(0.95, existing.confidence + 0.05);
      existing.data = { ...existing.data, ...pattern.data };
    } else {
      this.patterns.set(pattern.id, pattern);
      globalEvents.emit('patterns:new-pattern', pattern);
    }
  }

  // ----------------------------- Persistence --------------------------------
  private loadSavedData(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const saved = localStorage.getItem('nexus-prime-patterns-data');
      if (saved) {
        const data = JSON.parse(saved);
        this.patterns = new Map(data.patterns || []);
        this.inferredPreferences = new Map(data.preferences || []);
      }
    } catch (e) {
      console.warn('[Patterns] Failed to load saved data:', e);
    }
  }

  saveData(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = {
        patterns: Array.from(this.patterns.entries()),
        preferences: Array.from(this.inferredPreferences.entries()),
      };
      localStorage.setItem('nexus-prime-patterns-data', JSON.stringify(data));
    } catch (e) {
      console.warn('[Patterns] Failed to save data:', e);
    }
  }

  // ----------------------------- Getters ------------------------------------
  getPatterns(): BehaviorPattern[] {
    return Array.from(this.patterns.values());
  }

  getPatternsByType(type: BehaviorPattern['type']): BehaviorPattern[] {
    return this.getPatterns().filter(p => p.type === type);
  }

  getInferredPreferences(): UserPreference[] {
    return Array.from(this.inferredPreferences.values());
  }

  getPreference(key: string): UserPreference | undefined {
    return this.inferredPreferences.get(key);
  }

  hasHighConfidencePattern(type: BehaviorPattern['type']): boolean {
    return this.getPatternsByType(type).some(p => p.confidence >= 0.7);
  }
}

export const patternEngine = PatternRecognitionEngine.getInstance();

