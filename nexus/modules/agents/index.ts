// ============================================================================
// NEXUS MODULES - Agents Module
// ============================================================================

import { generateUUID, now } from '../../utils';
import { eventBus } from '../../core/engine';

export type AgentCapability = string;
export type AgentStatus = 'inactive' | 'active' | 'busy' | 'error';

export interface Agent {
  id: string;
  userId: string;
  name: string;
  description?: string;
  capabilities: AgentCapability[];
  status: AgentStatus;
  tasksCompleted: number;
  config: Record<string, unknown>;
  createdAt: number;
}

export interface AgentCreateInput {
  name: string;
  description?: string;
  capabilities: AgentCapability[];
  config?: Record<string, unknown>;
}

export class AgentsModule {
  private agents: Map<string, Agent> = new Map();

  create(userId: string, input: AgentCreateInput): Agent {
    const agent: Agent = {
      id: generateUUID(),
      userId,
      name: input.name,
      description: input.description,
      capabilities: input.capabilities,
      status: 'inactive',
      tasksCompleted: 0,
      config: input.config || {},
      createdAt: now(),
    };

    this.agents.set(agent.id, agent);
    eventBus.emit('agents:created', agent);

    return agent;
  }

  get(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  update(id: string, updates: Partial<AgentCreateInput>): Agent | undefined {
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    if (updates.name) agent.name = updates.name;
    if (updates.description) agent.description = updates.description;
    if (updates.capabilities) agent.capabilities = updates.capabilities;
    if (updates.config) agent.config = { ...agent.config, ...updates.config };

    eventBus.emit('agents:updated', agent);
    return agent;
  }

  delete(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    if (agent.status === 'active') {
      this.stop(id);
    }

    this.agents.delete(id);
    eventBus.emit('agents:deleted', { id });
    return true;
  }

  start(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent || agent.status === 'active') return false;

    agent.status = 'active';
    eventBus.emit('agents:started', agent);
    return true;
  }

  stop(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent || agent.status !== 'active') return false;

    agent.status = 'inactive';
    eventBus.emit('agents:stopped', agent);
    return true;
  }

  async execute(id: string, task: { type: string; data: unknown }): Promise<unknown> {
    const agent = this.agents.get(id);
    if (!agent || agent.status !== 'active') {
      throw new Error('Agent not available');
    }

    eventBus.emit('agents:task_started', { agent, task });

    try {
      // Simulate task execution
      const result = { success: true, task, timestamp: now() };
      agent.tasksCompleted++;

      eventBus.emit('agents:task_completed', { agent, task, result });
      return result;
    } catch (error) {
      eventBus.emit('agents:task_failed', { agent, task, error });
      throw error;
    }
  }

  getByUser(userId: string): Agent[] {
    return Array.from(this.agents.values()).filter(a => a.userId === userId);
  }

  getActive(userId?: string): Agent[] {
    let agents = Array.from(this.agents.values()).filter(a => a.status === 'active');
    if (userId) agents = agents.filter(a => a.userId === userId);
    return agents;
  }

  getStats() {
    const agents = Array.from(this.agents.values());
    return {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === 'active').length,
      totalTasksCompleted: agents.reduce((sum, a) => sum + a.tasksCompleted, 0),
    };
  }
}

export const agentsModule = new AgentsModule();
export default agentsModule;


