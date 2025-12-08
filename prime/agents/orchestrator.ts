// ============================================================================
// NEXUS PRIME - AGENT ORCHESTRATOR
// Manages and coordinates all agents
// ============================================================================

import { agentBus, AgentMessageBus } from './agent-bus';
import { BaseAgent } from './base-agent';
import { UIAgent } from './ui-agent';
import { OptimizerAgent } from './optimizer-agent';
import { DebugAgent } from './debug-agent';
import { EvolutionAgent } from './evolution-agent';
import { kernel } from '../core/kernel';
import { globalEvents } from '../core/events';
import { getConfig } from '../core/config';

export class AgentOrchestrator {
  private static instance: AgentOrchestrator;
  private agents = new Map<string, BaseAgent>();
  private initialized = false;

  private constructor() {}

  static getInstance(): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator();
    }
    return AgentOrchestrator.instance;
  }

  // ----------------------------- Initialization -----------------------------
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const config = getConfig().agents;
    if (!config.enabled) {
      console.log('[Orchestrator] Agents disabled by config');
      return;
    }

    console.log('[Orchestrator] Initializing agent system...');

    // Create and register agents
    this.registerAgent(new UIAgent());
    this.registerAgent(new OptimizerAgent());
    this.registerAgent(new DebugAgent());
    this.registerAgent(new EvolutionAgent());

    // Start all agents
    for (const agent of this.agents.values()) {
      await agent.start();
    }

    // Setup inter-agent communication
    this.setupCommunication();

    // Register with kernel
    kernel.registerModule('orchestrator');

    this.initialized = true;
    console.log(`[Orchestrator] ${this.agents.size} agents initialized`);
  }

  async shutdown(): Promise<void> {
    console.log('[Orchestrator] Shutting down agents...');

    for (const agent of this.agents.values()) {
      await agent.stop();
    }

    this.agents.clear();
    this.initialized = false;
  }

  // ----------------------------- Agent Management ---------------------------
  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.id, agent);
    agentBus.registerAgent(agent);
  }

  unregisterAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.stop();
      this.agents.delete(agentId);
      agentBus.unregisterAgent(agentId);
    }
  }

  getAgent<T extends BaseAgent>(agentId: string): T | undefined {
    return this.agents.get(agentId) as T | undefined;
  }

  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  // ----------------------------- Communication ------------------------------
  private setupCommunication(): void {
    // Setup cross-agent task delegation
    agentBus.subscribe('orchestrator', 'task:delegate', (message) => {
      this.delegateTask(message.payload);
    });

    // Setup collaborative tasks
    agentBus.subscribe('orchestrator', 'task:collaborate', (message) => {
      this.handleCollaborativeTask(message.payload);
    });
  }

  private delegateTask(data: { taskType: string; data: any; preferredAgent?: string }): void {
    // Find best agent for task
    let targetAgent: BaseAgent | undefined;

    if (data.preferredAgent) {
      targetAgent = this.agents.get(data.preferredAgent);
    }

    if (!targetAgent) {
      targetAgent = this.findBestAgentForTask(data.taskType);
    }

    if (targetAgent) {
      targetAgent.addTask({
        type: data.taskType,
        priority: 'normal',
        data: data.data,
      });
    }
  }

  private findBestAgentForTask(taskType: string): BaseAgent | undefined {
    // Map task types to agents
    const taskAgentMap: Record<string, string> = {
      'morph': 'ui-agent',
      'optimize': 'optimizer-agent',
      'debug': 'debug-agent',
      'evolve': 'evolution-agent',
      'analyze': 'debug-agent',
      'layout': 'ui-agent',
      'performance': 'optimizer-agent',
      'pattern': 'evolution-agent',
    };

    // Find agent with matching capability
    for (const agent of this.agents.values()) {
      if (agent.hasCapability(taskType)) {
        return agent;
      }
    }

    // Use task type mapping
    for (const [keyword, agentId] of Object.entries(taskAgentMap)) {
      if (taskType.toLowerCase().includes(keyword)) {
        return this.agents.get(agentId);
      }
    }

    return undefined;
  }

  private async handleCollaborativeTask(data: {
    taskType: string;
    requiredAgents: string[];
    data: any;
  }): Promise<void> {
    const { taskType, requiredAgents, data: taskData } = data;

    // Verify all required agents are available
    const availableAgents = requiredAgents.filter(id => {
      const agent = this.agents.get(id);
      return agent && agent.getStatus() !== 'stopped';
    });

    if (availableAgents.length !== requiredAgents.length) {
      console.warn('[Orchestrator] Not all required agents available for collaborative task');
      return;
    }

    // Send task to all required agents
    for (const agentId of availableAgents) {
      const agent = this.agents.get(agentId)!;
      agent.addTask({
        type: taskType,
        priority: 'high',
        data: { ...taskData, collaborative: true, participants: requiredAgents },
      });
    }
  }

  // ----------------------------- Task Execution -----------------------------
  async executeTask(taskType: string, data: any): Promise<any> {
    const agent = this.findBestAgentForTask(taskType);
    if (!agent) {
      throw new Error(`No agent available for task type: ${taskType}`);
    }

    return new Promise((resolve, reject) => {
      const taskId = agent.addTask({
        type: taskType,
        priority: 'high',
        data,
      });

      // Listen for completion
      const unsubscribe = globalEvents.on('agent:task-complete', (event) => {
        if (event.taskId === taskId) {
          unsubscribe();
          resolve(event.result);
        }
      });

      // Timeout
      setTimeout(() => {
        unsubscribe();
        reject(new Error('Task timeout'));
      }, getConfig().agents.taskTimeout);
    });
  }

  // ----------------------------- Status & Stats -----------------------------
  getStatus(): {
    initialized: boolean;
    agents: Array<{
      id: string;
      name: string;
      status: string;
      taskCount: number;
    }>;
  } {
    return {
      initialized: this.initialized,
      agents: Array.from(this.agents.values()).map(agent => ({
        id: agent.id,
        name: agent.name,
        status: agent.getStatus(),
        taskCount: agent.getTaskCount(),
      })),
    };
  }

  getStats(): {
    totalTasks: number;
    totalMessages: number;
    agentStats: Record<string, any>;
  } {
    const agentStats: Record<string, any> = {};
    let totalTasks = 0;
    let totalMessages = 0;

    for (const agent of this.agents.values()) {
      const stats = agent.getStats();
      agentStats[agent.id] = stats;
      totalTasks += stats.tasksCompleted + stats.tasksFailen;
      totalMessages += stats.messagesReceived + stats.messagesSent;
    }

    return { totalTasks, totalMessages, agentStats };
  }
}

export const orchestrator = AgentOrchestrator.getInstance();
