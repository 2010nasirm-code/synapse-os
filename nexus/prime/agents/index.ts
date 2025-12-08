/**
 * ============================================================================
 * NEXUS PRIME - AGENTS MODULE
 * ============================================================================
 * 
 * Central exports for all NEXUS PRIME agents.
 * 
 * @module nexus/prime/agents
 * @version 1.0.0
 */

// Base Agent
export { BaseAgent } from './BaseAgent';

// Core Agents
export { OrchestratorAgent } from './OrchestratorAgent';
export { InsightAgent } from './InsightAgent';
export { BuilderAgent } from './BuilderAgent';
export { RepairAgent } from './RepairAgent';
export { UIAgent } from './UIAgent';
export { AutomationAgent } from './AutomationAgent';
export { MemoryAgent } from './MemoryAgent';
export { EvolutionAgent } from './EvolutionAgent';

// Re-export registry interface
export type { INexusAgent } from '../core/registry';

// Agent initialization helper
import { registerAgent, getRegistry } from '../core/registry';
import { OrchestratorAgent } from './OrchestratorAgent';
import { InsightAgent } from './InsightAgent';
import { BuilderAgent } from './BuilderAgent';
import { RepairAgent } from './RepairAgent';
import { UIAgent } from './UIAgent';
import { AutomationAgent } from './AutomationAgent';
import { MemoryAgent } from './MemoryAgent';
import { EvolutionAgent } from './EvolutionAgent';

/**
 * Initialize all agents
 */
export function initializeAgents(): void {
  const registry = getRegistry();
  
  // Check if already initialized
  if (registry.getAllIds().length > 0) {
    console.log('[Agents] Already initialized');
    return;
  }

  console.log('[Agents] Initializing NEXUS PRIME agents...');

  // Register all agents
  registerAgent(new OrchestratorAgent());
  registerAgent(new InsightAgent());
  registerAgent(new BuilderAgent());
  registerAgent(new RepairAgent());
  registerAgent(new UIAgent());
  registerAgent(new AutomationAgent());
  registerAgent(new MemoryAgent());
  registerAgent(new EvolutionAgent());

  console.log(`[Agents] Initialized ${registry.getAllIds().length} agents`);
}

/**
 * Get agent by type
 */
export function getAgentInstance(type: string) {
  const registry = getRegistry();
  return registry.get(type as any);
}

