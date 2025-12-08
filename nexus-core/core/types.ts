/**
 * Nexus Core Types
 * Central type definitions for the entire Nexus system
 */

// ============================================
// CORE TYPES
// ============================================

export interface NexusRequest {
  userId: string;
  query: string | NexusStructuredQuery;
  options?: NexusRequestOptions;
}

export interface NexusStructuredQuery {
  intent: string;
  entities?: Record<string, any>;
  context?: Record<string, any>;
  constraints?: QueryConstraints;
}

export interface NexusRequestOptions {
  agents?: string[];
  maxTokens?: number;
  timeout?: number;
  stream?: boolean;
  includeProvenance?: boolean;
  memoryScope?: "session" | "persistent" | "none";
}

export interface QueryConstraints {
  maxResults?: number;
  dateRange?: { start: string; end: string };
  categories?: string[];
  priority?: "low" | "medium" | "high";
}

export interface NexusResponse {
  success: boolean;
  answer: string;
  agentsUsed: string[];
  provenance: ProvenanceRecord[];
  data?: any;
  suggestions?: string[];
  metadata: ResponseMetadata;
}

export interface ResponseMetadata {
  requestId: string;
  processingTime: number;
  tokenUsage?: { input: number; output: number };
  timestamp: string;
}

export interface ProvenanceRecord {
  agentId: string;
  agentName: string;
  contribution: string;
  confidence: number;
  timestamp: string;
}

// ============================================
// AGENT TYPES
// ============================================

export interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  priority: number;
  enabled: boolean;
  process: (input: AgentInput) => Promise<AgentOutput>;
}

export interface AgentInput {
  query: string;
  context: Record<string, any>;
  memory?: MemoryItem[];
  options?: Record<string, any>;
}

export interface AgentOutput {
  success: boolean;
  result: any;
  confidence: number;
  explanation?: string;
  suggestions?: string[];
  error?: string;
}

export interface AgentTask {
  id: string;
  agentId: string;
  status: "pending" | "running" | "completed" | "failed";
  input: AgentInput;
  output?: AgentOutput;
  createdAt: string;
  completedAt?: string;
}

// ============================================
// MEMORY TYPES
// ============================================

export interface MemoryItem {
  id: string;
  userId: string;
  type: "fact" | "preference" | "context" | "conversation" | "insight";
  content: string;
  embedding?: number[];
  metadata: MemoryMetadata;
  createdAt: string;
  lastAccessedAt: string;
  accessCount: number;
  decayScore: number;
}

export interface MemoryMetadata {
  source: string;
  tags?: string[];
  entities?: string[];
  sentiment?: number;
  importance?: number;
  expiresAt?: string;
}

export interface MemoryQuery {
  userId: string;
  query?: string;
  type?: MemoryItem["type"];
  tags?: string[];
  limit?: number;
  minRelevance?: number;
}

// ============================================
// SKILL TYPES
// ============================================

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  execute: (input: SkillInput) => Promise<SkillOutput>;
}

export type SkillCategory = 
  | "reasoning"
  | "data"
  | "media"
  | "productivity"
  | "creative"
  | "analysis"
  | "utility";

export interface SkillInput {
  data: any;
  options?: Record<string, any>;
}

export interface SkillOutput {
  success: boolean;
  result: any;
  error?: string;
}

// ============================================
// AUTOMATION TYPES
// ============================================

export interface Automation {
  id: string;
  userId: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  conditions?: AutomationCondition[];
  actions: AutomationAction[];
  enabled: boolean;
  lastRun?: string;
  runCount: number;
  createdAt: string;
}

export interface AutomationTrigger {
  type: "schedule" | "event" | "query" | "webhook" | "manual";
  config: Record<string, any>;
}

export interface AutomationCondition {
  field: string;
  operator: "equals" | "contains" | "gt" | "lt" | "exists";
  value: any;
}

export interface AutomationAction {
  type: "agent" | "skill" | "notification" | "webhook" | "memory";
  config: Record<string, any>;
}

// ============================================
// LOG & ANALYTICS TYPES
// ============================================

export interface LogEntry {
  id: string;
  level: "debug" | "info" | "warn" | "error";
  category: string;
  message: string;
  data?: Record<string, any>;
  userId?: string;
  timestamp: string;
}

export interface UsageStats {
  userId: string;
  period: "day" | "week" | "month";
  queries: number;
  tokensUsed: number;
  agentCalls: Record<string, number>;
  skillCalls: Record<string, number>;
}

// ============================================
// CONFIG TYPES
// ============================================

export interface NexusConfig {
  version: string;
  environment: "development" | "production" | "test";
  features: FeatureFlags;
  limits: RateLimits;
  agents: AgentConfig[];
  skills: SkillConfig[];
}

export interface FeatureFlags {
  memoryEnabled: boolean;
  automationsEnabled: boolean;
  multiAgentEnabled: boolean;
  vectorSearchEnabled: boolean;
  offlineModeEnabled: boolean;
}

export interface RateLimits {
  queriesPerMinute: number;
  tokensPerDay: number;
  memoryItemsPerUser: number;
  automationsPerUser: number;
}

export interface AgentConfig {
  id: string;
  enabled: boolean;
  priority: number;
  options?: Record<string, any>;
}

export interface SkillConfig {
  id: string;
  enabled: boolean;
  options?: Record<string, any>;
}

