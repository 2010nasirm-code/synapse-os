// ============================================================================
// NEXUS PRIME - PATTERN AGENT
// Advanced pattern detection and analysis
// ============================================================================

import { BaseAgent, AgentTask } from './base-agent';
import { globalEvents } from '../core/events';
import { patternEngine, BehaviorPattern } from '../intelligence/pattern-recognition';

export class PatternAgent extends BaseAgent {
  private analysisResults = new Map<string, any>();

  constructor() {
    super('pattern-agent', 'Pattern Agent', 'Detects and analyzes user behavior patterns');
    this.registerCapabilities();
  }

  protected async onStart(): Promise<void> {
    // Subscribe to pattern events
    globalEvents.on('patterns:new-pattern', (pattern) => this.handleNewPattern(pattern));
    
    // Periodic deep analysis
    setInterval(() => this.runDeepAnalysis(), 5 * 60 * 1000);
  }

  protected async onStop(): Promise<void> {
    // Save analysis results
  }

  protected async processTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case 'analyze-pattern':
        return this.analyzePattern(task.data.pattern);
      case 'deep-analysis':
        return this.runDeepAnalysis();
      case 'find-correlations':
        return this.findCorrelations();
      case 'predict-behavior':
        return this.predictBehavior(task.data);
      default:
        console.warn(`[PatternAgent] Unknown task type: ${task.type}`);
    }
  }

  // ----------------------------- Capabilities -------------------------------
  private registerCapabilities(): void {
    this.registerCapability({
      name: 'analyze',
      description: 'Analyze a behavior pattern',
      handler: async (data) => this.analyzePattern(data.pattern),
    });

    this.registerCapability({
      name: 'predict',
      description: 'Predict user behavior',
      handler: async (data) => this.predictBehavior(data),
    });

    this.registerCapability({
      name: 'correlate',
      description: 'Find pattern correlations',
      handler: async () => this.findCorrelations(),
    });
  }

  // ----------------------------- Event Handlers -----------------------------
  private handleNewPattern(pattern: BehaviorPattern): void {
    this.addTask({
      type: 'analyze-pattern',
      priority: 'normal',
      data: { pattern },
    });
  }

  // ----------------------------- Analysis -----------------------------------
  private async analyzePattern(pattern: BehaviorPattern): Promise<{
    significance: string;
    actionable: boolean;
    suggestions: string[];
  }> {
    const suggestions: string[] = [];
    let significance = 'low';
    let actionable = false;

    // Analyze based on pattern type
    switch (pattern.type) {
      case 'sequential':
        if (pattern.occurrences >= 10) {
          significance = 'high';
          actionable = true;
          suggestions.push('Create keyboard shortcut for this sequence');
          suggestions.push('Add quick action button');
        } else if (pattern.occurrences >= 5) {
          significance = 'medium';
          suggestions.push('Monitor for workflow optimization opportunity');
        }
        break;

      case 'temporal':
        significance = 'medium';
        actionable = true;
        suggestions.push('Adjust UI for time-of-day patterns');
        suggestions.push('Schedule notifications optimally');
        break;

      case 'frequency':
        if (pattern.confidence >= 0.8) {
          significance = 'high';
          actionable = true;
          suggestions.push('Optimize performance for frequent actions');
          suggestions.push('Preload related resources');
        }
        break;

      case 'preference':
        significance = 'medium';
        actionable = true;
        suggestions.push('Apply preference automatically');
        break;
    }

    const result = { significance, actionable, suggestions };
    this.analysisResults.set(pattern.id, result);

    globalEvents.emit('pattern:analysis-complete', { pattern, result });

    return result;
  }

  private async runDeepAnalysis(): Promise<{
    patternClusters: any[];
    insights: string[];
    recommendations: string[];
  }> {
    const patterns = patternEngine.getPatterns();
    const patternClusters: any[] = [];
    const insights: string[] = [];
    const recommendations: string[] = [];

    // Group patterns by type
    const byType = new Map<string, BehaviorPattern[]>();
    for (const pattern of patterns) {
      const existing = byType.get(pattern.type) || [];
      existing.push(pattern);
      byType.set(pattern.type, existing);
    }

    // Analyze each group
    for (const [type, group] of byType) {
      if (group.length >= 3) {
        patternClusters.push({
          type,
          count: group.length,
          avgConfidence: group.reduce((sum, p) => sum + p.confidence, 0) / group.length,
        });
      }
    }

    // Generate insights
    const highConfidencePatterns = patterns.filter(p => p.confidence >= 0.8);
    if (highConfidencePatterns.length > 0) {
      insights.push(`${highConfidencePatterns.length} high-confidence patterns detected`);
    }

    const sequentialPatterns = patterns.filter(p => p.type === 'sequential');
    if (sequentialPatterns.length >= 5) {
      insights.push('User follows consistent workflows');
      recommendations.push('Consider creating workflow templates');
    }

    const temporalPatterns = patterns.filter(p => p.type === 'temporal');
    if (temporalPatterns.length > 0) {
      insights.push('Time-based usage patterns detected');
      recommendations.push('Enable temporal UI adaptations');
    }

    globalEvents.emit('pattern:deep-analysis-complete', {
      patternClusters,
      insights,
      recommendations,
    });

    return { patternClusters, insights, recommendations };
  }

  private async findCorrelations(): Promise<Array<{
    patterns: [string, string];
    correlation: number;
    type: string;
  }>> {
    const patterns = patternEngine.getPatterns();
    const correlations: Array<{
      patterns: [string, string];
      correlation: number;
      type: string;
    }> = [];

    // Find patterns that often occur together
    for (let i = 0; i < patterns.length; i++) {
      for (let j = i + 1; j < patterns.length; j++) {
        const p1 = patterns[i];
        const p2 = patterns[j];

        // Check temporal correlation
        const timeDiff = Math.abs(p1.lastSeen - p2.lastSeen);
        if (timeDiff < 60000) { // Within 1 minute
          correlations.push({
            patterns: [p1.id, p2.id],
            correlation: 1 - (timeDiff / 60000),
            type: 'temporal',
          });
        }

        // Check type correlation
        if (p1.type === p2.type && p1.confidence > 0.5 && p2.confidence > 0.5) {
          correlations.push({
            patterns: [p1.id, p2.id],
            correlation: (p1.confidence + p2.confidence) / 2,
            type: 'similarity',
          });
        }
      }
    }

    return correlations.sort((a, b) => b.correlation - a.correlation);
  }

  private async predictBehavior(data: {
    context: string;
    history: string[];
  }): Promise<{
    predictions: Array<{ action: string; probability: number }>;
    confidence: number;
  }> {
    const patterns = patternEngine.getPatterns();
    const predictions: Array<{ action: string; probability: number }> = [];

    // Look for matching sequential patterns
    for (const pattern of patterns.filter(p => p.type === 'sequential')) {
      const sequence = pattern.data.sequence?.split('→') || [];
      const historyEnd = data.history.slice(-2);

      // Check if current history matches start of sequence
      if (sequence.length >= 3) {
        const matches = historyEnd.every((h, i) => 
          sequence[i]?.toLowerCase().includes(h.toLowerCase())
        );

        if (matches && sequence[2]) {
          predictions.push({
            action: sequence[2],
            probability: pattern.confidence,
          });
        }
      }
    }

    // Sort by probability
    predictions.sort((a, b) => b.probability - a.probability);

    return {
      predictions: predictions.slice(0, 5),
      confidence: predictions[0]?.probability || 0,
    };
  }

  // ----------------------------- Getters ------------------------------------
  getAnalysisResults(): Map<string, any> {
    return new Map(this.analysisResults);
  }
}

