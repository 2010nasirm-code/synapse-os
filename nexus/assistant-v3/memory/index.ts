/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - MEMORY MODULE
 * ============================================================================
 * 
 * @module nexus/assistant-v3/memory
 * @version 3.0.0
 */

export { MemoryStore, getMemoryStore } from './memoryStore';
export { 
  generateEmbedding, 
  generateBatchEmbeddings, 
  cosineSimilarity, 
  euclideanDistance 
} from './embeddings';
export { 
  InMemoryVectorAdapter, 
  QdrantAdapter, 
  PineconeAdapter, 
  getVectorAdapter, 
  setVectorAdapter,
  type VectorAdapter,
  type VectorEntry,
  type SearchResult,
} from './vectorAdapter';
export { 
  summarizeMemories, 
  generateTopicCloud, 
  compactMemories 
} from './summarizer';

