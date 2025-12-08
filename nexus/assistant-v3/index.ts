/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - MAIN EXPORT
 * ============================================================================
 * 
 * Production-grade, chat-first AI assistant.
 * 
 * @module nexus/assistant-v3
 * @version 3.0.0
 */

// Core
export * from './core/types';
export { SafetyChecker, ConsentManager, ContentFilter } from './core/safety';
export { getCoordinator, type IAgent } from './core/coordinator';
export { ContextBuilder, type RuntimeContext } from './core/contextBuilder';
export { getRouter, analyzeIntent, selectAgents, type IntentAnalysis } from './core/router';
export { ProvenanceManager, createProvenance } from './core/provenance';
export { checkRateLimit, recordRequest, getRateLimiter } from './core/rateLimit';

// Agents
export { initializeAgents, getAllAgents } from './agents';
export { getReasoningAgent } from './agents/reasoningAgent';
export { getToolAgent } from './agents/toolAgent';
export { getKnowledgeAgent } from './agents/knowledgeAgent';

// Memory
export { MemoryStore, getMemoryStore } from './memory/memoryStore';
export { generateEmbedding, cosineSimilarity } from './memory/embeddings';
export { getVectorAdapter } from './memory/vectorAdapter';

// API
export { handleAssistantRequest, handleStreamingRequest } from './api/assistant';
export { handleAgentRun, listAgents } from './api/agentRun';
export { handleApplyAction, generateConfirmationToken, validateToken } from './api/applyAction';

// Utilities
export { getLogger, getLogs } from './utils/logger';
export { estimateCost, estimateTokens } from './utils/costEstimator';
export { safeParse } from './utils/zodSchemas';

// UI Components (export separately to avoid SSR issues)
// Use: import { NexusChat } from '@/nexus/assistant-v3/ui'

/**
 * Initialize Nexus Assistant
 */
export function initializeNexusAssistant(): void {
  const { initializeAgents } = require('./agents');
  const { getLogger } = require('./utils/logger');
  
  const logger = getLogger('NexusAssistantV3');
  
  try {
    initializeAgents();
    logger.info('Nexus Assistant V3 initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Nexus Assistant V3', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    throw error;
  }
}

/**
 * Version info
 */
export const VERSION = {
  major: 3,
  minor: 0,
  patch: 0,
  string: '3.0.0',
  codename: 'Phoenix',
};

