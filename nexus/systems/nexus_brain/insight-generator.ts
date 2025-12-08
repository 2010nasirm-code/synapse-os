// ============================================================================
// NEXUS BRAIN - Insight Generator
// Transforms patterns into actionable insights
// ============================================================================

import { Insight, Pattern, UserProfile } from '../../types';
import { generateUUID, now, average } from '../../utils';
import { getConfig } from '../../config';
import { eventBus, NexusEvents } from '../../core/engine';
import { DetectedPattern } from './pattern-miner';

export interface InsightContext {
  patterns: DetectedPattern[];
  userProfile?: UserProfile;
  historicalInsights?: Insight[];
  constraints?: string[];
}

export interface InsightGeneratorOptions {
  maxInsights?: number;
  minConfidence?: number;
  includePredictions?: boolean;
  includeRecommendations?: boolean;
}

export class InsightGenerator {
  private insights: Map<string, Insight> = new Map();
  private config = getConfig();

  private defaultOptions: Required<InsightGeneratorOptions> = {
    maxInsights: 10,
    minConfidence: 0.5,
    includePredictions: true,
    includeRecommendations: true,
  };

  // ----------------------------- Insight Generation -------------------------
  async generateInsights(
    context: InsightContext,
    options: InsightGeneratorOptions = {}
  ): Promise<Insight[]> {
    const opts = { ...this.defaultOptions, ...options };
    const generated: Insight[] = [];

    // Generate insights from patterns
    for (const pattern of context.patterns) {
      const patternInsights = this.generateFromPattern(pattern, context);
      generated.push(...patternInsights);
    }

    // Generate cross-pattern insights
    if (context.patterns.length > 1) {
      const crossInsights = this.generateCrossPatternInsights(context.patterns);
      generated.push(...crossInsights);
    }

    // Generate predictions if enabled
    if (opts.includePredictions) {
      const predictions = this.generatePredictions(context);
      generated.push(...predictions);
    }

    // Generate recommendations if enabled
    if (opts.includeRecommendations) {
      const recommendations = this.generateRecommendations(context);
      generated.push(...recommendations);
    }

    // Filter by confidence
    const filtered = generated.filter(i => i.confidence >= opts.minConfidence);

    // Sort by impact and confidence
    const sorted = filtered.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      const impactDiff = impactOrder[b.impact] - impactOrder[a.impact];
      if (impactDiff !== 0) return impactDiff;
      return b.confidence - a.confidence;
    });

    // Take top insights
    const topInsights = sorted.slice(0, opts.maxInsights);

    // Store and emit insights
    for (const insight of topInsights) {
      this.insights.set(insight.id, insight);
      eventBus.emit(NexusEvents.INSIGHT_GENERATED, insight);
    }

    return topInsights;
  }

  // ----------------------------- Pattern-based Insights ---------------------
  private generateFromPattern(
    pattern: DetectedPattern,
    context: InsightContext
  ): Insight[] {
    const insights: Insight[] = [];

    switch (pattern.type) {
      case 'frequency':
        insights.push(this.createFrequencyInsight(pattern));
        break;
      case 'sequence':
        insights.push(this.createSequenceInsight(pattern));
        break;
      case 'temporal':
        insights.push(this.createTemporalInsight(pattern));
        break;
      case 'trend':
        insights.push(this.createTrendInsight(pattern));
        break;
      case 'anomaly':
        insights.push(this.createAnomalyInsight(pattern));
        break;
      case 'cluster':
        insights.push(this.createClusterInsight(pattern));
        break;
      case 'correlation':
        insights.push(this.createCorrelationInsight(pattern));
        break;
    }

    return insights;
  }

  private createFrequencyInsight(pattern: DetectedPattern): Insight {
    return {
      id: generateUUID(),
      type: 'trend',
      title: pattern.name,
      description: `${pattern.description}. This occurs ${pattern.frequency} times with ${(pattern.confidence * 100).toFixed(0)}% consistency.`,
      confidence: pattern.confidence,
      impact: pattern.strength > 0.5 ? 'high' : pattern.strength > 0.2 ? 'medium' : 'low',
      data: pattern.data,
      patterns: [pattern.id],
      createdAt: now(),
    };
  }

  private createSequenceInsight(pattern: DetectedPattern): Insight {
    const sequence = (pattern.data as { sequence: string[] }).sequence;
    return {
      id: generateUUID(),
      type: 'correlation',
      title: 'Behavioral Sequence Detected',
      description: `You tend to follow a pattern: ${sequence.join(' → ')}. This happens ${pattern.frequency} times.`,
      confidence: pattern.confidence,
      impact: sequence.length > 2 ? 'high' : 'medium',
      data: pattern.data,
      patterns: [pattern.id],
      createdAt: now(),
    };
  }

  private createTemporalInsight(pattern: DetectedPattern): Insight {
    const peakHour = (pattern.data as { peakHour: number }).peakHour;
    return {
      id: generateUUID(),
      type: 'trend',
      title: 'Peak Activity Time',
      description: `Your most productive time is around ${peakHour}:00. Consider scheduling important tasks during this window.`,
      confidence: pattern.confidence,
      impact: 'high',
      data: pattern.data,
      patterns: [pattern.id],
      createdAt: now(),
    };
  }

  private createTrendInsight(pattern: DetectedPattern): Insight {
    const change = (pattern.data as { change?: number }).change || 0;
    const isPositive = change > 0;
    
    return {
      id: generateUUID(),
      type: 'trend',
      title: `${isPositive ? 'Positive' : 'Negative'} Trend Detected`,
      description: pattern.description || 'Trend detected in data',
      confidence: pattern.confidence,
      impact: Math.abs(change) > 0.5 ? 'high' : 'medium',
      data: pattern.data,
      patterns: [pattern.id],
      createdAt: now(),
    };
  }

  private createAnomalyInsight(pattern: DetectedPattern): Insight {
    return {
      id: generateUUID(),
      type: 'anomaly',
      title: 'Unusual Activity Detected',
      description: pattern.description || 'Pattern detected',
      confidence: pattern.confidence,
      impact: 'medium',
      data: pattern.data,
      patterns: [pattern.id],
      createdAt: now(),
    };
  }

  private createClusterInsight(pattern: DetectedPattern): Insight {
    return {
      id: generateUUID(),
      type: 'correlation',
      title: 'Related Items Cluster',
      description: pattern.description || 'Pattern detected',
      confidence: pattern.confidence,
      impact: 'low',
      data: pattern.data,
      patterns: [pattern.id],
      createdAt: now(),
    };
  }

  private createCorrelationInsight(pattern: DetectedPattern): Insight {
    return {
      id: generateUUID(),
      type: 'correlation',
      title: 'Correlation Found',
      description: pattern.description || 'Pattern detected',
      confidence: pattern.confidence,
      impact: 'medium',
      data: pattern.data,
      patterns: [pattern.id],
      createdAt: now(),
    };
  }

  // ----------------------------- Cross-Pattern Insights ---------------------
  private generateCrossPatternInsights(patterns: DetectedPattern[]): Insight[] {
    const insights: Insight[] = [];

    // Find complementary patterns
    const temporalPatterns = patterns.filter(p => p.type === 'temporal');
    const frequencyPatterns = patterns.filter(p => p.type === 'frequency');

    if (temporalPatterns.length > 0 && frequencyPatterns.length > 0) {
      insights.push({
        id: generateUUID(),
        type: 'correlation',
        title: 'Time-Activity Correlation',
        description: `Your most frequent activities align with your peak productivity times.`,
        confidence: average([...temporalPatterns, ...frequencyPatterns].map(p => p.confidence)),
        impact: 'high',
        data: {
          temporalPatterns: temporalPatterns.map(p => p.id),
          frequencyPatterns: frequencyPatterns.map(p => p.id),
        },
        patterns: [...temporalPatterns, ...frequencyPatterns].map(p => p.id),
        createdAt: now(),
      });
    }

    // Find conflicting patterns
    const trends = patterns.filter(p => p.type === 'trend');
    const positive = trends.filter(p => ((p.data as { change?: number }).change || 0) > 0);
    const negative = trends.filter(p => ((p.data as { change?: number }).change || 0) < 0);

    if (positive.length > 0 && negative.length > 0) {
      insights.push({
        id: generateUUID(),
        type: 'anomaly',
        title: 'Mixed Trends',
        description: `Some metrics are improving while others are declining. Consider reviewing your priorities.`,
        confidence: 0.6,
        impact: 'medium',
        data: {
          positiveCount: positive.length,
          negativeCount: negative.length,
        },
        patterns: trends.map(p => p.id),
        createdAt: now(),
      });
    }

    return insights;
  }

  // ----------------------------- Predictions --------------------------------
  private generatePredictions(context: InsightContext): Insight[] {
    const predictions: Insight[] = [];

    // Predict based on trends
    const trendPatterns = context.patterns.filter(p => p.type === 'trend');
    
    for (const pattern of trendPatterns) {
      const change = (pattern.data as { change?: number }).change || 0;
      if (Math.abs(change) > 0.1) {
        predictions.push({
          id: generateUUID(),
          type: 'prediction',
          title: `Projected ${change > 0 ? 'Growth' : 'Decline'}`,
          description: `Based on current trends, expect a ${Math.abs(change * 100).toFixed(0)}% ${change > 0 ? 'increase' : 'decrease'} to continue.`,
          confidence: pattern.confidence * 0.8,
          impact: Math.abs(change) > 0.3 ? 'high' : 'medium',
          data: { basedOn: pattern.id, projectedChange: change },
          patterns: [pattern.id],
          createdAt: now(),
          expiresAt: now() + 7 * 24 * 60 * 60 * 1000, // 1 week
        });
      }
    }

    // Predict based on sequences
    const sequencePatterns = context.patterns.filter(p => p.type === 'sequence');
    if (sequencePatterns.length > 0) {
      predictions.push({
        id: generateUUID(),
        type: 'prediction',
        title: 'Predicted Next Actions',
        description: 'Based on your behavior patterns, these actions are likely next.',
        confidence: average(sequencePatterns.map(p => p.confidence)),
        impact: 'low',
        data: { sequences: sequencePatterns.map(p => p.data) },
        patterns: sequencePatterns.map(p => p.id),
        createdAt: now(),
        expiresAt: now() + 24 * 60 * 60 * 1000, // 1 day
      });
    }

    return predictions;
  }

  // ----------------------------- Recommendations ----------------------------
  private generateRecommendations(context: InsightContext): Insight[] {
    const recommendations: Insight[] = [];

    // Recommend based on temporal patterns
    const temporalPatterns = context.patterns.filter(p => p.type === 'temporal');
    for (const pattern of temporalPatterns) {
      const peakHour = (pattern.data as { peakHour?: number }).peakHour;
      if (peakHour !== undefined) {
        recommendations.push({
          id: generateUUID(),
          type: 'recommendation',
          title: 'Optimize Your Schedule',
          description: `Schedule your most important tasks around ${peakHour}:00 for maximum productivity.`,
          confidence: pattern.confidence,
          impact: 'high',
          data: { peakHour, action: 'schedule_optimization' },
          patterns: [pattern.id],
          createdAt: now(),
        });
      }
    }

    // Recommend based on streaks
    const trendPatterns = context.patterns.filter(p => 
      p.type === 'trend' && p.name.includes('Consistent')
    );
    if (trendPatterns.length > 0) {
      recommendations.push({
        id: generateUUID(),
        type: 'recommendation',
        title: 'Keep Your Momentum',
        description: 'You have strong consistency. Consider setting stretch goals to push further.',
        confidence: average(trendPatterns.map(p => p.confidence)),
        impact: 'medium',
        data: { action: 'stretch_goals' },
        patterns: trendPatterns.map(p => p.id),
        createdAt: now(),
      });
    }

    // Recommend based on anomalies
    const anomalyPatterns = context.patterns.filter(p => p.type === 'anomaly');
    if (anomalyPatterns.length > 0) {
      recommendations.push({
        id: generateUUID(),
        type: 'recommendation',
        title: 'Investigate Anomalies',
        description: 'Some unusual patterns were detected. Review them to understand if action is needed.',
        confidence: average(anomalyPatterns.map(p => p.confidence)),
        impact: 'medium',
        data: { anomalyCount: anomalyPatterns.length, action: 'review_anomalies' },
        patterns: anomalyPatterns.map(p => p.id),
        createdAt: now(),
      });
    }

    return recommendations;
  }

  // ----------------------------- Insight Management -------------------------
  getInsight(id: string): Insight | undefined {
    return this.insights.get(id);
  }

  getAllInsights(): Insight[] {
    return Array.from(this.insights.values());
  }

  getInsightsByType(type: Insight['type']): Insight[] {
    return this.getAllInsights().filter(i => i.type === type);
  }

  getActiveInsights(): Insight[] {
    const currentTime = now();
    return this.getAllInsights().filter(i => 
      !i.expiresAt || i.expiresAt > currentTime
    );
  }

  clearInsights(): void {
    this.insights.clear();
  }

  clearExpiredInsights(): number {
    const currentTime = now();
    let count = 0;
    
    const entries = Array.from(this.insights.entries());
    for (const [id, insight] of entries) {
      if (insight.expiresAt && insight.expiresAt <= currentTime) {
        this.insights.delete(id);
        count++;
      }
    }
    
    return count;
  }

  // ----------------------------- Statistics ---------------------------------
  getStats() {
    const insights = this.getAllInsights();
    
    return {
      totalInsights: insights.length,
      byType: {
        trend: insights.filter(i => i.type === 'trend').length,
        anomaly: insights.filter(i => i.type === 'anomaly').length,
        correlation: insights.filter(i => i.type === 'correlation').length,
        prediction: insights.filter(i => i.type === 'prediction').length,
        recommendation: insights.filter(i => i.type === 'recommendation').length,
      },
      byImpact: {
        high: insights.filter(i => i.impact === 'high').length,
        medium: insights.filter(i => i.impact === 'medium').length,
        low: insights.filter(i => i.impact === 'low').length,
      },
      avgConfidence: average(insights.map(i => i.confidence)),
    };
  }
}

// Singleton instance
export const insightGenerator = new InsightGenerator();


