/**
 * ============================================================================
 * NEXUS PRIME - EVOLUTION AGENT
 * ============================================================================
 * 
 * Suggests micro-features and improvements:
 * - Analyzes usage patterns for improvement opportunities
 * - Outputs PR-ready patches (always requires confirmation)
 * - Never auto-applies changes
 * 
 * @module nexus/prime/agents/EvolutionAgent
 * @version 1.0.0
 */

import { AgentConfig, AgentResult, AIRequest, SystemContext, PatchSuggestion } from '../core/types';
import { BaseAgent } from './BaseAgent';

// ============================================================================
// IMPROVEMENT CATEGORIES
// ============================================================================

interface ImprovementSuggestion {
  id: string;
  category: 'performance' | 'ux' | 'feature' | 'automation' | 'integration';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  confidence: number;
  patches?: PatchSuggestion[];
}

// ============================================================================
// EVOLUTION AGENT
// ============================================================================

export class EvolutionAgent extends BaseAgent {
  readonly config: AgentConfig = {
    id: 'evolution',
    name: 'Evolution Agent',
    description: 'Suggests micro-features and improvements',
    capabilities: ['improve', 'suggest', 'optimize', 'evolve', 'enhance', 'upgrade'],
    rateLimit: 10,
    safetyTier: 3,
    canProduceActions: true,
    requiresContext: true,
    timeout: 30000,
  };

  async process(request: AIRequest, context: SystemContext): Promise<AgentResult> {
    return this.executeWithTracking(request, context, 'evolve', async () => {
      const evolutionType = this.determineEvolutionType(request.prompt);
      
      switch (evolutionType) {
        case 'analyze':
          return this.analyzeAndSuggest(context);
        case 'specific':
          return this.handleSpecificImprovement(request, context);
        case 'optimize':
          return this.suggestOptimizations(context);
        default:
          return this.showEvolutionOptions(context);
      }
    });
  }

  /**
   * Determine evolution type
   */
  private determineEvolutionType(prompt: string): 'analyze' | 'specific' | 'optimize' | 'general' {
    const lower = prompt.toLowerCase();
    
    if (/analyze|scan|check|review/i.test(lower)) return 'analyze';
    if (/improve|enhance|upgrade|add/i.test(lower)) return 'specific';
    if (/optimize|faster|better|efficient/i.test(lower)) return 'optimize';
    
    return 'general';
  }

  /**
   * Analyze context and suggest improvements
   */
  private analyzeAndSuggest(
    context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const suggestions = this.generateSuggestions(context);

    if (suggestions.length === 0) {
      return this.createSuccessResult(
        "I analyzed your workspace and don't have any specific improvement suggestions at the moment. " +
        "Your setup looks good! Check back after more usage.",
        { confidence: 0.7 }
      );
    }

    const insights = suggestions.map(s => 
      this.createInsight(
        'improvement',
        s.title,
        s.description,
        {
          level: s.impact === 'high' ? 'warning' : 'info',
          confidence: s.confidence,
          data: { category: s.category, effort: s.effort, impact: s.impact },
        }
      )
    );

    const actionDrafts = suggestions
      .filter(s => s.patches && s.patches.length > 0)
      .map(s => 
        this.createActionDraft(
          'patch',
          `Apply: ${s.title}`,
          s.description,
          { suggestion: s, patches: s.patches },
          {
            requiresConfirmation: true,
            safetyLevel: 'high',
            preview: this.formatSuggestionPreview(s),
            estimatedImpact: `${s.impact} impact, ${s.effort} effort`,
            reversible: true,
          }
        )
      );

    return this.createSuccessResult(
      `## Evolution Analysis\n\n` +
      `I found ${suggestions.length} potential improvement(s):\n\n` +
      suggestions.map((s, i) => 
        `### ${i + 1}. ${s.title}\n` +
        `${s.description}\n` +
        `**Impact:** ${s.impact} | **Effort:** ${s.effort}\n`
      ).join('\n') +
      `\n_All changes require your confirmation before being applied._`,
      {
        insights,
        actionDrafts,
        confidence: 0.75,
      }
    );
  }

  /**
   * Generate improvement suggestions based on context
   */
  private generateSuggestions(context: SystemContext): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    // Memory-based suggestions
    if (context.memories.length === 0) {
      suggestions.push({
        id: `sug-${Date.now()}-1`,
        category: 'feature',
        title: 'Enable Memory System',
        description: 'You haven\'t saved any memories yet. Using the memory system helps personalize your experience.',
        impact: 'medium',
        effort: 'low',
        confidence: 0.9,
      });
    }

    // Feature flag suggestions
    if (!context.features['advancedAnalytics']) {
      suggestions.push({
        id: `sug-${Date.now()}-2`,
        category: 'feature',
        title: 'Enable Advanced Analytics',
        description: 'Turn on advanced analytics to see deeper insights into your data patterns.',
        impact: 'high',
        effort: 'low',
        confidence: 0.8,
      });
    }

    // Session-based suggestions
    if (context.session.messageCount > 10) {
      suggestions.push({
        id: `sug-${Date.now()}-3`,
        category: 'automation',
        title: 'Create Shortcuts',
        description: 'You\'ve been active this session. Consider creating automations for your frequent actions.',
        impact: 'medium',
        effort: 'medium',
        confidence: 0.7,
      });
    }

    // UI suggestions
    if (context.ui.theme === 'light') {
      suggestions.push({
        id: `sug-${Date.now()}-4`,
        category: 'ux',
        title: 'Try Dark Mode',
        description: 'Dark mode can reduce eye strain and save battery on OLED screens.',
        impact: 'low',
        effort: 'low',
        confidence: 0.6,
      });
    }

    return suggestions;
  }

  /**
   * Handle specific improvement request
   */
  private handleSpecificImprovement(
    request: AIRequest,
    _context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const area = this.extractImprovementArea(request.prompt);

    const suggestions: ImprovementSuggestion[] = [];

    switch (area) {
      case 'performance':
        suggestions.push({
          id: `sug-${Date.now()}-perf`,
          category: 'performance',
          title: 'Performance Optimization',
          description: 'Implement lazy loading, caching, and optimized queries.',
          impact: 'high',
          effort: 'medium',
          confidence: 0.8,
          patches: [
            {
              id: `patch-${Date.now()}-1`,
              file: 'lib/performance.ts',
              description: 'Add caching layer',
              before: '// No caching',
              after: 'const cache = new LRUCache({ max: 100 });',
              lineStart: 1,
              lineEnd: 1,
              reason: 'Improves response times by caching frequent queries',
            },
          ],
        });
        break;

      case 'ui':
        suggestions.push({
          id: `sug-${Date.now()}-ui`,
          category: 'ux',
          title: 'UI Enhancement',
          description: 'Add animations, improve accessibility, and enhance visual hierarchy.',
          impact: 'medium',
          effort: 'medium',
          confidence: 0.75,
        });
        break;

      case 'automation':
        suggestions.push({
          id: `sug-${Date.now()}-auto`,
          category: 'automation',
          title: 'Smart Automations',
          description: 'Add intelligent triggers based on your usage patterns.',
          impact: 'high',
          effort: 'high',
          confidence: 0.7,
        });
        break;

      default:
        return this.showEvolutionOptions(_context);
    }

    const actionDrafts = suggestions.map(s =>
      this.createActionDraft(
        'patch',
        s.title,
        s.description,
        { suggestion: s },
        {
          requiresConfirmation: true,
          safetyLevel: 'high',
          estimatedImpact: `${s.impact} impact improvement`,
          reversible: true,
        }
      )
    );

    return this.createSuccessResult(
      `## Suggested ${area.charAt(0).toUpperCase() + area.slice(1)} Improvements\n\n` +
      suggestions.map(s => 
        `### ${s.title}\n${s.description}\n` +
        `**Impact:** ${s.impact} | **Effort:** ${s.effort}`
      ).join('\n\n') +
      `\n\n_All changes are proposed as drafts and require your approval._`,
      {
        actionDrafts,
        confidence: 0.8,
      }
    );
  }

  /**
   * Extract improvement area from prompt
   */
  private extractImprovementArea(prompt: string): 'performance' | 'ui' | 'automation' | 'general' {
    const lower = prompt.toLowerCase();
    
    if (/performance|speed|fast|slow|optimize/i.test(lower)) return 'performance';
    if (/ui|interface|design|look|visual/i.test(lower)) return 'ui';
    if (/automat|workflow|trigger/i.test(lower)) return 'automation';
    
    return 'general';
  }

  /**
   * Suggest optimizations
   */
  private suggestOptimizations(
    context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const optimizations = [
      {
        title: 'Query Optimization',
        description: 'Add indexes and optimize database queries for faster data retrieval.',
        area: 'Backend',
      },
      {
        title: 'Component Memoization',
        description: 'Memoize expensive React components to reduce re-renders.',
        area: 'Frontend',
      },
      {
        title: 'Bundle Optimization',
        description: 'Implement code splitting and lazy loading for faster initial load.',
        area: 'Build',
      },
    ];

    return this.createSuccessResult(
      `## Optimization Opportunities\n\n` +
      optimizations.map((o, i) => 
        `### ${i + 1}. ${o.title}\n${o.description}\n**Area:** ${o.area}`
      ).join('\n\n') +
      `\n\n_These are general suggestions. Tell me which area you'd like to focus on for specific patches._`,
      {
        confidence: 0.8,
        insights: optimizations.map(o => 
          this.createInsight(
            'optimization',
            o.title,
            o.description,
            { level: 'info' }
          )
        ),
      }
    );
  }

  /**
   * Show evolution options
   */
  private showEvolutionOptions(
    _context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    return this.createSuccessResult(
      `## Evolution Agent\n\n` +
      `I can help improve and evolve your workspace. Options:\n\n` +
      `### 🔍 Analyze\n` +
      `"Analyze my workspace for improvements"\n\n` +
      `### 🚀 Optimize\n` +
      `"Optimize performance" or "Improve UI"\n\n` +
      `### ✨ Suggest Features\n` +
      `"Suggest new features" or "What can be automated?"\n\n` +
      `_All suggested changes are safe - they require your confirmation and create PR drafts._`,
      { confidence: 0.9 }
    );
  }

  /**
   * Format suggestion preview
   */
  private formatSuggestionPreview(suggestion: ImprovementSuggestion): string {
    let preview = `${suggestion.title}\n`;
    preview += `${'─'.repeat(40)}\n`;
    preview += `Category: ${suggestion.category}\n`;
    preview += `Impact: ${suggestion.impact.toUpperCase()}\n`;
    preview += `Effort: ${suggestion.effort}\n`;
    
    if (suggestion.patches && suggestion.patches.length > 0) {
      preview += `\nPatches (${suggestion.patches.length}):\n`;
      for (const patch of suggestion.patches.slice(0, 2)) {
        preview += `• ${patch.file}: ${patch.description}\n`;
      }
    }
    
    return preview;
  }

  canHandle(request: AIRequest): boolean {
    return this.matchesPatterns(request.prompt, [
      /improve/i,
      /suggest/i,
      /optimize/i,
      /evolve/i,
      /enhance/i,
      /upgrade/i,
      /better/i,
    ]);
  }
}

export default EvolutionAgent;

