// ============================================================================
// NEXUS API - Module Handlers
// ============================================================================

import { NexusFusion } from '../index';
import { now } from '../utils';

// ============================================================================
// TRACKERS
// ============================================================================

export interface TrackerCreateRequest {
  userId: string;
  name: string;
  type: string;
  value?: unknown;
  unit?: string;
  category?: string;
  tags?: string[];
}

export async function handleTrackerCreate(
  nexus: NexusFusion,
  request: TrackerCreateRequest
) {
  return nexus.trackers.create(request.userId, {
    name: request.name,
    type: request.type,
    value: request.value,
    unit: request.unit,
    category: request.category,
    tags: request.tags,
  });
}

export async function handleTrackerTrack(
  nexus: NexusFusion,
  trackerId: string,
  value: unknown
) {
  return nexus.trackers.track(trackerId, value);
}

export async function handleTrackerList(
  nexus: NexusFusion,
  userId: string,
  options?: { type?: string; category?: string }
) {
  return nexus.trackers.filter({
    userId,
    type: options?.type,
    category: options?.category,
  });
}

// ============================================================================
// AUTOMATIONS
// ============================================================================

export interface AutomationCreateRequest {
  userId: string;
  name: string;
  description?: string;
  trigger: {
    type: 'event' | 'schedule' | 'condition' | 'manual';
    config: Record<string, unknown>;
  };
  conditions?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  actions: Array<{
    type: string;
    config: Record<string, unknown>;
  }>;
}

export async function handleAutomationCreate(
  nexus: NexusFusion,
  request: AutomationCreateRequest
) {
  return nexus.automations.create(request.userId, {
    name: request.name,
    description: request.description,
    trigger: request.trigger as any,
    conditions: request.conditions as any,
    actions: request.actions as any,
  });
}

export async function handleAutomationActivate(
  nexus: NexusFusion,
  automationId: string
) {
  return nexus.automations.activate(automationId);
}

export async function handleAutomationDeactivate(
  nexus: NexusFusion,
  automationId: string
) {
  return nexus.automations.deactivate(automationId);
}

export async function handleAutomationTrigger(
  nexus: NexusFusion,
  automationId: string,
  context?: Record<string, unknown>
) {
  return nexus.automations.trigger(automationId, context);
}

export async function handleAutomationList(
  nexus: NexusFusion,
  userId: string
) {
  return nexus.automations.getByUser(userId);
}

// ============================================================================
// KNOWLEDGE
// ============================================================================

export interface KnowledgeCreateRequest {
  userId: string;
  type: 'note' | 'concept' | 'fact' | 'procedure' | 'reference';
  title: string;
  content: string;
  tags?: string[];
}

export async function handleKnowledgeCreate(
  nexus: NexusFusion,
  request: KnowledgeCreateRequest
) {
  return nexus.knowledge.create(request.userId, {
    type: request.type as any,
    title: request.title,
    content: request.content,
    tags: request.tags,
  });
}

export async function handleKnowledgeSearch(
  nexus: NexusFusion,
  userId: string,
  query: string,
  options?: { type?: string; tags?: string[]; limit?: number }
) {
  return nexus.knowledge.search(userId, {
    query,
    type: options?.type as any,
    tags: options?.tags,
    limit: options?.limit,
  });
}

export async function handleKnowledgeLink(
  nexus: NexusFusion,
  sourceId: string,
  targetId: string,
  relationType: string
) {
  return nexus.knowledge.link(sourceId, targetId, relationType);
}

export async function handleKnowledgeGraph(
  nexus: NexusFusion,
  userId: string
) {
  return nexus.knowledge.exportGraph(userId);
}

// ============================================================================
// SUGGESTIONS
// ============================================================================

export async function handleSuggestionsGenerate(
  nexus: NexusFusion,
  userId: string,
  context?: {
    trackerItems?: unknown[];
    automations?: unknown[];
    knowledge?: unknown[];
  }
) {
  const suggestionsModule = await import('../modules/suggestions');
  return suggestionsModule.suggestionsModule.generate(userId, context || {});
}

export async function handleSuggestionAccept(
  nexus: NexusFusion,
  suggestionId: string
) {
  const suggestionsModule = await import('../modules/suggestions');
  return suggestionsModule.suggestionsModule.accept(suggestionId);
}

export async function handleSuggestionReject(
  nexus: NexusFusion,
  suggestionId: string,
  reason?: string
) {
  const suggestionsModule = await import('../modules/suggestions');
  return suggestionsModule.suggestionsModule.reject(suggestionId, reason);
}

export async function handleSuggestionsList(
  nexus: NexusFusion,
  userId: string
) {
  const suggestionsModule = await import('../modules/suggestions');
  return suggestionsModule.suggestionsModule.getByUser(userId);
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function handleAnalyticsTrack(
  nexus: NexusFusion,
  userId: string,
  type: string,
  category: string,
  data?: Record<string, unknown>
) {
  const analyticsModule = await import('../modules/analytics');
  return analyticsModule.analyticsModule.track(userId, type, category, data);
}

export async function handleAnalyticsDashboard(
  nexus: NexusFusion,
  userId: string
) {
  const analyticsModule = await import('../modules/analytics');
  return analyticsModule.analyticsModule.getDashboard(userId);
}

export async function handleAnalyticsInsights(
  nexus: NexusFusion,
  userId: string
) {
  const analyticsModule = await import('../modules/analytics');
  return analyticsModule.analyticsModule.getInsights(userId);
}

// ============================================================================
// AGENTS
// ============================================================================

export interface AgentCreateRequest {
  userId: string;
  name: string;
  description?: string;
  capabilities: string[];
  config?: Record<string, unknown>;
}

export async function handleAgentCreate(
  nexus: NexusFusion,
  request: AgentCreateRequest
) {
  const agentsModule = await import('../modules/agents');
  return agentsModule.agentsModule.create(request.userId, {
    name: request.name,
    description: request.description,
    capabilities: request.capabilities as any,
    config: request.config,
  });
}

export async function handleAgentStart(
  nexus: NexusFusion,
  agentId: string
) {
  const agentsModule = await import('../modules/agents');
  return agentsModule.agentsModule.start(agentId);
}

export async function handleAgentStop(
  nexus: NexusFusion,
  agentId: string
) {
  const agentsModule = await import('../modules/agents');
  return agentsModule.agentsModule.stop(agentId);
}

export async function handleAgentExecute(
  nexus: NexusFusion,
  agentId: string,
  task: { type: string; data: unknown }
) {
  const agentsModule = await import('../modules/agents');
  return agentsModule.agentsModule.execute(agentId, task);
}

export async function handleAgentsList(
  nexus: NexusFusion,
  userId: string
) {
  const agentsModule = await import('../modules/agents');
  return agentsModule.agentsModule.getByUser(userId);
}

