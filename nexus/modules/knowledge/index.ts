// ============================================================================
// NEXUS MODULES - Knowledge Module
// ============================================================================

import { KnowledgeNode } from '../../types';
import { generateUUID, now, groupBy } from '../../utils';
import { eventBus } from '../../core/engine';
import { nexusMemory } from '../../systems/nexus_memory';

export interface KnowledgeCreateInput {
  type: KnowledgeNode['type'];
  title: string;
  content: string;
  tags?: string[];
  embedding?: number[];
  relations?: { nodeId: string; type: string }[];
}

export interface KnowledgeSearchOptions {
  query?: string;
  type?: KnowledgeNode['type'];
  tags?: string[];
  limit?: number;
  includeRelated?: boolean;
}

export class KnowledgeModule {
  private nodes: Map<string, KnowledgeNode> = new Map();

  // ----------------------------- CRUD Operations ----------------------------
  create(userId: string, input: KnowledgeCreateInput): KnowledgeNode {
    const node: KnowledgeNode = {
      id: generateUUID(),
      userId,
      type: input.type,
      title: input.title,
      content: input.content,
      embedding: input.embedding,
      tags: input.tags || [],
      relations: input.relations || [],
      createdAt: now(),
      updatedAt: now(),
    };

    this.nodes.set(node.id, node);
    
    // Store in semantic memory
    nexusMemory.semantic.add(node.content, {
      importance: 0.6,
      tags: node.tags,
      metadata: { nodeId: node.id, type: node.type },
      embedding: node.embedding,
    });
    
    eventBus.emit('knowledge:created', node);
    
    return node;
  }

  get(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id);
  }

  update(id: string, updates: Partial<KnowledgeCreateInput>): KnowledgeNode | undefined {
    const node = this.nodes.get(id);
    if (!node) return undefined;

    if (updates.title) node.title = updates.title;
    if (updates.content) node.content = updates.content;
    if (updates.tags) node.tags = updates.tags;
    if (updates.embedding) node.embedding = updates.embedding;
    if (updates.relations) node.relations = updates.relations;
    node.updatedAt = now();

    eventBus.emit('knowledge:updated', node);
    return node;
  }

  delete(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    // Remove relations from other nodes
    const nodes = Array.from(this.nodes.values());
    for (const otherNode of nodes) {
      otherNode.relations = otherNode.relations.filter(r => r.nodeId !== id);
    }

    this.nodes.delete(id);
    eventBus.emit('knowledge:deleted', { id });
    return true;
  }

  // ----------------------------- Relations ----------------------------------
  link(sourceId: string, targetId: string, relationType: string): boolean {
    const source = this.nodes.get(sourceId);
    const target = this.nodes.get(targetId);
    if (!source || !target) return false;

    // Add relation if not exists
    const exists = source.relations.some(
      r => r.nodeId === targetId && r.type === relationType
    );
    
    if (!exists) {
      source.relations.push({ nodeId: targetId, type: relationType });
      source.updatedAt = now();
      eventBus.emit('knowledge:linked', { sourceId, targetId, type: relationType });
    }

    return true;
  }

  unlink(sourceId: string, targetId: string, relationType?: string): boolean {
    const source = this.nodes.get(sourceId);
    if (!source) return false;

    const initialLength = source.relations.length;
    source.relations = source.relations.filter(r => {
      if (r.nodeId !== targetId) return true;
      if (relationType && r.type !== relationType) return true;
      return false;
    });

    if (source.relations.length !== initialLength) {
      source.updatedAt = now();
      eventBus.emit('knowledge:unlinked', { sourceId, targetId });
      return true;
    }

    return false;
  }

  getRelated(id: string, relationType?: string): KnowledgeNode[] {
    const node = this.nodes.get(id);
    if (!node) return [];

    const relations = relationType
      ? node.relations.filter(r => r.type === relationType)
      : node.relations;

    return relations
      .map(r => this.nodes.get(r.nodeId))
      .filter((n): n is KnowledgeNode => n !== undefined);
  }

  // ----------------------------- Search -------------------------------------
  search(userId: string, options: KnowledgeSearchOptions = {}): KnowledgeNode[] {
    let results = Array.from(this.nodes.values())
      .filter(n => n.userId === userId);

    if (options.type) {
      results = results.filter(n => n.type === options.type);
    }

    if (options.tags && options.tags.length > 0) {
      results = results.filter(n => 
        options.tags!.some(tag => n.tags.includes(tag))
      );
    }

    if (options.query) {
      const queryLower = options.query.toLowerCase();
      results = results.filter(n => 
        n.title.toLowerCase().includes(queryLower) ||
        n.content.toLowerCase().includes(queryLower) ||
        n.tags.some(t => t.toLowerCase().includes(queryLower))
      );

      // Sort by relevance (title matches first)
      results.sort((a, b) => {
        const aTitle = a.title.toLowerCase().includes(queryLower) ? 1 : 0;
        const bTitle = b.title.toLowerCase().includes(queryLower) ? 1 : 0;
        return bTitle - aTitle;
      });
    }

    const limit = options.limit || 50;
    results = results.slice(0, limit);

    // Include related nodes if requested
    if (options.includeRelated) {
      const relatedIds = new Set<string>();
      for (const node of results) {
        for (const rel of node.relations) {
          relatedIds.add(rel.nodeId);
        }
      }
      
      const ids = Array.from(relatedIds);
      for (const id of ids) {
        const node = this.nodes.get(id);
        if (node && node.userId === userId && !results.find(r => r.id === id)) {
          results.push(node);
        }
      }
    }

    return results;
  }

  // ----------------------------- Semantic Search ----------------------------
  async semanticSearch(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<KnowledgeNode[]> {
    // Use memory system for semantic search
    const results = nexusMemory.search(query, { types: ['semantic'], limit });
    
    const nodeIds = results
      .map(r => (r.item.metadata as { nodeId?: string })?.nodeId)
      .filter((id): id is string => id !== undefined);

    return nodeIds
      .map(id => this.nodes.get(id))
      .filter((n): n is KnowledgeNode => n !== undefined && n.userId === userId);
  }

  // ----------------------------- Topic Clustering ---------------------------
  getTopics(userId: string): Map<string, KnowledgeNode[]> {
    const nodes = Array.from(this.nodes.values())
      .filter(n => n.userId === userId);

    const topics = new Map<string, KnowledgeNode[]>();

    // Group by tags
    for (const node of nodes) {
      for (const tag of node.tags) {
        if (!topics.has(tag)) {
          topics.set(tag, []);
        }
        topics.get(tag)!.push(node);
      }
    }

    // Also group uncategorized
    const uncategorized = nodes.filter(n => n.tags.length === 0);
    if (uncategorized.length > 0) {
      topics.set('uncategorized', uncategorized);
    }

    return topics;
  }

  // ----------------------------- Graph Export -------------------------------
  exportGraph(userId: string): {
    nodes: Array<{ id: string; label: string; type: string }>;
    edges: Array<{ source: string; target: string; type: string }>;
  } {
    const userNodes = Array.from(this.nodes.values())
      .filter(n => n.userId === userId);

    const nodes = userNodes.map(n => ({
      id: n.id,
      label: n.title,
      type: n.type,
    }));

    const edges: Array<{ source: string; target: string; type: string }> = [];
    for (const node of userNodes) {
      for (const rel of node.relations) {
        if (userNodes.find(n => n.id === rel.nodeId)) {
          edges.push({
            source: node.id,
            target: rel.nodeId,
            type: rel.type,
          });
        }
      }
    }

    return { nodes, edges };
  }

  // ----------------------------- Query Operations ---------------------------
  getByUser(userId: string): KnowledgeNode[] {
    return Array.from(this.nodes.values()).filter(n => n.userId === userId);
  }

  getByType(userId: string, type: KnowledgeNode['type']): KnowledgeNode[] {
    return this.getByUser(userId).filter(n => n.type === type);
  }

  getRecent(userId: string, limit: number = 10): KnowledgeNode[] {
    return this.getByUser(userId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, limit);
  }

  // ----------------------------- Statistics ---------------------------------
  getStats(userId?: string) {
    let nodes = Array.from(this.nodes.values());
    if (userId) {
      nodes = nodes.filter(n => n.userId === userId);
    }

    const byType = groupBy(nodes, 'type');
    const allTags = nodes.flatMap(n => n.tags);
    const tagCounts = new Map<string, number>();
    for (const tag of allTags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }

    return {
      totalNodes: nodes.length,
      byType: Object.fromEntries(
        Object.entries(byType).map(([k, v]) => [k, v.length])
      ),
      totalRelations: nodes.reduce((sum, n) => sum + n.relations.length, 0),
      uniqueTags: tagCounts.size,
      topTags: Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count })),
    };
  }
}

// Singleton instance
export const knowledgeModule = new KnowledgeModule();
export default knowledgeModule;


