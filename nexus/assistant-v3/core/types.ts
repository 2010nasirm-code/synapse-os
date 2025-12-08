/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - CORE TYPES
 * ============================================================================
 * 
 * All TypeScript interfaces and types for the assistant system.
 * 
 * @module nexus/assistant-v3/core/types
 * @version 3.0.0
 */

// ============================================================================
// REQUEST & RESPONSE TYPES
// ============================================================================

export interface AIRequest {
  /** User ID (optional, for personalization) */
  userId?: string;
  /** The user's query/message */
  query: string;
  /** Current UI context (page, selected items, etc.) */
  uiContext?: UIContext;
  /** Selected persona */
  persona?: PersonaType;
  /** Session ID for conversation continuity */
  sessionId?: string;
  /** Additional options */
  options?: RequestOptions;
}

export interface RequestOptions {
  /** Enable streaming response */
  stream?: boolean;
  /** Max response tokens */
  maxTokens?: number;
  /** Temperature for randomness */
  temperature?: number;
  /** Include provenance in response */
  includeProvenance?: boolean;
  /** Enable web search */
  enableWebSearch?: boolean;
  /** Skill level override */
  skillLevel?: SkillLevel;
}

export interface UIContext {
  /** Current page/route */
  currentPage?: string;
  /** Selected items */
  selectedItems?: string[];
  /** Active tracker */
  activeTracker?: string;
  /** Theme */
  theme?: 'light' | 'dark';
  /** Device type */
  device?: 'mobile' | 'tablet' | 'desktop';
}

export interface AIResponse {
  /** Unique response ID */
  id: string;
  /** Response messages */
  messages: ResponseMessage[];
  /** Proposed actions */
  actions?: ActionDraft[];
  /** Response metadata */
  metadata?: ResponseMetadata;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

export interface ResponseMessage {
  /** Message role */
  role: 'assistant' | 'agent' | 'tool' | 'system';
  /** Message text */
  text: string;
  /** Source agent */
  agent?: string;
  /** Provenance chain */
  provenance?: Provenance[];
  /** Timestamp */
  timestamp: number;
  /** Sources for web search results */
  sources?: Source[];
}

export interface ResponseMetadata {
  /** Total processing time (ms) */
  processingTime: number;
  /** Estimated cost */
  estimatedCost?: number;
  /** Tokens used */
  tokensUsed?: number;
  /** Agents that participated */
  agentsUsed: string[];
  /** Persona used */
  persona: PersonaType;
  /** Whether web search was used */
  webSearchUsed?: boolean;
  /** Skill level detected */
  skillLevel: SkillLevel;
}

// ============================================================================
// ACTION TYPES
// ============================================================================

export interface ActionDraft {
  /** Unique action ID */
  id: string;
  /** Action type */
  type: ActionType;
  /** Action payload */
  payload: Record<string, unknown>;
  /** Whether confirmation is required */
  requiresConfirmation: boolean;
  /** Human-readable preview */
  previewText?: string;
  /** Explanation of why this action is suggested */
  explanation?: string;
  /** Estimated impact */
  impact?: 'low' | 'medium' | 'high';
  /** Expiration time */
  expiresAt?: number;
}

export type ActionType =
  | 'create_tracker'
  | 'update_tracker'
  | 'delete_tracker'
  | 'create_automation'
  | 'update_automation'
  | 'create_item'
  | 'update_item'
  | 'delete_item'
  | 'create_suggestion'
  | 'navigate'
  | 'show_insight'
  | 'patch_code'
  | 'create_note'
  | 'set_reminder';

// ============================================================================
// PROVENANCE TYPES
// ============================================================================

export interface Provenance {
  /** Agent that produced this */
  agent: string;
  /** Inputs used (sanitized) */
  inputs: string[];
  /** Confidence score 0-1 */
  confidence?: number;
  /** Timestamp */
  timestamp: string;
  /** Operation performed */
  operation?: string;
  /** Duration in ms */
  durationMs?: number;
}

// ============================================================================
// MEMORY TYPES
// ============================================================================

export interface MemoryItem {
  /** Unique memory ID */
  id: string;
  /** Memory type */
  type: MemoryType;
  /** Memory content */
  text: string;
  /** Reference to embedding vector */
  embeddingRef?: string;
  /** Owner user ID */
  owner?: string;
  /** Whether consent was given */
  consent?: boolean;
  /** Time-to-live in ms */
  ttl?: number;
  /** Creation timestamp */
  createdAt: number;
  /** Last accessed */
  lastAccessedAt?: number;
  /** Importance score 0-1 */
  importance?: number;
  /** Related node IDs (Thought Graph) */
  relatedNodes?: string[];
  /** Tags */
  tags?: string[];
}

export type MemoryType =
  | 'conversation'
  | 'fact'
  | 'preference'
  | 'insight'
  | 'context'
  | 'summary';

export interface MemorySearchResult {
  /** Memory item */
  item: MemoryItem;
  /** Similarity score */
  score: number;
}

// ============================================================================
// PERSONA TYPES
// ============================================================================

export type PersonaType = 'friendly' | 'teacher' | 'expert' | 'concise';

export interface PersonaConfig {
  /** Persona identifier */
  id: PersonaType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** System prompt additions */
  systemPrompt: string;
  /** Verbosity level 1-5 */
  verbosity: number;
  /** Use emojis */
  useEmoji: boolean;
  /** Explanation style */
  explanationStyle: 'simple' | 'detailed' | 'technical';
  /** "Do it for me" suggestion style */
  doForMeStyle: 'explicit' | 'subtle' | 'none';
}

export const PERSONAS: Record<PersonaType, PersonaConfig> = {
  friendly: {
    id: 'friendly',
    name: 'Friendly Assistant',
    description: 'Short, encouraging, simple explanations',
    systemPrompt: 'You are a friendly, encouraging assistant. Keep responses short and simple. Use casual language and emojis occasionally. Be supportive and positive.',
    verbosity: 2,
    useEmoji: true,
    explanationStyle: 'simple',
    doForMeStyle: 'explicit',
  },
  teacher: {
    id: 'teacher',
    name: 'Patient Teacher',
    description: 'Step-by-step, examples, analogies',
    systemPrompt: 'You are a patient teacher. Explain things step-by-step with examples and analogies. Ask if the user understands before moving on. Use numbered lists for processes.',
    verbosity: 4,
    useEmoji: false,
    explanationStyle: 'detailed',
    doForMeStyle: 'subtle',
  },
  expert: {
    id: 'expert',
    name: 'Technical Expert',
    description: 'Technical, precise, full reasoning',
    systemPrompt: 'You are a technical expert. Provide precise, detailed answers with full reasoning. Use technical terminology when appropriate. Include caveats and edge cases.',
    verbosity: 5,
    useEmoji: false,
    explanationStyle: 'technical',
    doForMeStyle: 'none',
  },
  concise: {
    id: 'concise',
    name: 'Concise Helper',
    description: 'Very short, direct answers',
    systemPrompt: 'You are a concise assistant. Give the shortest possible answer that fully addresses the question. No fluff, no extra explanations unless asked.',
    verbosity: 1,
    useEmoji: false,
    explanationStyle: 'simple',
    doForMeStyle: 'explicit',
  },
};

// ============================================================================
// SKILL LEVEL TYPES
// ============================================================================

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface SkillAssessment {
  level: SkillLevel;
  confidence: number;
  indicators: string[];
}

// ============================================================================
// AGENT TYPES
// ============================================================================

export interface AgentConfig {
  /** Agent identifier */
  id: string;
  /** Agent name */
  name: string;
  /** Agent description */
  description: string;
  /** Agent capabilities */
  capabilities: string[];
  /** Priority (higher = run first) */
  priority: number;
  /** Whether agent can produce actions */
  canProduceActions: boolean;
  /** Whether agent requires context */
  requiresContext: boolean;
}

export interface AgentResult {
  /** Agent that produced this */
  agentId: string;
  /** Success status */
  success: boolean;
  /** Response text */
  response?: string;
  /** Proposed actions */
  actions?: ActionDraft[];
  /** Insights generated */
  insights?: Insight[];
  /** Provenance */
  provenance: Provenance;
  /** Processing time */
  processingTimeMs: number;
  /** Error if failed */
  error?: string;
}

export interface Insight {
  id: string;
  type: 'pattern' | 'trend' | 'anomaly' | 'suggestion' | 'correlation';
  title: string;
  description: string;
  confidence: number;
  data?: Record<string, unknown>;
  relatedItems?: string[];
}

// ============================================================================
// KNOWLEDGE/SEARCH TYPES
// ============================================================================

export interface Source {
  /** Source title */
  title: string;
  /** Source URL */
  url: string;
  /** Snippet */
  snippet?: string;
  /** Source type */
  type: 'web' | 'wikipedia' | 'news' | 'internal';
  /** Reliability score */
  reliability?: number;
}

export interface SearchResult {
  query: string;
  results: Source[];
  summary?: string;
  timestamp: number;
}

export interface KnowledgeQuery {
  query: string;
  type: 'factual' | 'howto' | 'news' | 'definition' | 'general';
  requiresFreshData: boolean;
}

// ============================================================================
// CONSENT TYPES
// ============================================================================

export interface ConsentStatus {
  /** User ID */
  userId: string;
  /** Memory storage consent */
  memoryConsent: boolean;
  /** Analytics consent */
  analyticsConsent: boolean;
  /** Personalization consent */
  personalizationConsent: boolean;
  /** Last updated */
  updatedAt: number;
}

// ============================================================================
// RATE LIMIT TYPES
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  reason?: string;
}

// ============================================================================
// STREAMING TYPES
// ============================================================================

export interface StreamChunk {
  type: 'text' | 'action' | 'provenance' | 'done' | 'error';
  content: string;
  agent?: string;
  timestamp: number;
}

// ============================================================================
// CRISIS DETECTION
// ============================================================================

export interface CrisisCheck {
  detected: boolean;
  type?: 'self_harm' | 'suicide' | 'violence' | 'abuse';
  resources?: CrisisResource[];
}

export interface CrisisResource {
  name: string;
  description: string;
  contact: string;
  url?: string;
}

export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: 'National Suicide Prevention Lifeline',
    description: '24/7 free and confidential support',
    contact: '988',
    url: 'https://988lifeline.org',
  },
  {
    name: 'Crisis Text Line',
    description: 'Text HOME to 741741',
    contact: '741741',
    url: 'https://www.crisistextline.org',
  },
  {
    name: 'International Association for Suicide Prevention',
    description: 'Find a crisis center near you',
    contact: 'https://www.iasp.info/resources/Crisis_Centres/',
    url: 'https://www.iasp.info/resources/Crisis_Centres/',
  },
];

