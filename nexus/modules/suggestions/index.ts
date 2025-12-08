// ============================================================================
// NEXUS MODULES - Suggestions Module
// ============================================================================

import { generateUUID, now } from '../../utils';
import { eventBus } from '../../core/engine';
import { nexusBrain } from '../../systems/nexus_brain';
import { nexusMemory } from '../../systems/nexus_memory';

export type SuggestionType = 'action' | 'insight' | 'reminder' | 'optimization' | 'automation';
export type SuggestionPriority = 'low' | 'medium' | 'high';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected';

export interface Suggestion {
  id: string;
  userId: string;
  type: SuggestionType;
  title: string;
  description: string;
  reasoning?: string;
  priority: SuggestionPriority;
  status: SuggestionStatus;
  actionable: boolean;
  actionData?: Record<string, unknown>;
  createdAt: number;
  acceptedAt?: number;
  expiresAt?: number;
}

export interface SuggestionCreateInput {
  type: SuggestionType;
  title: string;
  description: string;
  reasoning?: string;
  priority?: SuggestionPriority;
  actionable?: boolean;
  actionData?: Record<string, unknown>;
  expiresAt?: number;
}

export interface GenerationContext {
  trackerItems?: unknown[];
  automations?: unknown[];
  knowledge?: unknown[];
  recentActivity?: unknown[];
}

export class SuggestionsModule {
  private suggestions: Map<string, Suggestion> = new Map();

  // ----------------------------- CRUD Operations ----------------------------
  create(userId: string, input: SuggestionCreateInput): Suggestion {
    const suggestion: Suggestion = {
      id: generateUUID(),
      userId,
      type: input.type,
      title: input.title,
      description: input.description,
      reasoning: input.reasoning,
      priority: input.priority || 'medium',
      status: 'pending',
      actionable: input.actionable || false,
      actionData: input.actionData,
      createdAt: now(),
      expiresAt: input.expiresAt,
    };

    this.suggestions.set(suggestion.id, suggestion);
    eventBus.emit('suggestions:created', suggestion);

    return suggestion;
  }

  get(id: string): Suggestion | undefined {
    return this.suggestions.get(id);
  }

  update(id: string, updates: Partial<SuggestionCreateInput>): Suggestion | undefined {
    const suggestion = this.suggestions.get(id);
    if (!suggestion) return undefined;

    Object.assign(suggestion, updates);
    eventBus.emit('suggestions:updated', suggestion);

    return suggestion;
  }

  delete(id: string): boolean {
    if (!this.suggestions.has(id)) return false;
    this.suggestions.delete(id);
    eventBus.emit('suggestions:deleted', { id });
    return true;
  }

  // ----------------------------- Status Management --------------------------
  accept(id: string): boolean {
    const suggestion = this.suggestions.get(id);
    if (!suggestion) return false;

    suggestion.status = 'accepted';
    suggestion.acceptedAt = now();
    eventBus.emit('suggestions:accepted', suggestion);

    return true;
  }

  reject(id: string, reason?: string): boolean {
    const suggestion = this.suggestions.get(id);
    if (!suggestion) return false;

    suggestion.status = 'rejected';
    if (reason) {
      suggestion.reasoning = (suggestion.reasoning || '') + ` [Rejected: ${reason}]`;
    }
    eventBus.emit('suggestions:rejected', suggestion);

    return true;
  }

  defer(id: string, until: number): boolean {
    const suggestion = this.suggestions.get(id);
    if (!suggestion) return false;

    suggestion.status = 'pending';
    suggestion.expiresAt = until;
    eventBus.emit('suggestions:deferred', suggestion);

    return true;
  }

  // ----------------------------- AI Generation ------------------------------
  async generate(userId: string, context: GenerationContext): Promise<Suggestion[]> {
    eventBus.emit('suggestions:generating', { userId, context });

    // Use Nexus Brain for intelligent suggestion generation
    const brainResult = await nexusBrain.process({
      query: 'Generate suggestions based on user data',
      context: context as any,
      mode: 'practical',
    });

    // Also check memory for patterns
    const memories = nexusMemory.search('suggestion patterns', { limit: 10 });

    const generatedSuggestions: Suggestion[] = [];

    // Generate insights from brain analysis
    if (brainResult.insights) {
      for (const insight of brainResult.insights.slice(0, 5)) {
        const suggestion = this.create(userId, {
          type: 'insight',
          title: insight.title || 'New Insight',
          description: insight.description || String(insight),
          reasoning: String(insight.data || ''),
          priority: insight.confidence >= 0.7 ? 'high' : 'medium',
          actionable: false,
        });
        generatedSuggestions.push(suggestion);
      }
    }

    // Generate pattern-based suggestions
    if (brainResult.patterns) {
      for (const pattern of brainResult.patterns.slice(0, 3)) {
        const suggestion = this.create(userId, {
          type: 'optimization',
          title: `Pattern: ${pattern.name || pattern.type}`,
          description: pattern.description || 'A recurring pattern was detected',
          reasoning: String(pattern.data || ''),
          priority: pattern.confidence >= 0.8 ? 'high' : 'medium',
        });
        generatedSuggestions.push(suggestion);
      }
    }

    // Generate automation suggestions if repetitive tasks detected
    if (context.trackerItems && Array.isArray(context.trackerItems)) {
      const frequentTasks = this.detectFrequentTasks(context.trackerItems);
      for (const task of frequentTasks.slice(0, 2)) {
        const suggestion = this.create(userId, {
          type: 'automation',
          title: `Automate: ${task.name}`,
          description: `This task is performed frequently. Consider automating it.`,
          reasoning: `Detected ${task.count} occurrences in the data.`,
          priority: 'medium',
          actionable: true,
          actionData: { taskName: task.name, frequency: task.count },
        });
        generatedSuggestions.push(suggestion);
      }
    }

    eventBus.emit('suggestions:generated', { userId, suggestions: generatedSuggestions });

    return generatedSuggestions;
  }

  private detectFrequentTasks(items: unknown[]): Array<{ name: string; count: number }> {
    const counts = new Map<string, number>();
    
    for (const item of items) {
      const name = (item as { name?: string })?.name;
      if (name) {
        counts.set(name, (counts.get(name) || 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .filter(([_, count]) => count >= 3)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  // ----------------------------- Quick Suggestions --------------------------
  async quickSuggest(userId: string, topic: string): Promise<Suggestion[]> {
    const brainResult = await nexusBrain.process({
      query: `Quick suggestions for: ${topic}`,
      mode: 'practical',
    });

    const suggestions: Suggestion[] = [];
    const ideas = brainResult.suggestions || [];
    
    for (const idea of ideas.slice(0, 5)) {
      const suggestion = this.create(userId, {
        type: 'action',
        title: String(idea),
        description: '',
        priority: 'low',
      });
      suggestions.push(suggestion);
    }

    return suggestions;
  }

  // ----------------------------- Query Operations ---------------------------
  getByUser(userId: string): Suggestion[] {
    return Array.from(this.suggestions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => {
        // Sort by priority, then by creation time
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.createdAt - a.createdAt;
      });
  }

  getPending(userId: string): Suggestion[] {
    return this.getByUser(userId).filter(s => s.status === 'pending');
  }

  getByType(userId: string, type: SuggestionType): Suggestion[] {
    return this.getByUser(userId).filter(s => s.type === type);
  }

  getActionable(userId: string): Suggestion[] {
    return this.getByUser(userId).filter(s => s.actionable && s.status === 'pending');
  }

  // ----------------------------- Cleanup ------------------------------------
  cleanupExpired(): number {
    const currentTime = now();
    let removed = 0;

    const entries = Array.from(this.suggestions.entries());
    for (const [id, suggestion] of entries) {
      if (suggestion.expiresAt && suggestion.expiresAt < currentTime) {
        this.suggestions.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      eventBus.emit('suggestions:cleanup', { removed });
    }

    return removed;
  }

  // ----------------------------- Statistics ---------------------------------
  getStats(userId?: string) {
    let suggestions = Array.from(this.suggestions.values());
    if (userId) {
      suggestions = suggestions.filter(s => s.userId === userId);
    }

    return {
      total: suggestions.length,
      pending: suggestions.filter(s => s.status === 'pending').length,
      accepted: suggestions.filter(s => s.status === 'accepted').length,
      rejected: suggestions.filter(s => s.status === 'rejected').length,
      byType: {
        insight: suggestions.filter(s => s.type === 'insight').length,
        action: suggestions.filter(s => s.type === 'action').length,
        reminder: suggestions.filter(s => s.type === 'reminder').length,
        optimization: suggestions.filter(s => s.type === 'optimization').length,
        automation: suggestions.filter(s => s.type === 'automation').length,
      },
      acceptanceRate: suggestions.length > 0
        ? suggestions.filter(s => s.status === 'accepted').length / suggestions.length
        : 0,
    };
  }
}

export const suggestionsModule = new SuggestionsModule();
export default suggestionsModule;


