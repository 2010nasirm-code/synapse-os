/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - AGENTS MODULE
 * ============================================================================
 * 
 * @module nexus/assistant-v3/agents
 * @version 3.0.0
 */

// Persona Router
export { autoSelectPersona, getToneAdjustment, formatResponse, formatAsSteps, PERSONAS } from './personaRouter';

// Agents
export { ReasoningAgent, getReasoningAgent } from './reasoningAgent';
export { ToolAgent, getToolAgent } from './toolAgent';
export { PlannerAgent, getPlannerAgent } from './plannerAgent';
export { MemoryAgent, getMemoryAgent } from './memoryAgent';
export { UIAgent, getUIAgent } from './uiAgent';
export { DebugAgent, getDebugAgent } from './debugAgent';
export { KnowledgeAgent, getKnowledgeAgent } from './knowledgeAgent';

// Agent registry
import { getCoordinator, IAgent } from '../core/coordinator';
import { getReasoningAgent } from './reasoningAgent';
import { getToolAgent } from './toolAgent';
import { getPlannerAgent } from './plannerAgent';
import { getMemoryAgent } from './memoryAgent';
import { getUIAgent } from './uiAgent';
import { getDebugAgent } from './debugAgent';
import { getKnowledgeAgent } from './knowledgeAgent';

/**
 * Initialize and register all agents with the coordinator
 */
export function initializeAgents(): void {
  const coordinator = getCoordinator();
  
  // Register all agents
  const agents: IAgent[] = [
    getReasoningAgent(),
    getToolAgent(),
    getPlannerAgent(),
    getMemoryAgent(),
    getUIAgent(),
    getDebugAgent(),
    getKnowledgeAgent(),
  ];

  for (const agent of agents) {
    coordinator.registerAgent(agent);
  }

  console.log(`[AssistantV3] Initialized ${agents.length} agents`);
}

/**
 * Get all agent instances
 */
export function getAllAgents(): IAgent[] {
  return [
    getReasoningAgent(),
    getToolAgent(),
    getPlannerAgent(),
    getMemoryAgent(),
    getUIAgent(),
    getDebugAgent(),
    getKnowledgeAgent(),
  ];
}

