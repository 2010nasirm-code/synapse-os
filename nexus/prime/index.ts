/**
 * ============================================================================
 * NEXUS PRIME
 * ============================================================================
 * 
 * Production-grade AI subsystem for intelligent reasoning, memory, and action
 * management. NEXUS PRIME provides:
 * 
 * - Multi-agent reasoning system
 * - Memory + vector intelligence
 * - Action pipelines + safety filters
 * - Dynamic UI interfaces
 * - Real-time insights system
 * - Automation builder engine
 * 
 * @module nexus/prime
 * @version 1.0.0
 */

// ============================================================================
// CORE
// ============================================================================

export * from './core';

// ============================================================================
// AGENTS
// ============================================================================

export {
  BaseAgent,
  OrchestratorAgent,
  InsightAgent,
  BuilderAgent,
  RepairAgent,
  UIAgent,
  AutomationAgent,
  MemoryAgent,
  EvolutionAgent,
  initializeAgents,
  getAgentInstance,
} from './agents';

// ============================================================================
// MEMORY
// ============================================================================

export {
  MemoryStore,
  EmbeddingService,
  MemoryVectorStore,
  SummaryService,
  LocalStorageAdapter,
  InMemoryAdapter,
  InMemoryVectorStore,
} from './memory';

// ============================================================================
// ACTIONS
// ============================================================================

export {
  ACTION_TYPES,
  ACTION_CONFIGS,
  ActionRouter,
  validateAction,
  routeAction,
  requestConfirmation,
  confirmAction,
  rejectAction,
  getActionPreview,
  getActionRouter,
} from './actions';

// ============================================================================
// API
// ============================================================================

export {
  handleNexusPrimeRequest,
  handleRunAgentRequest,
  handleBatchAgentRequest,
  handleApplyActionRequest,
  handleBatchApplyRequest,
} from './api';

// ============================================================================
// UI
// ============================================================================

export {
  NexusPrimeChat,
  NexusPrimePanel,
  CommandHalo,
  InsightFeed,
  useCommandHalo,
} from './ui';

// ============================================================================
// QUICK START
// ============================================================================

/**
 * Initialize NEXUS PRIME with default configuration.
 * Call this once at application startup.
 */
export function initNexusPrime(): void {
  // Initialize agents
  const { initializeAgents } = require('./agents');
  initializeAgents();

  console.log('[NEXUS PRIME] Initialized successfully');
}

// ============================================================================
// VERSION
// ============================================================================

export const NEXUS_PRIME_VERSION = '1.0.0';

