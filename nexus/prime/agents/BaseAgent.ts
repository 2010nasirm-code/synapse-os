/**
 * ============================================================================
 * NEXUS PRIME - BASE AGENT
 * ============================================================================
 * 
 * Abstract base class for all NEXUS PRIME agents.
 * Provides common functionality and enforces the agent contract.
 * 
 * @module nexus/prime/agents/BaseAgent
 * @version 1.0.0
 */

import {
  AgentConfig,
  AgentType,
  AgentResult,
  AIRequest,
  SystemContext,
  Insight,
  ActionDraft,
  ProvenanceRecord,
} from '../core/types';
import { INexusAgent } from '../core/registry';
import { createProvenance } from '../core/provenance';

// ============================================================================
// BASE AGENT
// ============================================================================

export abstract class BaseAgent implements INexusAgent {
  abstract readonly config: AgentConfig;

  /**
   * Process a request - must be implemented by subclasses
   */
  abstract process(request: AIRequest, context: SystemContext): Promise<AgentResult>;

  /**
   * Default canHandle - checks capabilities against prompt keywords
   */
  canHandle(request: AIRequest): boolean {
    const prompt = request.prompt.toLowerCase();
    return this.config.capabilities.some(cap => 
      prompt.includes(cap.toLowerCase())
    );
  }

  /**
   * Default health check - returns true
   */
  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Create a success result
   */
  protected createSuccessResult(
    answer: string,
    options: {
      insights?: Insight[];
      actionDrafts?: ActionDraft[];
      confidence?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    return {
      agentId: this.config.id,
      success: true,
      answer,
      insights: options.insights || [],
      actionDrafts: options.actionDrafts || [],
      confidence: options.confidence ?? 0.8,
      metadata: options.metadata,
    };
  }

  /**
   * Create an error result
   */
  protected createErrorResult(
    error: string,
    provenance: ProvenanceRecord
  ): AgentResult {
    return {
      agentId: this.config.id,
      success: false,
      answer: '',
      insights: [],
      actionDrafts: [],
      provenance,
      confidence: 0,
      processingTimeMs: 0,
      error,
    };
  }

  /**
   * Create provenance for this agent
   */
  protected createProvenance(requestId: string, operation: string) {
    return createProvenance(requestId, this.config.id, operation);
  }

  /**
   * Execute with timing and provenance
   */
  protected async executeWithTracking(
    request: AIRequest,
    context: SystemContext,
    operation: string,
    handler: () => Promise<Omit<AgentResult, 'provenance' | 'processingTimeMs'>>
  ): Promise<AgentResult> {
    const startTime = Date.now();
    const prov = this.createProvenance(request.id, operation);
    prov.withInput({ promptLength: request.prompt.length });

    try {
      const result = await handler();
      const processingTimeMs = Date.now() - startTime;

      prov
        .withOutput({ 
          hasAnswer: !!result.answer,
          insightCount: result.insights.length,
          actionCount: result.actionDrafts.length,
        })
        .success()
        .build();

      return {
        ...result,
        provenance: prov.build(),
        processingTimeMs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      prov.failure(errorMessage).build();

      return this.createErrorResult(errorMessage, prov.build());
    }
  }

  /**
   * Extract keywords from prompt
   */
  protected extractKeywords(prompt: string): string[] {
    // Simple keyword extraction
    return prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);
  }

  /**
   * Check if prompt matches patterns
   */
  protected matchesPatterns(prompt: string, patterns: RegExp[]): boolean {
    return patterns.some(pattern => pattern.test(prompt));
  }

  /**
   * Create an insight
   */
  protected createInsight(
    type: Insight['type'],
    title: string,
    description: string,
    options: Partial<Insight> = {}
  ): Insight {
    return {
      id: `insight-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      level: options.level || 'info',
      title,
      description,
      timestamp: Date.now(),
      source: this.config.id,
      confidence: options.confidence ?? 0.8,
      data: options.data,
      suggestions: options.suggestions,
      relatedItems: options.relatedItems,
    };
  }

  /**
   * Create an action draft
   */
  protected createActionDraft(
    type: ActionDraft['type'],
    title: string,
    description: string,
    payload: Record<string, unknown>,
    options: Partial<ActionDraft> = {}
  ): ActionDraft {
    return {
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type,
      title,
      description,
      payload,
      source: this.config.id,
      requiresConfirmation: options.requiresConfirmation ?? this.config.safetyTier > 1,
      safetyLevel: options.safetyLevel || (this.config.safetyTier > 2 ? 'high' : this.config.safetyTier > 1 ? 'medium' : 'low'),
      preview: options.preview,
      estimatedImpact: options.estimatedImpact,
      reversible: options.reversible ?? true,
      createdAt: Date.now(),
    };
  }
}

export default BaseAgent;

