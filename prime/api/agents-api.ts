// ============================================================================
// NEXUS PRIME - AGENTS API
// Agent management and communication
// ============================================================================

import { orchestrator } from '../agents/orchestrator';
import { agentBus } from '../agents/agent-bus';
import { BaseAgent, AgentMessage, AgentStats } from '../agents/base-agent';
import { globalEvents } from '../core/events';

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  status: string;
  stats: AgentStats;
  capabilities: string[];
  taskCount: number;
}

class AgentsAPI {
  // ----------------------------- Agent Management ---------------------------
  getAgents(): AgentInfo[] {
    return orchestrator.getAllAgents().map(this.mapAgentToInfo);
  }

  getAgent(agentId: string): AgentInfo | undefined {
    const agent = orchestrator.getAgent(agentId);
    return agent ? this.mapAgentToInfo(agent) : undefined;
  }

  private mapAgentToInfo(agent: BaseAgent): AgentInfo {
    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      status: agent.getStatus(),
      stats: agent.getStats(),
      capabilities: agent.getCapabilities(),
      taskCount: agent.getTaskCount(),
    };
  }

  // ----------------------------- Agent Control ------------------------------
  async startAgent(agentId: string): Promise<boolean> {
    const agent = orchestrator.getAgent(agentId);
    if (!agent) return false;

    await agent.start();
    return true;
  }

  async stopAgent(agentId: string): Promise<boolean> {
    const agent = orchestrator.getAgent(agentId);
    if (!agent) return false;

    await agent.stop();
    return true;
  }

  pauseAgent(agentId: string): boolean {
    const agent = orchestrator.getAgent(agentId);
    if (!agent) return false;

    agent.pause();
    return true;
  }

  resumeAgent(agentId: string): boolean {
    const agent = orchestrator.getAgent(agentId);
    if (!agent) return false;

    agent.resume();
    return true;
  }

  // ----------------------------- Task Management ----------------------------
  addTask(agentId: string, task: {
    type: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    data: any;
  }): string | null {
    const agent = orchestrator.getAgent(agentId);
    if (!agent) return null;

    return agent.addTask(task);
  }

  // ----------------------------- Capabilities -------------------------------
  async executeCapability(agentId: string, capability: string, data: any): Promise<any> {
    const agent = orchestrator.getAgent(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    if (!agent.hasCapability(capability)) {
      throw new Error(`Agent ${agentId} does not have capability: ${capability}`);
    }

    return agent.executeCapability(capability, data);
  }

  getCapabilities(agentId: string): string[] {
    const agent = orchestrator.getAgent(agentId);
    return agent ? agent.getCapabilities() : [];
  }

  findAgentWithCapability(capability: string): AgentInfo | undefined {
    for (const agent of orchestrator.getAllAgents()) {
      if (agent.hasCapability(capability)) {
        return this.mapAgentToInfo(agent);
      }
    }
    return undefined;
  }

  // ----------------------------- Messaging ----------------------------------
  sendMessage(from: string, to: string, type: string, payload: any): void {
    agentBus.send(from, to, type, payload);
  }

  broadcast(from: string, type: string, payload: any): void {
    agentBus.broadcast(from, type, payload);
  }

  async request(from: string, to: string, type: string, payload: any, timeout?: number): Promise<any> {
    return agentBus.request(from, to, type, payload, timeout);
  }

  getMessageHistory(filter?: {
    from?: string;
    to?: string;
    type?: string;
    limit?: number;
  }): AgentMessage[] {
    return agentBus.getMessageHistory(filter);
  }

  // ----------------------------- Statistics ---------------------------------
  getStats(): {
    totalAgents: number;
    activeAgents: number;
    totalTasks: number;
    totalMessages: number;
  } {
    const status = orchestrator.getStatus();
    const stats = orchestrator.getStats();

    return {
      totalAgents: status.agents.length,
      activeAgents: status.agents.filter(a => a.status === 'working' || a.status === 'idle').length,
      totalTasks: stats.totalTasks,
      totalMessages: stats.totalMessages,
    };
  }

  getAgentStats(agentId: string): AgentStats | undefined {
    const agent = orchestrator.getAgent(agentId);
    return agent?.getStats();
  }

  // ----------------------------- Subscriptions ------------------------------
  subscribeToAgent(agentId: string, eventType: string, handler: (data: any) => void): () => void {
    const pattern = `agent:${agentId}:${eventType}`;
    return agentBus.subscribe('api', pattern, (message) => {
      handler(message.payload);
    });
  }

  subscribeToAllAgents(eventType: string, handler: (data: any) => void): () => void {
    const pattern = `agent:*:${eventType}`;
    return agentBus.subscribe('api', pattern, (message) => {
      handler(message.payload);
    });
  }
}

export const agentsAPI = new AgentsAPI();

