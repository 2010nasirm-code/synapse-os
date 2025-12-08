/**
 * ============================================================================
 * NEXUS PRIME - EMBEDDINGS
 * ============================================================================
 * 
 * Text embedding generation with:
 * - OpenAI integration
 * - Batching support
 * - Error handling
 * - Local fallback
 * 
 * @module nexus/prime/memory/embeddings
 * @version 1.0.0
 */

import { EmbeddingVector } from '../core/types';

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface EmbeddingConfig {
  /** OpenAI API key */
  apiKey?: string;
  /** Model to use */
  model: string;
  /** Maximum batch size */
  batchSize: number;
  /** Request timeout */
  timeout: number;
  /** Use local fallback if API fails */
  localFallback: boolean;
}

const DEFAULT_CONFIG: EmbeddingConfig = {
  model: 'text-embedding-3-small',
  batchSize: 100,
  timeout: 30000,
  localFallback: true,
};

// ============================================================================
// EMBEDDING SERVICE
// ============================================================================

export class EmbeddingService {
  private config: EmbeddingConfig;

  constructor(config: Partial<EmbeddingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate embedding for text
   */
  async embedText(text: string): Promise<EmbeddingVector> {
    try {
      if (this.config.apiKey) {
        return await this.embedWithOpenAI([text]).then(r => r[0]);
      } else {
        return this.localEmbed(text);
      }
    } catch (error) {
      console.error('[Embeddings] Error:', error);
      if (this.config.localFallback) {
        return this.localEmbed(text);
      }
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
    try {
      if (this.config.apiKey) {
        const results: EmbeddingVector[] = [];
        
        // Process in batches
        for (let i = 0; i < texts.length; i += this.config.batchSize) {
          const batch = texts.slice(i, i + this.config.batchSize);
          const embeddings = await this.embedWithOpenAI(batch);
          results.push(...embeddings);
        }
        
        return results;
      } else {
        return texts.map(t => this.localEmbed(t));
      }
    } catch (error) {
      console.error('[Embeddings] Batch error:', error);
      if (this.config.localFallback) {
        return texts.map(t => this.localEmbed(t));
      }
      throw error;
    }
  }

  /**
   * Embed using OpenAI API
   */
  private async embedWithOpenAI(texts: string[]): Promise<EmbeddingVector[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: this.config.model,
      }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.data.map((item: { embedding: number[] }, index: number) => ({
      values: item.embedding,
      model: this.config.model,
      dimensions: item.embedding.length,
      createdAt: Date.now(),
      source: texts[index].slice(0, 100),
    }));
  }

  /**
   * Local fallback embedding (simple hash-based)
   * This is NOT semantic - just a fallback for development
   */
  private localEmbed(text: string): EmbeddingVector {
    const dimensions = 384; // Smaller for local
    const values = new Array(dimensions).fill(0);
    
    // Simple word-based embedding
    const words = text.toLowerCase().split(/\s+/);
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const hash = this.simpleHash(word);
      
      // Distribute hash across dimensions
      for (let d = 0; d < dimensions; d++) {
        const contribution = Math.sin(hash * (d + 1)) / Math.sqrt(words.length);
        values[d] += contribution;
      }
    }

    // Normalize
    const magnitude = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < dimensions; i++) {
        values[i] /= magnitude;
      }
    }

    return {
      values,
      model: 'local-fallback',
      dimensions,
      createdAt: Date.now(),
      source: text.slice(0, 100),
    };
  }

  /**
   * Simple string hash
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  static cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
    if (a.dimensions !== b.dimensions) {
      throw new Error('Embedding dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.dimensions; i++) {
      dotProduct += a.values[i] * b.values[i];
      normA += a.values[i] * a.values[i];
      normB += b.values[i] * b.values[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Find most similar embeddings
   */
  static findSimilar(
    query: EmbeddingVector,
    candidates: EmbeddingVector[],
    topK = 5
  ): Array<{ embedding: EmbeddingVector; similarity: number }> {
    const similarities = candidates.map(candidate => ({
      embedding: candidate,
      similarity: this.cosineSimilarity(query, candidate),
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }
}

export default EmbeddingService;

