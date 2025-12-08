/**
 * ============================================================================
 * NEXUS PRIME - MEMORY AGENT
 * ============================================================================
 * 
 * Manages long-term memory and context:
 * - Writes/reads memory store entries
 * - Embeds content for semantic search
 * - Performs memory summarization
 * - Manages memory lifecycle
 * 
 * @module nexus/prime/agents/MemoryAgent
 * @version 1.0.0
 */

import { AgentConfig, AgentResult, AIRequest, SystemContext, NexusMemoryItem } from '../core/types';
import { BaseAgent } from './BaseAgent';

// ============================================================================
// MEMORY CATEGORIES
// ============================================================================

const MEMORY_CATEGORIES = [
  'general',
  'preference',
  'fact',
  'conversation',
  'task',
  'insight',
  'automation',
] as const;

type MemoryCategory = typeof MEMORY_CATEGORIES[number];

// ============================================================================
// MEMORY AGENT
// ============================================================================

export class MemoryAgent extends BaseAgent {
  readonly config: AgentConfig = {
    id: 'memory',
    name: 'Memory Agent',
    description: 'Manages long-term memory and context',
    capabilities: ['store', 'retrieve', 'summarize', 'embed', 'remember', 'recall', 'forget'],
    rateLimit: 50,
    safetyTier: 1,
    canProduceActions: true,
    requiresContext: false,
    timeout: 15000,
  };

  async process(request: AIRequest, context: SystemContext): Promise<AgentResult> {
    return this.executeWithTracking(request, context, 'memory', async () => {
      const memoryOp = this.determineOperation(request.prompt);
      
      switch (memoryOp) {
        case 'store':
          return this.storeMemory(request, context);
        case 'recall':
          return this.recallMemory(request, context);
        case 'forget':
          return this.forgetMemory(request, context);
        case 'summarize':
          return this.summarizeMemories(context);
        case 'list':
          return this.listMemories(context);
        default:
          return this.memoryHelp(context);
      }
    });
  }

  /**
   * Determine the memory operation
   */
  private determineOperation(prompt: string): 'store' | 'recall' | 'forget' | 'summarize' | 'list' | 'help' {
    const lower = prompt.toLowerCase();
    
    if (/remember|save|store|note/i.test(lower)) return 'store';
    if (/recall|what did i|do you remember|retrieve/i.test(lower)) return 'recall';
    if (/forget|delete|remove.*memory/i.test(lower)) return 'forget';
    if (/summarize|summary/i.test(lower)) return 'summarize';
    if (/list|show.*memories|all memories/i.test(lower)) return 'list';
    
    return 'help';
  }

  /**
   * Store a new memory
   */
  private storeMemory(
    request: AIRequest,
    _context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    // Extract memory content
    const content = this.extractMemoryContent(request.prompt);
    const category = this.categorizeMemory(content);
    
    // Create memory item
    const memoryItem: NexusMemoryItem = {
      id: `mem-${Date.now()}`,
      content,
      category,
      importance: this.calculateImportance(content),
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      metadata: {
        source: 'user',
        prompt: request.prompt.slice(0, 100),
      },
    };

    // Create action draft for storing
    const actionDraft = this.createActionDraft(
      'store',
      'Store Memory',
      `Save: "${content.slice(0, 50)}..."`,
      { memory: memoryItem },
      {
        requiresConfirmation: false,
        estimatedImpact: 'This information will be remembered for future conversations.',
      }
    );

    return this.createSuccessResult(
      `I'll remember that:\n\n> ${content}\n\n` +
      `Category: **${category}** | Importance: **${Math.round(memoryItem.importance * 100)}%**`,
      {
        actionDrafts: [actionDraft],
        confidence: 0.9,
        metadata: { memoryId: memoryItem.id },
      }
    );
  }

  /**
   * Extract memory content from prompt
   */
  private extractMemoryContent(prompt: string): string {
    // Remove common prefixes
    return prompt
      .replace(/^(remember|save|store|note)(\s+that)?:?\s*/i, '')
      .replace(/^please\s*/i, '')
      .trim();
  }

  /**
   * Categorize the memory
   */
  private categorizeMemory(content: string): MemoryCategory {
    const lower = content.toLowerCase();
    
    if (/i (like|prefer|want|love|hate)/i.test(lower)) return 'preference';
    if (/is|are|was|were|has|have/i.test(lower) && lower.length < 100) return 'fact';
    if (/task|todo|do|complete/i.test(lower)) return 'task';
    if (/insight|realized|learned/i.test(lower)) return 'insight';
    
    return 'general';
  }

  /**
   * Calculate memory importance
   */
  private calculateImportance(content: string): number {
    let score = 0.5;
    
    // Longer content is often more important
    if (content.length > 100) score += 0.1;
    if (content.length > 200) score += 0.1;
    
    // Preference indicators
    if (/important|crucial|critical|always|never/i.test(content)) score += 0.2;
    
    // Action indicators
    if (/must|should|need to/i.test(content)) score += 0.1;
    
    return Math.min(score, 1.0);
  }

  /**
   * Recall memories based on query
   */
  private recallMemory(
    request: AIRequest,
    context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const memories = context.memories;
    
    if (memories.length === 0) {
      return this.createSuccessResult(
        "I don't have any memories from our previous conversations yet. " +
        "Try saying 'Remember that...' to save something.",
        { confidence: 0.9 }
      );
    }

    // Extract search query
    const query = request.prompt
      .replace(/^(recall|what did i|do you remember|retrieve)(\s+about)?:?\s*/i, '')
      .trim();

    // Search memories
    const relevant = this.searchMemories(memories, query);

    if (relevant.length === 0) {
      return this.createSuccessResult(
        `I couldn't find any memories matching "${query}".\n\n` +
        `I have ${memories.length} total memories. Try asking more generally or use "list my memories".`,
        { confidence: 0.7 }
      );
    }

    return this.createSuccessResult(
      `Here's what I remember about "${query}":\n\n` +
      relevant.map((m, i) => 
        `${i + 1}. ${m.content}\n   _Saved ${this.formatTimeAgo(m.createdAt)}_`
      ).join('\n\n'),
      {
        confidence: 0.85,
        metadata: { memoryCount: relevant.length },
      }
    );
  }

  /**
   * Search memories by query
   */
  private searchMemories(memories: NexusMemoryItem[], query: string): NexusMemoryItem[] {
    if (!query) return memories.slice(0, 5);
    
    const queryWords = query.toLowerCase().split(/\s+/);
    
    return memories
      .map(m => ({
        memory: m,
        score: queryWords.reduce((score, word) => 
          score + (m.content.toLowerCase().includes(word) ? 1 : 0), 0
        ),
      }))
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(m => m.memory);
  }

  /**
   * Forget a memory
   */
  private forgetMemory(
    request: AIRequest,
    context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const memories = context.memories;
    
    if (memories.length === 0) {
      return this.createSuccessResult(
        "There are no memories to forget.",
        { confidence: 0.9 }
      );
    }

    // Extract what to forget
    const query = request.prompt
      .replace(/^(forget|delete|remove)(\s+about|\s+memory)?:?\s*/i, '')
      .trim();

    const toForget = this.searchMemories(memories, query);

    if (toForget.length === 0) {
      return this.createSuccessResult(
        `I couldn't find any memories matching "${query}" to forget.`,
        { confidence: 0.7 }
      );
    }

    // Create action drafts for deletion
    const actionDrafts = toForget.map(m => 
      this.createActionDraft(
        'delete',
        `Forget: "${m.content.slice(0, 30)}..."`,
        'Remove this memory permanently',
        { memoryId: m.id },
        {
          requiresConfirmation: true,
          estimatedImpact: 'This memory will be permanently deleted.',
          reversible: false,
        }
      )
    );

    return this.createSuccessResult(
      `I found ${toForget.length} memory(ies) matching "${query}":\n\n` +
      toForget.map((m, i) => `${i + 1}. "${m.content.slice(0, 50)}..."`).join('\n') +
      `\n\nConfirm to forget these memories.`,
      {
        actionDrafts,
        confidence: 0.85,
      }
    );
  }

  /**
   * Summarize all memories
   */
  private summarizeMemories(
    context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const memories = context.memories;
    
    if (memories.length === 0) {
      return this.createSuccessResult(
        "No memories to summarize. Start by telling me to remember something!",
        { confidence: 0.9 }
      );
    }

    // Group by category
    const byCategory = memories.reduce((acc, m) => {
      const cat = m.category || 'general';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m);
      return acc;
    }, {} as Record<string, NexusMemoryItem[]>);

    // Build summary
    let summary = `## Memory Summary\n\n`;
    summary += `Total memories: **${memories.length}**\n\n`;

    for (const [category, mems] of Object.entries(byCategory)) {
      summary += `### ${category.charAt(0).toUpperCase() + category.slice(1)} (${mems.length})\n`;
      summary += mems.slice(0, 3).map(m => `• ${m.content.slice(0, 60)}...`).join('\n');
      if (mems.length > 3) {
        summary += `\n• _...and ${mems.length - 3} more_`;
      }
      summary += '\n\n';
    }

    return this.createSuccessResult(summary, {
      confidence: 0.9,
      insights: [
        this.createInsight(
          'memory',
          'Memory Health',
          `You have ${memories.length} memories across ${Object.keys(byCategory).length} categories.`,
          { level: 'info' }
        ),
      ],
    });
  }

  /**
   * List all memories
   */
  private listMemories(
    context: SystemContext
  ): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const memories = context.memories;
    
    if (memories.length === 0) {
      return this.createSuccessResult(
        "You don't have any memories saved yet. " +
        "Try saying 'Remember that [something]' to get started.",
        { confidence: 0.9 }
      );
    }

    const sorted = [...memories].sort((a, b) => b.createdAt - a.createdAt);

    return this.createSuccessResult(
      `## Your Memories (${memories.length} total)\n\n` +
      sorted.slice(0, 10).map((m, i) => 
        `${i + 1}. **${m.category || 'general'}** - ${m.content.slice(0, 50)}...\n` +
        `   _${this.formatTimeAgo(m.createdAt)}_`
      ).join('\n\n') +
      (memories.length > 10 ? `\n\n_...and ${memories.length - 10} more_` : ''),
      { confidence: 0.9 }
    );
  }

  /**
   * Show memory help
   */
  private memoryHelp(context: SystemContext): Omit<AgentResult, 'provenance' | 'processingTimeMs'> {
    const memoryCount = context.memories.length;

    return this.createSuccessResult(
      `## Memory Management\n\n` +
      `You currently have **${memoryCount}** memories.\n\n` +
      `### Commands\n` +
      `• **"Remember that..."** - Save new information\n` +
      `• **"What did I tell you about..."** - Recall memories\n` +
      `• **"Forget about..."** - Delete memories\n` +
      `• **"Summarize my memories"** - Get an overview\n` +
      `• **"List my memories"** - See all memories\n\n` +
      `Your memories help me personalize responses and remember important information.`,
      { confidence: 0.9 }
    );
  }

  /**
   * Format time ago
   */
  private formatTimeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }

  canHandle(request: AIRequest): boolean {
    return this.matchesPatterns(request.prompt, [
      /remember/i,
      /recall/i,
      /forget/i,
      /what did i/i,
      /do you remember/i,
      /memories/i,
      /save.*note/i,
    ]);
  }
}

export default MemoryAgent;

