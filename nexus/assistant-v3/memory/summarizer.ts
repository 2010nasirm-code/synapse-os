/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - MEMORY SUMMARIZER
 * ============================================================================
 * 
 * Auto-summarization and memory compaction.
 * 
 * @module nexus/assistant-v3/memory/summarizer
 * @version 3.0.0
 */

import { MemoryItem, MemoryType } from '../core/types';
import { getMemoryStore } from './memoryStore';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_SUMMARY_LENGTH = 500;
const COMPACTION_THRESHOLD = 100; // Memories before compaction

// ============================================================================
// SUMMARIZATION
// ============================================================================

/**
 * Summarize a collection of memories
 */
export function summarizeMemories(memories: MemoryItem[]): string {
  if (memories.length === 0) return 'No memories to summarize.';

  // Group by type
  const grouped = new Map<MemoryType, MemoryItem[]>();
  for (const memory of memories) {
    const existing = grouped.get(memory.type) || [];
    existing.push(memory);
    grouped.set(memory.type, existing);
  }

  // Build summary
  const parts: string[] = [];

  // Facts
  const facts = grouped.get('fact') || [];
  if (facts.length > 0) {
    parts.push(`**Known facts (${facts.length}):**`);
    facts.slice(0, 5).forEach(f => parts.push(`- ${f.text.slice(0, 100)}`));
  }

  // Preferences
  const preferences = grouped.get('preference') || [];
  if (preferences.length > 0) {
    parts.push(`\n**Preferences (${preferences.length}):**`);
    preferences.slice(0, 5).forEach(p => parts.push(`- ${p.text.slice(0, 100)}`));
  }

  // Insights
  const insights = grouped.get('insight') || [];
  if (insights.length > 0) {
    parts.push(`\n**Insights (${insights.length}):**`);
    insights.slice(0, 3).forEach(i => parts.push(`- ${i.text.slice(0, 100)}`));
  }

  // Context
  const context = grouped.get('context') || [];
  if (context.length > 0) {
    parts.push(`\n**Recent context (${context.length} items)**`);
  }

  let summary = parts.join('\n');
  
  // Truncate if too long
  if (summary.length > MAX_SUMMARY_LENGTH) {
    summary = summary.slice(0, MAX_SUMMARY_LENGTH) + '...';
  }

  return summary;
}

/**
 * Generate a topic cloud from memories
 */
export function generateTopicCloud(memories: MemoryItem[]): Map<string, number> {
  const topics = new Map<string, number>();
  
  // Simple word frequency analysis
  for (const memory of memories) {
    const words = memory.text.toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3)
      .filter(w => !STOP_WORDS.has(w));

    for (const word of words) {
      const count = topics.get(word) || 0;
      topics.set(word, count + 1);
    }
  }

  // Sort by frequency and return top 20
  const sorted = Array.from(topics.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  return new Map(sorted);
}

// Common stop words to filter out
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'must', 'can',
  'this', 'that', 'these', 'those', 'what', 'which', 'who',
  'whom', 'where', 'when', 'why', 'how', 'and', 'but', 'or',
  'nor', 'for', 'yet', 'so', 'with', 'from', 'into', 'through',
  'during', 'before', 'after', 'above', 'below', 'between',
  'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such',
  'only', 'own', 'same', 'than', 'too', 'very', 'just', 'also',
]);

// ============================================================================
// COMPACTION
// ============================================================================

/**
 * Compact old memories by summarizing and merging
 */
export async function compactMemories(userId: string): Promise<{
  removed: number;
  summarized: number;
}> {
  const store = getMemoryStore(userId);
  const memories = await store.getAll();

  if (memories.length < COMPACTION_THRESHOLD) {
    return { removed: 0, summarized: 0 };
  }

  // Group similar memories
  const groups = groupSimilarMemories(memories);
  let removed = 0;
  let summarized = 0;

  for (const group of groups) {
    if (group.length < 3) continue;

    // Keep the most important memory
    group.sort((a, b) => (b.importance || 0.5) - (a.importance || 0.5));
    const keeper = group[0];

    // Summarize the rest
    const summary = group
      .slice(1)
      .map(m => m.text)
      .join('; ')
      .slice(0, 200);

    // Update keeper with summary context
    if (keeper.tags) {
      keeper.tags.push('summarized');
    } else {
      keeper.tags = ['summarized'];
    }

    // Delete merged memories
    for (let i = 1; i < group.length; i++) {
      await store.delete(group[i].id);
      removed++;
    }
    summarized++;
  }

  return { removed, summarized };
}

/**
 * Group memories by similarity
 */
function groupSimilarMemories(memories: MemoryItem[]): MemoryItem[][] {
  const groups: MemoryItem[][] = [];
  const used = new Set<string>();

  for (const memory of memories) {
    if (used.has(memory.id)) continue;

    const group: MemoryItem[] = [memory];
    used.add(memory.id);

    // Find similar memories
    for (const other of memories) {
      if (used.has(other.id)) continue;
      if (memory.type !== other.type) continue;

      // Simple similarity check (word overlap)
      const similarity = wordOverlap(memory.text, other.text);
      if (similarity > 0.5) {
        group.push(other);
        used.add(other.id);
      }
    }

    if (group.length > 1) {
      groups.push(group);
    }
  }

  return groups;
}

/**
 * Calculate word overlap between two texts
 */
function wordOverlap(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 3));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) overlap++;
  }

  return overlap / Math.max(wordsA.size, wordsB.size);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  summarizeMemories,
  generateTopicCloud,
  compactMemories,
};

