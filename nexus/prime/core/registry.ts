/**
 * ============================================================================
 * NEXUS PRIME - AGENT REGISTRY
 * ============================================================================
 * 
 * Central registry for all NEXUS PRIME agents.
 * Manages agent configurations, lifecycle, and discovery.
 * 
 * @module nexus/prime/core/registry
 * @version 1.0.0
 */

import { AgentConfig, AgentType, AgentResult, AIRequest, SystemContext } from './types';

// ============================================================================
// AGENT INTERFACE
// ============================================================================

/**
 * Base interface for all agents
 */
export interface INexusAgent {
  /** Agent configuration */
  readonly config: AgentConfig;
  
  /**
   * Process a request
   */
  process(request: AIRequest, context: SystemContext): Promise<AgentResult>;
  
  /**
   * Check if agent can handle this request
   */
  canHandle(request: AIRequest): boolean;
  
  /**
   * Get agent health status
   */
  healthCheck(): Promise<boolean>;
}

// ============================================================================
// DEFAULT AGENT CONFIGURATIONS
// ============================================================================

const DEFAULT_AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
  orchestrator: {
    id: 'orchestrator',
    name: 'Orchestrator Agent',
    description: 'Routes tasks to other agents and merges results',
    capabilities: ['routing', 'coordination', 'synthesis'],
    rateLimit: 60,
    safetyTier: 1,
    canProduceActions: false,
    requiresContext: true,
    timeout: 30000,
  },
  insight: {
    id: 'insight',
    name: 'Insight Agent',
    description: 'Analyzes data and produces insights',
    capabilities: ['analysis', 'trends', 'anomalies', 'predictions'],
    rateLimit: 30,
    safetyTier: 1,
    canProduceActions: true,
    requiresContext: true,
    timeout: 20000,
  },
  builder: {
    id: 'builder',
    name: 'Builder Agent',
    description: 'Creates trackers, layouts, and dashboards',
    capabilities: ['create', 'design', 'structure'],
    rateLimit: 20,
    safetyTier: 2,
    canProduceActions: true,
    requiresContext: true,
    timeout: 25000,
  },
  repair: {
    id: 'repair',
    name: 'Repair Agent',
    description: 'Suggests code fixes and debugging steps',
    capabilities: ['debug', 'fix', 'patch'],
    rateLimit: 10,
    safetyTier: 3,
    canProduceActions: true,
    requiresContext: true,
    timeout: 30000,
  },
  ui: {
    id: 'ui',
    name: 'UI Agent',
    description: 'Helps navigate and interact with the app',
    capabilities: ['navigation', 'suggestions', 'components'],
    rateLimit: 100,
    safetyTier: 1,
    canProduceActions: true,
    requiresContext: true,
    timeout: 10000,
  },
  automation: {
    id: 'automation',
    name: 'Automation Agent',
    description: 'Creates automations from natural language',
    capabilities: ['automation', 'rules', 'triggers'],
    rateLimit: 20,
    safetyTier: 2,
    canProduceActions: true,
    requiresContext: true,
    timeout: 20000,
  },
  memory: {
    id: 'memory',
    name: 'Memory Agent',
    description: 'Manages long-term memory and context',
    capabilities: ['store', 'retrieve', 'summarize', 'embed'],
    rateLimit: 50,
    safetyTier: 1,
    canProduceActions: true,
    requiresContext: false,
    timeout: 15000,
  },
  evolution: {
    id: 'evolution',
    name: 'Evolution Agent',
    description: 'Suggests micro-features and improvements',
    capabilities: ['improve', 'suggest', 'optimize'],
    rateLimit: 10,
    safetyTier: 3,
    canProduceActions: true,
    requiresContext: true,
    timeout: 30000,
  },
};

// ============================================================================
// AGENT REGISTRY
// ============================================================================

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents = new Map<AgentType, INexusAgent>();
  private configs = new Map<AgentType, AgentConfig>();
  private healthStatus = new Map<AgentType, boolean>();

  private constructor() {
    // Initialize configs
    for (const [id, config] of Object.entries(DEFAULT_AGENT_CONFIGS)) {
      this.configs.set(id as AgentType, config);
    }
  }

  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Register an agent implementation
   */
  register(agent: INexusAgent): void {
    const id = agent.config.id;
    this.agents.set(id, agent);
    this.configs.set(id, agent.config);
    console.log(`[Registry] Agent registered: ${agent.config.name}`);
  }

  /**
   * Unregister an agent
   */
  unregister(agentId: AgentType): void {
    this.agents.delete(agentId);
    this.healthStatus.delete(agentId);
    console.log(`[Registry] Agent unregistered: ${agentId}`);
  }

  /**
   * Get an agent by ID
   */
  get(agentId: AgentType): INexusAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get agent configuration
   */
  getConfig(agentId: AgentType): AgentConfig | undefined {
    return this.configs.get(agentId);
  }

  /**
   * Check if agent is registered
   */
  has(agentId: AgentType): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Get all registered agents
   */
  getAll(): INexusAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get all agent IDs
   */
  getAllIds(): AgentType[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get all agent configs
   */
  getAllConfigs(): AgentConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Find agents that can handle a request
   */
  findCapable(request: AIRequest): INexusAgent[] {
    return this.getAll().filter(agent => agent.canHandle(request));
  }

  /**
   * Find agents by capability
   */
  findByCapability(capability: string): INexusAgent[] {
    return this.getAll().filter(agent => 
      agent.config.capabilities.includes(capability)
    );
  }

  /**
   * Run health checks on all agents
   */
  async healthCheckAll(): Promise<Map<AgentType, boolean>> {
    const results = new Map<AgentType, boolean>();

    for (const [id, agent] of this.agents) {
      try {
        const healthy = await agent.healthCheck();
        results.set(id, healthy);
        this.healthStatus.set(id, healthy);
      } catch (error) {
        results.set(id, false);
        this.healthStatus.set(id, false);
        console.error(`[Registry] Health check failed for ${id}:`, error);
      }
    }

    return results;
  }

  /**
   * Get health status
   */
  getHealthStatus(): Map<AgentType, boolean> {
    return new Map(this.healthStatus);
  }

  /**
   * Get healthy agents only
   */
  getHealthyAgents(): INexusAgent[] {
    return this.getAll().filter(agent => 
      this.healthStatus.get(agent.config.id) !== false
    );
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalAgents: number;
    healthyAgents: number;
    byCapability: Record<string, number>;
    bySafetyTier: Record<number, number>;
  } {
    const agents = this.getAll();
    const byCapability: Record<string, number> = {};
    const bySafetyTier: Record<number, number> = { 1: 0, 2: 0, 3: 0 };

    for (const agent of agents) {
      for (const cap of agent.config.capabilities) {
        byCapability[cap] = (byCapability[cap] || 0) + 1;
      }
      bySafetyTier[agent.config.safetyTier]++;
    }

    return {
      totalAgents: agents.length,
      healthyAgents: this.getHealthyAgents().length,
      byCapability,
      bySafetyTier,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the registry instance
 */
export function getRegistry(): AgentRegistry {
  return AgentRegistry.getInstance();
}

/**
 * Register an agent
 */
export function registerAgent(agent: INexusAgent): void {
  AgentRegistry.getInstance().register(agent);
}

/**
 * Get an agent
 */
export function getAgent(agentId: AgentType): INexusAgent | undefined {
  return AgentRegistry.getInstance().get(agentId);
}

/**
 * Get agent config
 */
export function getAgentConfig(agentId: AgentType): AgentConfig | undefined {
  return AgentRegistry.getInstance().getConfig(agentId);
}

export default AgentRegistry;

