/**
 * ============================================================================
 * NEXUS PRIME - CORE MODULE
 * ============================================================================
 * 
 * Central exports for the NEXUS PRIME core system.
 * 
 * @module nexus/prime/core
 * @version 1.0.0
 */

// Types
export * from './types';

// Context
export { 
  ContextBuilder,
  buildContext,
  rankMemories,
  summarizeContext,
} from './context';

// Registry
export {
  AgentRegistry,
  getRegistry,
  registerAgent,
  getAgent,
  getAgentConfig,
  type INexusAgent,
} from './registry';

// Router
export {
  RequestRouter,
  getRouter,
  routeRequest,
} from './router';

// Safety
export {
  SafetyFilter,
  ActionSafetyCheck,
  ContentSanitizer,
  filterUnsafeActions,
  checkActionSafety,
  sanitizeContent,
} from './safety';

// Rate Limiting
export {
  RateLimiter,
  isRequestAllowed,
  recordRequest,
  getRateLimitStatus,
} from './rateLimit';

// Provenance
export {
  ProvenanceManager,
  createProvenance,
  getProvenanceChain,
} from './provenance';

// Validation
export {
  Validator,
  validateAIRequest,
  validateActionDraft,
  validateInsight,
} from './validator';

