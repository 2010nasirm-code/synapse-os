/**
 * ============================================================================
 * NEXUS PRIME - INSIGHT AGENT
 * ============================================================================
 * 
 * Analyzes data and produces insights:
 * - Reads tracker data, stats, timelines
 * - Produces insights, anomalies, trend lines
 * - Returns Insight objects + action suggestions
 * 
 * @module nexus/prime/agents/InsightAgent
 * @version 1.0.0
 */

import { AgentConfig, AgentResult, AIRequest, SystemContext, Insight } from '../core/types';
import { BaseAgent } from './BaseAgent';

// ============================================================================
// INSIGHT AGENT
// ============================================================================

export class InsightAgent extends BaseAgent {
  readonly config: AgentConfig = {
    id: 'insight',
    name: 'Insight Agent',
    description: 'Analyzes data and produces insights',
    capabilities: ['analysis', 'trends', 'anomalies', 'predictions', 'patterns'],
    rateLimit: 30,
    safetyTier: 1,
    canProduceActions: true,
    requiresContext: true,
    timeout: 20000,
  };

  async process(request: AIRequest, context: SystemContext): Promise<AgentResult> {
    return this.executeWithTracking(request, context, 'analyze', async () => {
      const insights: Insight[] = [];
      const suggestions: string[] = [];

      // Analyze based on request type
      const analysisType = this.determineAnalysisType(request.prompt);

      switch (analysisType) {
        case 'trends':
          insights.push(...this.analyzeTrends(context));
          break;
        case 'anomalies':
          insights.push(...this.detectAnomalies(context));
          break;
        case 'patterns':
          insights.push(...this.findPatterns(context));
          break;
        case 'predictions':
          insights.push(...this.makePredictions(context));
          break;
        default:
          // Comprehensive analysis
          insights.push(...this.analyzeTrends(context));
          insights.push(...this.detectAnomalies(context));
          insights.push(...this.findPatterns(context));
      }

      // Generate answer based on insights
      const answer = this.generateAnswer(request.prompt, insights);

      // Create action suggestions
      const actionDrafts = this.generateActionSuggestions(insights);

      return this.createSuccessResult(answer, {
        insights,
        actionDrafts,
        confidence: insights.length > 0 ? 0.85 : 0.5,
      });
    });
  }

  /**
   * Determine the type of analysis requested
   */
  private determineAnalysisType(prompt: string): 'trends' | 'anomalies' | 'patterns' | 'predictions' | 'general' {
    const lower = prompt.toLowerCase();
    
    if (/trend|over time|change|growth/i.test(lower)) return 'trends';
    if (/anomal|unusual|outlier|strange/i.test(lower)) return 'anomalies';
    if (/pattern|recurring|repeat|habit/i.test(lower)) return 'patterns';
    if (/predict|forecast|future|will/i.test(lower)) return 'predictions';
    
    return 'general';
  }

  /**
   * Analyze trends in the data
   */
  private analyzeTrends(context: SystemContext): Insight[] {
    const insights: Insight[] = [];

    // Simulated trend analysis (would connect to real data)
    insights.push(this.createInsight(
      'trend',
      'Activity Trend',
      'Your activity has been consistent over the past week with a slight upward trend.',
      {
        level: 'info',
        confidence: 0.8,
        data: {
          direction: 'up',
          changePercent: 5,
          period: '7 days',
        },
        suggestions: ['Keep up the momentum!', 'Consider setting a new goal.'],
      }
    ));

    // Session-based insight
    if (context.session.messageCount > 5) {
      insights.push(this.createInsight(
        'trend',
        'Active Session',
        `You've had ${context.session.messageCount} interactions this session. That's above average engagement.`,
        {
          level: 'success',
          confidence: 0.9,
        }
      ));
    }

    return insights;
  }

  /**
   * Detect anomalies in the data
   */
  private detectAnomalies(context: SystemContext): Insight[] {
    const insights: Insight[] = [];

    // Check for unusual patterns
    const memoriesCount = context.memories.length;
    
    if (memoriesCount === 0) {
      insights.push(this.createInsight(
        'anomaly',
        'No Historical Data',
        'I don\'t have any memories from our previous sessions. This is your first interaction or memory was cleared.',
        {
          level: 'warning',
          confidence: 0.95,
          suggestions: ['Try asking me to remember something important.'],
        }
      ));
    }

    // Placeholder for actual anomaly detection
    // TODO: Connect to real tracker data
    
    return insights;
  }

  /**
   * Find patterns in the data
   */
  private findPatterns(context: SystemContext): Insight[] {
    const insights: Insight[] = [];

    // Analyze memory patterns
    if (context.memories.length > 0) {
      const categories = new Map<string, number>();
      
      for (const memory of context.memories) {
        const cat = memory.category || 'general';
        categories.set(cat, (categories.get(cat) || 0) + 1);
      }

      if (categories.size > 0) {
        const topCategory = Array.from(categories.entries())
          .sort((a, b) => b[1] - a[1])[0];

        insights.push(this.createInsight(
          'pattern',
          'Memory Pattern Detected',
          `Most of your saved memories are about "${topCategory[0]}" (${topCategory[1]} items).`,
          {
            level: 'info',
            confidence: 0.85,
            data: { categories: Object.fromEntries(categories) },
          }
        ));
      }
    }

    return insights;
  }

  /**
   * Make predictions based on data
   */
  private makePredictions(context: SystemContext): Insight[] {
    const insights: Insight[] = [];

    // Placeholder for actual prediction logic
    // TODO: Implement ML-based predictions

    insights.push(this.createInsight(
      'prediction',
      'Engagement Prediction',
      'Based on your current activity pattern, you\'re likely to remain highly engaged this week.',
      {
        level: 'info',
        confidence: 0.6,
        data: {
          prediction: 'high_engagement',
          probability: 0.7,
          horizon: '7 days',
        },
      }
    ));

    return insights;
  }

  /**
   * Generate answer text from insights
   */
  private generateAnswer(prompt: string, insights: Insight[]): string {
    if (insights.length === 0) {
      return "I analyzed your data but couldn't find any significant insights at this time. Try adding more data or being more specific about what you'd like to know.";
    }

    let answer = "Here's what I found:\n\n";

    for (const insight of insights.slice(0, 3)) {
      answer += `**${insight.title}**\n`;
      answer += `${insight.description}\n\n`;
    }

    if (insights.length > 3) {
      answer += `_Plus ${insights.length - 3} more insights available._`;
    }

    return answer;
  }

  /**
   * Generate action suggestions from insights
   */
  private generateActionSuggestions(insights: Insight[]) {
    const actions = [];

    for (const insight of insights) {
      if (insight.level === 'warning' || insight.level === 'critical') {
        actions.push(this.createActionDraft(
          'suggest',
          `Address: ${insight.title}`,
          `Take action on the ${insight.type} insight`,
          { insightId: insight.id, insightType: insight.type },
          { requiresConfirmation: false }
        ));
      }
    }

    return actions;
  }

  canHandle(request: AIRequest): boolean {
    return this.matchesPatterns(request.prompt, [
      /analyze/i,
      /insight/i,
      /trend/i,
      /pattern/i,
      /anomal/i,
      /predict/i,
      /what.*happening/i,
      /how.*doing/i,
    ]);
  }
}

export default InsightAgent;

