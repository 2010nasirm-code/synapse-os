/**
 * ============================================================================
 * NEXUS PRIME - MEMORY SUMMARIES
 * ============================================================================
 * 
 * Memory summarization and compaction:
 * - Auto-summary generation
 * - Memory compaction
 * - Category summarization
 * 
 * @module nexus/prime/memory/summaries
 * @version 1.0.0
 */

import { NexusMemoryItem } from '../core/types';

// ============================================================================
// SUMMARY CONFIGURATION
// ============================================================================

export interface SummaryConfig {
  /** Maximum summary length */
  maxLength: number;
  /** Minimum memories for summarization */
  minMemories: number;
  /** Include categories in summary */
  includeCategories: boolean;
}

const DEFAULT_CONFIG: SummaryConfig = {
  maxLength: 500,
  minMemories: 3,
  includeCategories: true,
};

// ============================================================================
// SUMMARY SERVICE
// ============================================================================

export class SummaryService {
  private config: SummaryConfig;

  constructor(config: Partial<SummaryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a summary of memories
   */
  summarize(memories: NexusMemoryItem[]): string {
    if (memories.length === 0) {
      return 'No memories to summarize.';
    }

    if (memories.length < this.config.minMemories) {
      return this.briefSummary(memories);
    }

    return this.fullSummary(memories);
  }

  /**
   * Brief summary for few memories
   */
  private briefSummary(memories: NexusMemoryItem[]): string {
    const items = memories
      .slice(0, 5)
      .map(m => `• ${this.truncate(m.content, 100)}`)
      .join('\n');

    return `Memories (${memories.length}):\n${items}`;
  }

  /**
   * Full summary with categorization
   */
  private fullSummary(memories: NexusMemoryItem[]): string {
    const parts: string[] = [];
    
    // Overview
    parts.push(`Total memories: ${memories.length}`);
    
    // By category
    if (this.config.includeCategories) {
      const byCategory = this.groupByCategory(memories);
      parts.push('\nCategories:');
      
      for (const [category, items] of Object.entries(byCategory)) {
        parts.push(`\n**${category}** (${items.length}):`);
        
        // Top items by importance
        const topItems = items
          .sort((a, b) => b.importance - a.importance)
          .slice(0, 3);
        
        for (const item of topItems) {
          parts.push(`  • ${this.truncate(item.content, 80)}`);
        }
        
        if (items.length > 3) {
          parts.push(`  • ...and ${items.length - 3} more`);
        }
      }
    }

    // Key themes
    const themes = this.extractThemes(memories);
    if (themes.length > 0) {
      parts.push(`\nKey themes: ${themes.join(', ')}`);
    }

    // Truncate if too long
    let summary = parts.join('\n');
    if (summary.length > this.config.maxLength) {
      summary = summary.slice(0, this.config.maxLength - 3) + '...';
    }

    return summary;
  }

  /**
   * Group memories by category
   */
  private groupByCategory(memories: NexusMemoryItem[]): Record<string, NexusMemoryItem[]> {
    const groups: Record<string, NexusMemoryItem[]> = {};
    
    for (const memory of memories) {
      const category = memory.category || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(memory);
    }

    return groups;
  }

  /**
   * Extract common themes from memories
   */
  private extractThemes(memories: NexusMemoryItem[]): string[] {
    const wordCounts = new Map<string, number>();
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'can', 'to', 'of',
      'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
      'through', 'after', 'before', 'above', 'below', 'between',
      'and', 'or', 'but', 'not', 'no', 'so', 'if', 'then', 'else',
      'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom',
      'this', 'that', 'these', 'those', 'it', 'its', 'my', 'your',
      'his', 'her', 'their', 'our', 'i', 'me', 'you', 'he', 'she',
      'we', 'they', 'them', 'us', 'very', 'just', 'also', 'more',
    ]);

    for (const memory of memories) {
      const words = memory.content
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w));

      for (const word of words) {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      }
    }

    // Get top words that appear in multiple memories
    return Array.from(wordCounts.entries())
      .filter(([_, count]) => count >= Math.min(3, memories.length / 2))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Summarize a specific category
   */
  summarizeCategory(
    memories: NexusMemoryItem[],
    category: string
  ): string {
    const categoryMemories = memories.filter(m => m.category === category);
    
    if (categoryMemories.length === 0) {
      return `No memories in category "${category}".`;
    }

    const sorted = categoryMemories.sort((a, b) => b.importance - a.importance);
    
    let summary = `**${category}** (${categoryMemories.length} memories)\n\n`;
    
    // High importance
    const highImportance = sorted.filter(m => m.importance >= 0.7);
    if (highImportance.length > 0) {
      summary += `Important:\n`;
      summary += highImportance
        .slice(0, 3)
        .map(m => `• ${this.truncate(m.content, 100)}`)
        .join('\n');
      summary += '\n\n';
    }

    // Recent
    const recent = [...categoryMemories]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 3);
    
    summary += `Recent:\n`;
    summary += recent
      .map(m => `• ${this.truncate(m.content, 100)}`)
      .join('\n');

    return summary;
  }

  /**
   * Compact memories by combining similar ones
   */
  async compactMemories(
    memories: NexusMemoryItem[],
    similarityThreshold = 0.85
  ): Promise<{
    compacted: NexusMemoryItem[];
    removed: string[];
  }> {
    // Simple compaction - remove near-duplicates
    const compacted: NexusMemoryItem[] = [];
    const removed: string[] = [];
    const seen = new Set<string>();

    // Sort by importance (keep more important ones)
    const sorted = [...memories].sort((a, b) => b.importance - a.importance);

    for (const memory of sorted) {
      const normalizedContent = this.normalizeContent(memory.content);
      
      // Check if we've seen something similar
      let isDuplicate = false;
      for (const seenContent of seen) {
        if (this.contentSimilarity(normalizedContent, seenContent) >= similarityThreshold) {
          isDuplicate = true;
          removed.push(memory.id);
          break;
        }
      }

      if (!isDuplicate) {
        compacted.push(memory);
        seen.add(normalizedContent);
      }
    }

    return { compacted, removed };
  }

  /**
   * Normalize content for comparison
   */
  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Simple content similarity (Jaccard)
   */
  private contentSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.split(' '));
    const wordsB = new Set(b.split(' '));
    
    let intersection = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) {
        intersection++;
      }
    }
    
    const union = wordsA.size + wordsB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Truncate text
   */
  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }
}

export default SummaryService;

