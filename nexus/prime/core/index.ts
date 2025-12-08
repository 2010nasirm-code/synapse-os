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
  SafetyValidator,
  filterUnsafeActions,
  sanitizeUserInput,
  sanitizeOutput,
} from './safety';

// Rate Limiting
export {
  RateLimiter,
  isRequestAllowed,
  recordRequest,
  getRateLimitHeaders,
} from './rateLimit';

// Provenance
export {
  ProvenanceBuilder,
  createProvenance,
  getProvenanceChain,
  getRequestProvenance,
} from './provenance';

// Validation
export {
  Validator,
  isValidAIRequest,
  isValidActionDraft,
} from './validator';
