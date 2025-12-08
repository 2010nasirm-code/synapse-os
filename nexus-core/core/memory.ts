/**
 * Nexus Memory System
 * Long-term memory with vector embeddings and decay
 */

import type { MemoryItem, MemoryQuery, MemoryMetadata } from "./types";

// Simple in-memory store (would use vector DB in production)
const memoryStore: Map<string, MemoryItem[]> = new Map();

export class MemorySystem {
  private decayRate = 0.01; // Per day decay
  private maxItems = 10000;

  /**
   * Add a new memory item
   */
  async add(
    userId: string,
    content: string,
    type: MemoryItem["type"],
    metadata: Partial<MemoryMetadata> = {}
  ): Promise<MemoryItem> {
    const item: MemoryItem = {
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      type,
      content,
      embedding: await this.generateEmbedding(content),
      metadata: {
        source: metadata.source || "user",
        tags: metadata.tags || [],
        entities: metadata.entities || [],
        importance: metadata.importance || 0.5,
        ...metadata,
      },
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      accessCount: 0,
      decayScore: 1.0,
    };

    const userMemory = memoryStore.get(userId) || [];
    userMemory.push(item);
    
    // Enforce max items
    if (userMemory.length > this.maxItems) {
      userMemory.sort((a, b) => a.decayScore - b.decayScore);
      userMemory.splice(0, userMemory.length - this.maxItems);
    }
    
    memoryStore.set(userId, userMemory);
    return item;
  }

  /**
   * Query memory with semantic search
   */
  async query(params: MemoryQuery): Promise<MemoryItem[]> {
    const userMemory = memoryStore.get(params.userId) || [];
    let results = [...userMemory];

    // Filter by type
    if (params.type) {
      results = results.filter(m => m.type === params.type);
    }

    // Filter by tags
    if (params.tags?.length) {
      results = results.filter(m => 
        params.tags!.some(tag => m.metadata.tags?.includes(tag))
      );
    }

    // Semantic search if query provided
    if (params.query) {
      const queryEmbedding = await this.generateEmbedding(params.query);
      results = results.map(m => ({
        ...m,
        relevance: this.cosineSimilarity(queryEmbedding, m.embedding || []),
      }));
      
      results.sort((a, b) => (b as any).relevance - (a as any).relevance);
      
      if (params.minRelevance) {
        results = results.filter(m => (m as any).relevance >= params.minRelevance!);
      }
    }

    // Apply decay scores
    results = results.map(m => ({
      ...m,
      decayScore: this.calculateDecay(m),
    }));

    // Limit results
    if (params.limit) {
      results = results.slice(0, params.limit);
    }

    // Update access times
    results.forEach(m => this.recordAccess(params.userId, m.id));

    return results;
  }

  /**
   * Get memory summary for user
   */
  async getSummary(userId: string): Promise<{
    totalItems: number;
    byType: Record<string, number>;
    topTags: string[];
    recentTopics: string[];
  }> {
    const userMemory = memoryStore.get(userId) || [];
    
    const byType: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    
    userMemory.forEach(m => {
      byType[m.type] = (byType[m.type] || 0) + 1;
      m.metadata.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag]) => tag);

    const recentTopics = userMemory
      .sort((a, b) => new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime())
      .slice(0, 5)
      .flatMap(m => m.metadata.tags || [])
      .filter((v, i, a) => a.indexOf(v) === i);

    return {
      totalItems: userMemory.length,
      byType,
      topTags,
      recentTopics,
    };
  }

  /**
   * Delete a memory item
   */
  async delete(userId: string, memoryId: string): Promise<boolean> {
    const userMemory = memoryStore.get(userId) || [];
    const index = userMemory.findIndex(m => m.id === memoryId);
    if (index === -1) return false;
    userMemory.splice(index, 1);
    memoryStore.set(userId, userMemory);
    return true;
  }

  /**
   * Clear all memory for user
   */
  async clearAll(userId: string): Promise<void> {
    memoryStore.delete(userId);
  }

  /**
   * Export all memory as JSON
   */
  async export(userId: string): Promise<MemoryItem[]> {
    return memoryStore.get(userId) || [];
  }

  /**
   * Import memory from JSON
   */
  async import(userId: string, items: MemoryItem[]): Promise<void> {
    memoryStore.set(userId, items);
  }

  // Private helpers
  
  private async generateEmbedding(text: string): Promise<number[]> {
    // Simple hash-based embedding for demo
    // In production, use OpenAI embeddings or similar
    const hash = text.split("").reduce((acc, char) => {
      return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
    }, 0);
    
    const embedding: number[] = [];
    let seed = Math.abs(hash);
    for (let i = 0; i < 128; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      embedding.push((seed / 0x7fffffff) * 2 - 1);
    }
    return embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private calculateDecay(item: MemoryItem): number {
    const daysSinceAccess = (Date.now() - new Date(item.lastAccessedAt).getTime()) / (1000 * 60 * 60 * 24);
    const decay = Math.exp(-this.decayRate * daysSinceAccess);
    const importanceBoost = (item.metadata.importance || 0.5) * 0.5;
    const accessBoost = Math.min(item.accessCount * 0.01, 0.3);
    return Math.min(decay + importanceBoost + accessBoost, 1);
  }

  private recordAccess(userId: string, memoryId: string): void {
    const userMemory = memoryStore.get(userId) || [];
    const item = userMemory.find(m => m.id === memoryId);
    if (item) {
      item.lastAccessedAt = new Date().toISOString();
      item.accessCount++;
    }
  }
}

export const memorySystem = new MemorySystem();


