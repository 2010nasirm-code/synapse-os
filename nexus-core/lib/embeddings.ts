/**
 * Embeddings Utilities
 * Generate and manage text embeddings
 */

const EMBEDDING_DIMENSIONS = 128;

/**
 * Generate embedding for text
 * Uses simple hash-based approach for demo
 * Replace with OpenAI/Cohere embeddings in production
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // For production, use OpenAI:
  // const response = await openai.embeddings.create({
  //   model: "text-embedding-3-small",
  //   input: text,
  // });
  // return response.data[0].embedding;

  return hashBasedEmbedding(text);
}

/**
 * Generate embeddings for multiple texts
 */
export async function generateBatchEmbeddings(
  texts: string[]
): Promise<number[][]> {
  return Promise.all(texts.map(generateEmbedding));
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
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

/**
 * Calculate euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Infinity;

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += Math.pow(a[i] - b[i], 2);
  }
  return Math.sqrt(sum);
}

/**
 * Find most similar vectors to a query
 */
export function findSimilar(
  queryEmbedding: number[],
  embeddings: Array<{ id: string; embedding: number[] }>,
  topK: number = 5
): Array<{ id: string; similarity: number }> {
  const similarities = embeddings.map((item) => ({
    id: item.id,
    similarity: cosineSimilarity(queryEmbedding, item.embedding),
  }));

  return similarities
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map((val) => val / magnitude);
}

/**
 * Average multiple embeddings
 */
export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  
  const dimensions = embeddings[0].length;
  const avg = new Array(dimensions).fill(0);

  embeddings.forEach((emb) => {
    for (let i = 0; i < dimensions; i++) {
      avg[i] += emb[i] / embeddings.length;
    }
  });

  return normalizeVector(avg);
}

// Internal helpers

function hashBasedEmbedding(text: string): number[] {
  const embedding = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const words = text.toLowerCase().split(/\W+/).filter((w) => w.length > 0);

  // Simple character-based embedding
  words.forEach((word, wordIndex) => {
    for (let i = 0; i < word.length; i++) {
      const charCode = word.charCodeAt(i);
      const position = (charCode * (wordIndex + 1) + i) % EMBEDDING_DIMENSIONS;
      embedding[position] += 1 / (i + 1);
    }
  });

  // Add word-level features
  words.forEach((word, idx) => {
    const hash = simpleHash(word);
    embedding[hash % EMBEDDING_DIMENSIONS] += 0.5;
    embedding[(hash + idx) % EMBEDDING_DIMENSIONS] += 0.25;
  });

  return normalizeVector(embedding);
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}


