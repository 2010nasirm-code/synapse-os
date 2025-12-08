// ============================================================================
// NEXUS PRIME - PREDICTIVE WORKFLOW ENGINE
// Anticipates user actions and pre-loads resources
// ============================================================================

import { globalEvents } from '../core/events';
import { getConfig } from '../core/config';

export interface PredictedAction {
  type: string;
  target: string;
  confidence: number;
  preloadFn?: () => Promise<void>;
}

export interface NavigationPattern {
  from: string;
  to: string;
  count: number;
  avgTimeToNavigate: number;
}

export interface ActionSequence {
  actions: string[];
  frequency: number;
  lastSeen: number;
}

export class PredictiveWorkflowEngine {
  private static instance: PredictiveWorkflowEngine;
  private navigationPatterns = new Map<string, NavigationPattern>();
  private actionSequences: ActionSequence[] = [];
  private recentActions: string[] = [];
  private preloadedRoutes = new Set<string>();
  private currentRoute: string = '/';
  private lastNavigationTime: number = 0;

  private constructor() {
    this.setupTracking();
    this.loadSavedPatterns();
  }

  static getInstance(): PredictiveWorkflowEngine {
    if (!PredictiveWorkflowEngine.instance) {
      PredictiveWorkflowEngine.instance = new PredictiveWorkflowEngine();
    }
    return PredictiveWorkflowEngine.instance;
  }

  // ----------------------------- Setup --------------------------------------
  private setupTracking(): void {
    if (typeof window === 'undefined') return;

    // Track route changes
    globalEvents.on('navigation', (data: { path: string }) => {
      this.recordNavigation(data.path);
    });

    // Track user actions
    globalEvents.on('user:action', (data: { action: string }) => {
      this.recordAction(data.action);
    });

    // Periodic pattern analysis
    setInterval(() => this.analyzePatterns(), 30000);

    // Periodic preloading
    setInterval(() => this.preloadPredictedRoutes(), 10000);
  }

  // ----------------------------- Pattern Recording --------------------------
  recordNavigation(to: string): void {
    const from = this.currentRoute;
    const now = Date.now();
    const timeTaken = now - this.lastNavigationTime;

    // Update pattern
    const key = `${from}→${to}`;
    const existing = this.navigationPatterns.get(key);

    if (existing) {
      existing.count++;
      existing.avgTimeToNavigate = 
        (existing.avgTimeToNavigate * (existing.count - 1) + timeTaken) / existing.count;
    } else {
      this.navigationPatterns.set(key, {
        from,
        to,
        count: 1,
        avgTimeToNavigate: timeTaken,
      });
    }

    this.currentRoute = to;
    this.lastNavigationTime = now;

    // Clear preloaded status for navigated route
    this.preloadedRoutes.delete(to);

    this.savePatterns();
  }

  recordAction(action: string): void {
    this.recentActions.push(action);
    
    // Keep last 50 actions
    if (this.recentActions.length > 50) {
      this.recentActions.shift();
    }

    // Check for sequences
    this.detectSequences();
  }

  private detectSequences(): void {
    const minSequenceLength = 3;
    const maxSequenceLength = 5;

    for (let len = minSequenceLength; len <= maxSequenceLength; len++) {
      if (this.recentActions.length < len) continue;

      const sequence = this.recentActions.slice(-len);
      const sequenceKey = sequence.join('→');

      // Check if this sequence exists
      const existing = this.actionSequences.find(
        s => s.actions.join('→') === sequenceKey
      );

      if (existing) {
        existing.frequency++;
        existing.lastSeen = Date.now();
      } else {
        this.actionSequences.push({
          actions: [...sequence],
          frequency: 1,
          lastSeen: Date.now(),
        });
      }
    }

    // Clean up old/infrequent sequences
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    this.actionSequences = this.actionSequences.filter(
      s => s.lastSeen > oneWeekAgo && s.frequency >= 3
    );
  }

  // ----------------------------- Prediction ---------------------------------
  predictNextNavigation(): PredictedAction | null {
    const config = getConfig().performance;
    if (!config.preloadEnabled) return null;

    // Find most likely next navigation from current route
    let bestPrediction: { to: string; confidence: number } | null = null;
    let totalFromCurrent = 0;

    for (const pattern of this.navigationPatterns.values()) {
      if (pattern.from === this.currentRoute) {
        totalFromCurrent += pattern.count;
      }
    }

    if (totalFromCurrent === 0) return null;

    for (const pattern of this.navigationPatterns.values()) {
      if (pattern.from === this.currentRoute) {
        const confidence = pattern.count / totalFromCurrent;
        
        if (!bestPrediction || confidence > bestPrediction.confidence) {
          bestPrediction = { to: pattern.to, confidence };
        }
      }
    }

    if (!bestPrediction || bestPrediction.confidence < getConfig().evolution.minConfidence) {
      return null;
    }

    return {
      type: 'navigation',
      target: bestPrediction.to,
      confidence: bestPrediction.confidence,
      preloadFn: async () => {
        await this.preloadRoute(bestPrediction!.to);
      },
    };
  }

  predictNextAction(): PredictedAction | null {
    if (this.recentActions.length < 2) return null;

    const recentSequence = this.recentActions.slice(-2).join('→');
    
    // Find sequences that start with recent actions
    const matchingSequences = this.actionSequences.filter(s => {
      const prefix = s.actions.slice(0, 2).join('→');
      return prefix === recentSequence;
    });

    if (matchingSequences.length === 0) return null;

    // Get the most frequent one
    matchingSequences.sort((a, b) => b.frequency - a.frequency);
    const best = matchingSequences[0];

    if (best.actions.length <= 2) return null;

    const nextAction = best.actions[2];
    const totalMatching = matchingSequences.reduce((sum, s) => sum + s.frequency, 0);
    const confidence = best.frequency / totalMatching;

    return {
      type: 'action',
      target: nextAction,
      confidence,
    };
  }

  // ----------------------------- Preloading ---------------------------------
  private async preloadPredictedRoutes(): Promise<void> {
    const prediction = this.predictNextNavigation();
    if (!prediction || this.preloadedRoutes.has(prediction.target)) return;

    if (prediction.confidence >= getConfig().evolution.minConfidence) {
      await this.preloadRoute(prediction.target);
    }
  }

  private async preloadRoute(route: string): Promise<void> {
    if (this.preloadedRoutes.has(route)) return;

    try {
      // Use link preload if available
      if (typeof document !== 'undefined') {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        document.head.appendChild(link);

        this.preloadedRoutes.add(route);
        globalEvents.emit('predictive:preloaded', { route });
      }
    } catch (error) {
      console.warn(`[Predictive] Failed to preload ${route}:`, error);
    }
  }

  // ----------------------------- Analysis -----------------------------------
  private analyzePatterns(): void {
    // Calculate overall prediction accuracy
    // This would be tracked over time in a real implementation

    // Emit analysis results
    globalEvents.emit('predictive:analysis', {
      navigationPatternsCount: this.navigationPatterns.size,
      actionSequencesCount: this.actionSequences.length,
      preloadedRoutesCount: this.preloadedRoutes.size,
    });
  }

  // ----------------------------- Persistence --------------------------------
  private savePatterns(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = {
        navigationPatterns: Array.from(this.navigationPatterns.entries()),
        actionSequences: this.actionSequences,
      };
      localStorage.setItem('nexus-prime-patterns', JSON.stringify(data));
    } catch (e) {
      console.warn('[Predictive] Failed to save patterns:', e);
    }
  }

  private loadSavedPatterns(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const saved = localStorage.getItem('nexus-prime-patterns');
      if (saved) {
        const data = JSON.parse(saved);
        this.navigationPatterns = new Map(data.navigationPatterns);
        this.actionSequences = data.actionSequences || [];
      }
    } catch (e) {
      console.warn('[Predictive] Failed to load patterns:', e);
    }
  }

  // ----------------------------- Getters ------------------------------------
  getNavigationPatterns(): NavigationPattern[] {
    return Array.from(this.navigationPatterns.values());
  }

  getActionSequences(): ActionSequence[] {
    return [...this.actionSequences];
  }

  getPreloadedRoutes(): string[] {
    return Array.from(this.preloadedRoutes);
  }

  getCurrentPredictions(): { navigation: PredictedAction | null; action: PredictedAction | null } {
    return {
      navigation: this.predictNextNavigation(),
      action: this.predictNextAction(),
    };
  }
}

export const predictiveEngine = PredictiveWorkflowEngine.getInstance();

