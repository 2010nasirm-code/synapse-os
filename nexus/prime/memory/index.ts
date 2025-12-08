/**
 * ============================================================================
 * NEXUS PRIME - MEMORY MODULE
 * ============================================================================
 * 
 * Central exports for the NEXUS PRIME memory system.
 * 
 * @module nexus/prime/memory
 * @version 1.0.0
 */

// Store
export {
  MemoryStore,
  LocalStorageAdapter,
  InMemoryAdapter,
  type MemoryStorageAdapter,
  type MemoryStoreConfig,
} from './store';

// Embeddings
export {
  EmbeddingService,
  type EmbeddingConfig,
} from './embeddings';

// Vector Adapter
export {
  MemoryVectorStore,
  InMemoryVectorStore,
  type VectorStoreAdapter,
} from './vectorAdapter';

// Summaries
export {
  SummaryService,
  type SummaryConfig,
} from './summaries';

