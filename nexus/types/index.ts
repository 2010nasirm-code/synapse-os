// ============================================================================
// NEXUS FUSION V2 - CORE TYPE DEFINITIONS
// ============================================================================

// ----------------------------- Base Types -----------------------------------
export type UUID = string;
export type Timestamp = number;
export type JSONValue = string | number | boolean | null | JSONValue[] | { [key: string]: JSONValue };

// ----------------------------- Event System ---------------------------------
export interface NexusEvent<T = unknown> {
  id: UUID;
  type: string;
  payload: T;
  timestamp: Timestamp;
  source: string;
  metadata?: Record<string, unknown>;
}

export type EventHandler<T = unknown> = (event: NexusEvent<T>) => void | Promise<void>;

export interface EventSubscription {
  id: UUID;
  eventType: string;
  handler: EventHandler;
  priority: number;
  once: boolean;
}

// ----------------------------- Task System ----------------------------------
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

export interface NexusTask<T = unknown, R = unknown> {
  id: UUID;
  name: string;
  type: string;
  status: TaskStatus;
  priority: TaskPriority;
  payload: T;
  result?: R;
  error?: Error;
  createdAt: Timestamp;
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  retries: number;
  maxRetries: number;
  timeout: number;
  metadata?: Record<string, unknown>;
}

export interface TaskExecutor<T = unknown, R = unknown> {
  type: string;
  execute: (task: NexusTask<T, R>) => Promise<R>;
  validate?: (payload: T) => boolean;
  onStart?: (task: NexusTask<T, R>) => void;
  onComplete?: (task: NexusTask<T, R>, result: R) => void;
  onError?: (task: NexusTask<T, R>, error: Error) => void;
}

// ----------------------------- Flow/Workflow System -------------------------
export type FlowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export interface FlowNode {
  id: UUID;
  type: string;
  name: string;
  config: Record<string, unknown>;
  inputs: string[];
  outputs: string[];
  position?: { x: number; y: number };
}

export interface FlowEdge {
  id: UUID;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  condition?: string;
}

export interface NexusFlow {
  id: UUID;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  status: FlowStatus;
  variables: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FlowExecutionContext {
  flowId: UUID;
  variables: Record<string, unknown>;
  results: Map<string, unknown>;
  currentNode?: string;
  history: string[];
}

// ----------------------------- Plugin System --------------------------------
export type PluginStatus = 'inactive' | 'loading' | 'active' | 'error';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  permissions?: string[];
  hooks?: string[];
  entry: string;
}

export interface NexusPlugin {
  manifest: PluginManifest;
  status: PluginStatus;
  instance?: PluginInstance;
  error?: Error;
  loadedAt?: Timestamp;
}

export interface PluginInstance {
  onLoad?: () => void | Promise<void>;
  onUnload?: () => void | Promise<void>;
  onEvent?: (event: NexusEvent) => void | Promise<void>;
  onCompute?: (data: unknown) => unknown | Promise<unknown>;
  onSuggest?: (context: unknown) => unknown[] | Promise<unknown[]>;
  onTrack?: (data: unknown) => void | Promise<void>;
  [key: string]: unknown;
}

// ----------------------------- Memory System --------------------------------
export type MemoryType = 'short_term' | 'long_term' | 'working' | 'episodic' | 'semantic';

export interface MemoryItem {
  id: UUID;
  type: MemoryType;
  content: string;
  embedding?: number[];
  metadata: Record<string, unknown>;
  importance: number;
  accessCount: number;
  lastAccessed: Timestamp;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
  tags: string[];
  relations: UUID[];
}

export interface MemoryQuery {
  query?: string;
  embedding?: number[];
  type?: MemoryType;
  tags?: string[];
  minImportance?: number;
  limit?: number;
  offset?: number;
}

export interface MemorySearchResult {
  item: MemoryItem;
  score: number;
  highlights?: string[];
}

// ----------------------------- Brain/Intelligence System --------------------
export type ReasoningMode = 'analytical' | 'creative' | 'critical' | 'practical';

export interface ReasoningContext {
  query: string;
  mode: ReasoningMode;
  memory: MemoryItem[];
  userProfile?: UserProfile;
  constraints?: string[];
  maxDepth?: number;
}

export interface ReasoningResult {
  conclusion: string;
  confidence: number;
  reasoning: string[];
  sources: UUID[];
  suggestions?: string[];
  metadata?: Record<string, unknown>;
}

export interface Pattern {
  id: UUID;
  type: string;
  name: string;
  description?: string;
  frequency: number;
  confidence: number;
  data: Record<string, unknown>;
  detectedAt: Timestamp;
  lastSeen: Timestamp;
}

export interface Insight {
  id: UUID;
  type: 'trend' | 'anomaly' | 'correlation' | 'prediction' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  data: Record<string, unknown>;
  patterns: UUID[];
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

// ----------------------------- User System ----------------------------------
export type UserLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface UserProfile {
  id: UUID;
  email?: string;
  name?: string;
  level: UserLevel;
  preferences: Record<string, unknown>;
  stats: UserStats;
  createdAt: Timestamp;
  lastActive: Timestamp;
}

export interface UserStats {
  tasksCompleted: number;
  patternsDetected: number;
  insightsGenerated: number;
  automationsRun: number;
  totalActions: number;
  streakDays: number;
}

// ----------------------------- Module System --------------------------------
export interface TrackerItem {
  id: UUID;
  userId: UUID;
  name: string;
  type: string;
  value: unknown;
  unit?: string;
  category?: string;
  tags: string[];
  streak: number;
  lastTracked?: Timestamp;
  createdAt: Timestamp;
  metadata?: Record<string, unknown>;
}

export interface AutomationRule {
  id: UUID;
  userId: UUID;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isActive: boolean;
  runCount: number;
  lastRun?: Timestamp;
  createdAt: Timestamp;
}

export interface AutomationTrigger {
  type: 'event' | 'schedule' | 'condition' | 'manual';
  config: Record<string, unknown>;
}

export interface AutomationCondition {
  type: string;
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'matches';
  value: unknown;
}

export interface AutomationAction {
  type: string;
  config: Record<string, unknown>;
  order: number;
}

export interface KnowledgeNode {
  id: UUID;
  userId: UUID;
  type: 'note' | 'fact' | 'concept' | 'link' | 'file';
  title: string;
  content: string;
  embedding?: number[];
  tags: string[];
  relations: { nodeId: UUID; type: string }[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Agent {
  id: UUID;
  name: string;
  role: string;
  description?: string;
  capabilities: string[];
  tools: string[];
  systemPrompt?: string;
  isActive: boolean;
  stats: AgentStats;
}

export interface AgentStats {
  tasksCompleted: number;
  successRate: number;
  avgResponseTime: number;
  lastActive?: Timestamp;
}

export interface AgentMessage {
  id: UUID;
  agentId: UUID;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Timestamp;
  metadata?: Record<string, unknown>;
}

// ----------------------------- Analytics ------------------------------------
export interface AnalyticsEvent {
  id: UUID;
  userId: UUID;
  type: string;
  data: Record<string, unknown>;
  timestamp: Timestamp;
  sessionId?: string;
}

export interface AnalyticsMetric {
  name: string;
  value: number;
  unit?: string;
  change?: number;
  changePercent?: number;
  period: 'day' | 'week' | 'month' | 'year';
}

export interface AnalyticsDashboard {
  metrics: AnalyticsMetric[];
  charts: AnalyticsChart[];
  insights: Insight[];
  updatedAt: Timestamp;
}

export interface AnalyticsChart {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'heatmap' | 'scatter';
  title: string;
  data: unknown[];
  config: Record<string, unknown>;
}

// ----------------------------- Suggestion System ----------------------------
export interface Suggestion {
  id: UUID;
  userId: UUID;
  type: 'action' | 'insight' | 'reminder' | 'optimization' | 'learning';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  confidence: number;
  source: string;
  data?: Record<string, unknown>;
  actions?: SuggestionAction[];
  status: 'pending' | 'accepted' | 'dismissed' | 'expired';
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

export interface SuggestionAction {
  label: string;
  type: string;
  config: Record<string, unknown>;
}

// ----------------------------- UI/Widget System -----------------------------
export interface Widget {
  id: UUID;
  type: string;
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
  refreshInterval?: number;
}

export interface DashboardLayout {
  id: UUID;
  name: string;
  widgets: Widget[];
  columns: number;
  gap: number;
}

export interface Theme {
  id: string;
  name: string;
  mode: 'light' | 'dark' | 'system';
  colors: Record<string, string>;
  effects: {
    blur: number;
    radius: number;
    glass: boolean;
    neon: boolean;
    gradient: boolean;
  };
}

// ----------------------------- Hook System ----------------------------------
export type HookName = 
  | 'beforeCompute' | 'afterCompute'
  | 'beforeAction' | 'afterAction'
  | 'beforeSave' | 'afterSave'
  | 'beforeDelete' | 'afterDelete'
  | 'patternDetected' | 'insightGenerated'
  | 'memoryUpdated' | 'memoryAccessed'
  | 'taskStarted' | 'taskCompleted'
  | 'flowStarted' | 'flowCompleted'
  | 'pluginLoaded' | 'pluginUnloaded';

export interface Hook<T = unknown, R = T> {
  name: HookName;
  priority: number;
  handler: (data: T) => R | Promise<R>;
}

// ----------------------------- API Types ------------------------------------
export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: APIMeta;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface APIMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

export interface APIRequest<T = unknown> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: T;
  headers?: Record<string, string>;
}

// ----------------------------- Utility Types --------------------------------
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Awaitable<T> = T | Promise<T>;

export type MaybePromise<T> = T | Promise<T>;

export interface Disposable {
  dispose: () => void | Promise<void>;
}

export interface Serializable {
  toJSON: () => JSONValue;
  fromJSON: (json: JSONValue) => void;
}


