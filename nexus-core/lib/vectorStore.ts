/**
 * Vector Store
 * In-memory vector storage with similarity search
 */

interface VectorEntry {
  id: string;
  vector: number[];
  metadata: Record<string, any>;
  content: string;
}

class VectorStore {
  private vectors: Map<string, VectorEntry> = new Map();
  private dimensions = 128;

  /**
   * Add a vector to the store
   */
  async add(
    id: string,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const vector = await this.generateEmbedding(content);
    this.vectors.set(id, { id, vector, metadata, content });
  }

  /**
   * Search for similar vectors
   */
  async search(
    query: string,
    limit: number = 10,
    minSimilarity: number = 0.5
  ): Promise<Array<VectorEntry & { similarity: number }>> {
    const queryVector = await this.generateEmbedding(query);
    
    const results: Array<VectorEntry & { similarity: number }> = [];
    
    this.vectors.forEach((entry) => {
      const similarity = this.cosineSimilarity(queryVector, entry.vector);
      if (similarity >= minSimilarity) {
        results.push({ ...entry, similarity });
      }
    });

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  /**
   * Get vector by ID
   */
  get(id: string): VectorEntry | undefined {
    return this.vectors.get(id);
  }

  /**
   * Delete vector
   */
  delete(id: string): boolean {
    return this.vectors.delete(id);
  }

  /**
   * Clear all vectors
   */
  clear(): void {
    this.vectors.clear();
  }

  /**
   * Get store size
   */
  size(): number {
    return this.vectors.size;
  }

  /**
   * Export all vectors
   */
  export(): VectorEntry[] {
    return Array.from(this.vectors.values());
  }

  /**
   * Import vectors
   */
  import(entries: VectorEntry[]): void {
    entries.forEach((entry) => {
      this.vectors.set(entry.id, entry);
    });
  }

  // Private methods

  private async generateEmbedding(text: string): Promise<number[]> {
    // Simple hash-based embedding for demo
    // In production, use OpenAI embeddings or similar
    const embedding: number[] = new Array(this.dimensions).fill(0);
    
    const words = text.toLowerCase().split(/\W+/);
    words.forEach((word, wordIndex) => {
      for (let i = 0; i < word.length; i++) {
        const charCode = word.charCodeAt(i);
        const index = (charCode + wordIndex) % this.dimensions;
        embedding[index] += 1 / (i + 1);
      }
    });

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }

    return embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

// Singleton instance
export const vectorStore = new VectorStore();

// Named export for creating new instances
export function createVectorStore(): VectorStore {
  return new VectorStore();
}

