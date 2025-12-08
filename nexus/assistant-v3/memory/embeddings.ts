/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - EMBEDDINGS
 * ============================================================================
 * 
 * Text embedding generation with OpenAI and local fallback.
 * 
 * @module nexus/assistant-v3/memory/embeddings
 * @version 3.0.0
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_DIM = 384; // Dimension for local embeddings

// ============================================================================
// EMBEDDING GENERATION
// ============================================================================

/**
 * Generate embedding for text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Try OpenAI first
  if (OPENAI_API_KEY) {
    try {
      return await generateOpenAIEmbedding(text);
    } catch (error) {
      console.error('[Embeddings] OpenAI embedding failed, using local:', error);
    }
  }

  // Fallback to local embedding
  return generateLocalEmbedding(text);
}

/**
 * Generate embedding using OpenAI
 */
async function generateOpenAIEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8000), // Truncate to limit
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI embedding error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Generate simple local embedding (hash-based)
 * This is a fallback for development/offline use
 */
function generateLocalEmbedding(text: string): number[] {
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  const embedding = new Array(EMBEDDING_DIM).fill(0);

  // Simple bag-of-words style embedding with position encoding
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const hash = simpleHash(word);
    
    // Distribute word contribution across embedding dimensions
    for (let j = 0; j < Math.min(10, EMBEDDING_DIM); j++) {
      const idx = (hash + j * 37) % EMBEDDING_DIM;
      const posWeight = 1 / (1 + i * 0.1); // Position decay
      embedding[idx] += posWeight / words.length;
    }

    // Add n-gram features
    if (i < words.length - 1) {
      const bigram = word + ' ' + words[i + 1];
      const bigramHash = simpleHash(bigram);
      const idx = bigramHash % EMBEDDING_DIM;
      embedding[idx] += 0.5 / words.length;
    }
  }

  // Add character-level features
  for (let i = 0; i < normalized.length && i < 200; i++) {
    const charCode = normalized.charCodeAt(i);
    const idx = (charCode * 7) % EMBEDDING_DIM;
    embedding[idx] += 0.01;
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}

/**
 * Simple hash function for strings
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// ============================================================================
// SIMILARITY CALCULATION
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    // Handle dimension mismatch
    const minLen = Math.min(a.length, b.length);
    a = a.slice(0, minLen);
    b = b.slice(0, minLen);
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    const minLen = Math.min(a.length, b.length);
    a = a.slice(0, minLen);
    b = b.slice(0, minLen);
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Generate embeddings for multiple texts
 */
export async function generateBatchEmbeddings(
  texts: string[]
): Promise<number[][]> {
  // For small batches, generate individually
  if (texts.length <= 5 || !OPENAI_API_KEY) {
    return Promise.all(texts.map(t => generateEmbedding(t)));
  }

  // Batch with OpenAI
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts.map(t => t.slice(0, 8000)),
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI batch embedding error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  } catch (error) {
    console.error('[Embeddings] Batch embedding failed:', error);
    // Fallback to individual local embeddings
    return texts.map(t => generateLocalEmbedding(t));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  generateEmbedding,
  generateBatchEmbeddings,
  cosineSimilarity,
  euclideanDistance,
};

