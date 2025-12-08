/**
 * @module lib
 * @description Nexus Library Layer - Shared Utilities
 * 
 * Centralized exports for all library modules.
 * 
 * @version 1.0.0
 */

// Logging
export { logger } from "./logger";

// Caching
export { 
  LRUCache, 
  memoize, 
  BatchProcessor, 
  globalCache, 
  queryCache, 
  embeddingCache 
} from "./cache";

// Validation
export { 
  validate, 
  sanitizeString, 
  sanitizeObject, 
  CommonSchemas,
  type ValidationResult,
  type ValidationSchema,
  type ValidationRule,
} from "./validation";

// Error Handling
export {
  NexusError,
  ValidationError,
  NotFoundError,
  AgentError,
  RateLimitError,
  ExternalServiceError,
  ErrorCodes,
  withErrorHandling,
  toNexusError,
  isOperationalError,
  formatErrorResponse,
} from "./errors";

// Utilities
export {
  // String
  generateId,
  truncate,
  slugify,
  capitalize,
  titleCase,
  // Object
  deepClone,
  deepMerge,
  isObject,
  pick,
  omit,
  get,
  // Array
  groupBy,
  unique,
  chunk,
  shuffle,
  // Async
  sleep,
  retry,
  withTimeout,
  debounce,
  throttle,
  // Date
  formatRelativeTime,
  isToday,
  // Format
  formatBytes,
  formatNumber,
  formatPercent,
} from "./utils";

// Database
export { db, query, insert, update, remove, NexusTables } from "./db";

// Vector Store
export { vectorStore, createVectorStore } from "./vectorStore";

// Embeddings
export {
  generateEmbedding,
  generateBatchEmbeddings,
  cosineSimilarity,
  euclideanDistance,
  findSimilar,
  normalizeVector,
  averageEmbeddings,
} from "./embeddings";

// Exporter
export { exportData, createDownloadBlob, downloadFile } from "./exporter";

