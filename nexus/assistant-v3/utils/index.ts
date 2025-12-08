/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - UTILITIES MODULE
 * ============================================================================
 * 
 * @module nexus/assistant-v3/utils
 * @version 3.0.0
 */

// Validators
export {
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  isNonEmptyString,
  validateAssistantRequest,
  validateActionDraft,
  validateMemoryItem,
  sanitizeString,
  sanitizeObject,
} from './validators';

// Zod Schemas
export {
  PersonaTypeSchema,
  SkillLevelSchema,
  RequestOptionsSchema,
  UIContextSchema,
  AssistantRequestSchema,
  ActionTypeSchema,
  ActionDraftSchema,
  MemoryTypeSchema,
  MemoryItemSchema,
  AgentRunRequestSchema,
  ApplyActionRequestSchema,
  ConsentStatusSchema,
  safeParse,
  type AssistantRequestInput,
  type ActionDraftInput,
  type MemoryItemInput,
  type AgentRunRequestInput,
  type ApplyActionRequestInput,
  type ConsentStatusInput,
} from './zodSchemas';

// Logger
export {
  Logger,
  getLogger,
  getLogs,
  clearLogs,
  exportLogs,
  type LogLevel,
  type LogEntry,
} from './logger';

// Consent
export {
  getStoredConsent,
  storeConsent,
  clearConsent,
  CONSENT_PROMPTS,
  isConsentValid,
  getConsentSummary,
  ConsentBuilder,
  containsSensitiveContent,
  type ConsentPrompt,
} from './consent';

// Cost Estimator
export {
  estimateCost,
  estimateTokens,
  recordCost,
  getTotalCosts,
  getCostHistory,
  clearCostHistory,
  setBudget,
  checkBudget,
  type CostEstimateInput,
  type CostEstimate,
} from './costEstimator';

