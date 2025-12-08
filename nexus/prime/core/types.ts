/**
 * ============================================================================
 * NEXUS PRIME - CORE TYPE DEFINITIONS
 * ============================================================================
 * 
 * This file defines all shared types for the NEXUS PRIME AI system.
 * All types are stable, extendable, and used across all modules.
 * 
 * @module nexus/prime/core/types
 * @version 1.0.0
 */

// ============================================================================
// REQUEST / RESPONSE TYPES
// ============================================================================

/**
 * Incoming AI request from user or system
 */
export interface AIRequest {
  /** Unique request identifier */
  id: string;
  /** User's natural language prompt */
  prompt: string;
  /** Optional specific agent to target */
  targetAgent?: AgentType;
  /** Request context */
  context?: Partial<SystemContext>;
  /** Request metadata */
  metadata?: Record<string, unknown>;
  /** Conversation history for context */
  conversationHistory?: ConversationMessage[];
}

/**
 * AI system response
 */
export interface AIResponse {
  /** Request ID this responds to */
  requestId: string;
  /** Primary answer text */
  answer: string;
  /** Structured response data */
  data?: Record<string, unknown>;
  /** Generated insights */
  insights: Insight[];
  /** Proposed action drafts (require confirmation) */
  actionDrafts: ActionDraft[];
  /** Agents that contributed */
  agentsUsed: AgentType[];
  /** Provenance chain */
  provenance: ProvenanceRecord[];
  /** Response quality score */
  confidence: number;
  /** Processing time in ms */
  processingTime: number;
  /** Any warnings or notes */
  warnings?: string[];
}

/**
 * Single conversation message
 */
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  agentId?: AgentType;
}

// ============================================================================
// AGENT TYPES
// ============================================================================

/**
 * Available agent types
 */
export type AgentType = 
  | 'orchestrator'
  | 'insight'
  | 'builder'
  | 'repair'
  | 'ui'
  | 'automation'
  | 'memory'
  | 'evolution';

/**
 * Agent configuration
 */
export interface AgentConfig {
  /** Agent identifier */
  id: AgentType;
  /** Human-readable name */
  name: string;
  /** Agent description */
  description: string;
  /** Agent capabilities */
  capabilities: string[];
  /** Rate limit (requests per minute) */
  rateLimit: number;
  /** Safety tier (higher = more restricted) */
  safetyTier: 1 | 2 | 3;
  /** Whether agent can produce action drafts */
  canProduceActions: boolean;
  /** Whether agent needs context */
  requiresContext: boolean;
  /** Timeout in ms */
  timeout: number;
}

/**
 * Result from a single agent
 */
export interface AgentResult {
  /** Agent that produced this */
  agentId: AgentType;
  /** Success status */
  success: boolean;
  /** Primary answer */
  answer: string;
  /** Structured data output */
  data?: Record<string, unknown>;
  /** Generated insights */
  insights: Insight[];
  /** Proposed actions (drafts only) */
  actionDrafts: ActionDraft[];
  /** Provenance log */
  provenance: ProvenanceRecord;
  /** Confidence score 0-1 */
  confidence: number;
  /** Processing time */
  processingTimeMs: number;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

/**
 * Types of actions the system can propose
 */
export type ActionType = 
  | 'create_tracker'
  | 'update_tracker'
  | 'delete_tracker'
  | 'create_item'
  | 'update_item'
  | 'delete_item'
  | 'create_insight'
  | 'create_automation'
  | 'update_automation'
  | 'delete_automation'
  | 'apply_patch'
  | 'create_suggestion'
  | 'update_dashboard'
  | 'create_layout'
  | 'navigate_ui'
  | 'highlight_ui'
  | 'store_memory'
  | 'delete_memory'
  | 'send_notification';

/**
 * Safety level for actions
 */
export type ActionSafetyLevel = 'low' | 'medium' | 'high';

/**
 * Action draft (proposed action)
 */
export interface ActionDraft {
  /** Unique action ID */
  id: string;
  /** Action type */
  type: string;
  /** Short title */
  title: string;
  /** Human-readable description */
  description: string;
  /** Action payload */
  payload: Record<string, unknown>;
  /** Source agent */
  source: string;
  /** Whether confirmation is required */
  requiresConfirmation: boolean;
  /** Safety level */
  safetyLevel: 'low' | 'medium' | 'high';
  /** Preview of what will happen */
  preview?: string;
  /** Estimated impact */
  estimatedImpact?: string;
  /** Whether action is reversible */
  reversible?: boolean;
  /** When action was created */
  createdAt: number;
}

/**
 * Confirmed action
 */
export interface NexusAction extends ActionDraft {
  /** User who confirmed */
  confirmedBy: string;
  /** When confirmed */
  confirmedAt: number;
  /** Execution status */
  status: 'pending' | 'confirmed' | 'completed' | 'failed';
}

/**
 * Confirmation request for action
 */
export interface ActionConfirmation {
  /** Draft ID to confirm */
  draftId: string;
  /** Confirmation token */
  token: string;
  /** User who confirmed */
  confirmedBy: string;
  /** Timestamp */
  confirmedAt: number;
  /** Optional reason */
  reason?: string;
}

// ============================================================================
// INSIGHT TYPES
// ============================================================================

/**
 * Insight severity/importance level
 */
export type InsightLevel = 'info' | 'success' | 'warning' | 'critical';

/**
 * Insight category
 */
export type InsightCategory = 
  | 'trend'
  | 'anomaly'
  | 'correlation'
  | 'prediction'
  | 'optimization'
  | 'risk'
  | 'opportunity'
  | 'reminder';

/**
 * Generated insight
 */
export interface Insight {
  /** Unique insight ID */
  id: string;
  /** Insight type */
  type: string;
  /** Insight title */
  title: string;
  /** Detailed description */
  description: string;
  /** Importance level */
  level: InsightLevel;
  /** Confidence score 0-1 */
  confidence: number;
  /** Source agent */
  source: string;
  /** Timestamp */
  timestamp: number;
  /** Related data */
  data?: Record<string, unknown>;
  /** Suggestions */
  suggestions?: string[];
  /** Related item IDs */
  relatedItems?: string[];
}

// ============================================================================
// MEMORY TYPES
// ============================================================================

/**
 * Memory item category
 */
export type MemoryCategory = 
  | 'general'
  | 'preference'
  | 'fact'
  | 'conversation'
  | 'task'
  | 'insight'
  | 'automation';

/**
 * Memory item stored in the system
 */
export interface NexusMemoryItem {
  /** Unique memory ID */
  id: string;
  /** Memory category */
  category?: MemoryCategory;
  /** Content text */
  content: string;
  /** Content summary */
  summary?: string;
  /** Embedding vector */
  embedding?: EmbeddingVector;
  /** Importance score 0-1 */
  importance: number;
  /** Creation timestamp */
  createdAt: number;
  /** Last accessed timestamp */
  lastAccessedAt: number;
  /** Access count */
  accessCount: number;
  /** Tags */
  tags?: string[];
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Embedding vector
 */
export interface EmbeddingVector {
  /** Vector values */
  values: number[];
  /** Vector dimensions */
  dimensions: number;
  /** Model used to generate */
  model: string;
  /** Created at timestamp */
  createdAt?: number;
  /** Source text snippet */
  source?: string;
}

/**
 * Memory search options
 */
export interface MemorySearchOptions {
  /** Categories to search */
  categories?: MemoryCategory[];
  /** Minimum importance */
  minImportance?: number;
  /** Maximum age in ms */
  maxAge?: number;
  /** Maximum results */
  limit?: number;
  /** Similarity threshold for vector search */
  similarityThreshold?: number;
}

/**
 * Memory search result
 */
export interface MemorySearchResult {
  /** Memory item */
  item: NexusMemoryItem;
  /** Relevance score */
  relevance: number;
  /** Match type */
  matchType: 'vector' | 'keyword' | 'recency' | 'hybrid';
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * System context for AI requests
 */
export interface SystemContext {
  /** User information */
  user: {
    id: string;
    email?: string;
    name?: string;
    preferences?: Record<string, unknown>;
  };
  /** Current UI state */
  ui: {
    currentPage: string;
    currentRoute: string;
    selectedItems?: string[];
    openPanels?: string[];
    theme: 'light' | 'dark';
  };
  /** Active data context */
  data: {
    activeTrackerId?: string;
    activeItemId?: string;
    visibleItems?: string[];
    recentQueries?: string[];
  };
  /** Relevant memories */
  memories: NexusMemoryItem[];
  /** Session info */
  session: {
    id: string;
    startedAt: number;
    messageCount: number;
  };
  /** Feature flags */
  features: Record<string, boolean>;
  /** Safety tier for this request */
  safetyTier: 1 | 2 | 3;
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// PROVENANCE TYPES
// ============================================================================

/**
 * Provenance record for audit trail
 */
export interface ProvenanceRecord {
  /** Unique record ID */
  id: string;
  /** Request ID */
  requestId: string;
  /** Agent that produced this */
  agentId: AgentType;
  /** Operation performed */
  operation: string;
  /** Input summary (sanitized) */
  inputSummary: string;
  /** Output summary (sanitized) */
  outputSummary: string;
  /** Timestamp */
  timestamp: number;
  /** Duration in ms */
  durationMs: number;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Parent record ID (for chains) */
  parentId?: string;
  /** Child record IDs */
  childIds?: string[];
}

// ============================================================================
// AUTOMATION TYPES
// ============================================================================

/**
 * Trigger type for automations
 */
export type AutomationTrigger = 
  | 'schedule'
  | 'event'
  | 'condition'
  | 'manual'
  | 'webhook';

/**
 * Automation blueprint
 */
export interface AutomationBlueprint {
  /** Unique automation ID */
  id: string;
  /** Automation name */
  name: string;
  /** Description */
  description: string;
  /** Trigger configuration */
  trigger: {
    type: string;
    config: Record<string, unknown>;
    description: string;
  };
  /** Actions to execute */
  actions: Array<{
    type: string;
    config: Record<string, unknown>;
    description: string;
    order: number;
  }>;
  /** Whether automation is active */
  enabled: boolean;
  /** Created at */
  createdAt: number;
}

/**
 * Automation condition
 */
export interface AutomationCondition {
  /** Field to check */
  field: string;
  /** Operator */
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'exists' | 'not_exists';
  /** Value to compare */
  value: unknown;
  /** Logical connector to next condition */
  connector?: 'and' | 'or';
}

/**
 * Automation action
 */
export interface AutomationAction {
  /** Action type */
  type: ActionType;
  /** Action config */
  config: Record<string, unknown>;
  /** Delay before execution in ms */
  delay?: number;
  /** Continue on error */
  continueOnError?: boolean;
}

// ============================================================================
// PATCH TYPES
// ============================================================================

/**
 * Code patch suggestion
 */
export interface PatchSuggestion {
  /** Unique patch ID */
  id: string;
  /** File path */
  file: string;
  /** Patch description */
  description: string;
  /** Original content */
  before: string;
  /** New content */
  after: string;
  /** Start line */
  lineStart: number;
  /** End line */
  lineEnd: number;
  /** Reason for patch */
  reason: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  /** Requests remaining */
  remaining: number;
  /** Reset timestamp */
  resetAt: number;
  /** Max requests */
  limit: number;
  /** Window in ms */
  window: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /** Whether valid */
  valid: boolean;
  /** Validation errors */
  errors: ValidationError[];
  /** Warnings */
  warnings: string[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /** Field path */
  field: string;
  /** Error code */
  code: string;
  /** Error message */
  message: string;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = unknown> {
  /** Success status */
  success: boolean;
  /** Response data */
  data?: T;
  /** Error message */
  error?: string;
  /** Error details */
  errorDetails?: Record<string, unknown>;
  /** Request ID */
  requestId: string;
  /** Timestamp */
  timestamp: number;
}

