// ============================================================================
// NEXUS PRIME - BASE AGENT
// Foundation class for all intelligent agents
// ============================================================================

import { globalEvents, PrimeEvents } from '../core/events';
import { kernel } from '../core/kernel';

export type AgentStatus = 'idle' | 'working' | 'paused' | 'error' | 'stopped';

export interface AgentTask {
  id: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  data: any;
  createdAt: number;
  deadline?: number;
}

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: string;
  payload: any;
  timestamp: number;
  requiresResponse: boolean;
}

export interface AgentCapability {
  name: string;
  description: string;
  handler: (data: any) => Promise<any>;
}

export interface AgentStats {
  tasksCompleted: number;
  tasksFailen: number;
  messagesReceived: number;
  messagesSent: number;
  avgTaskDuration: number;
  lastActive: number;
}

export abstract class BaseAgent {
  readonly id: string;
  readonly name: string;
  readonly description: string;

  protected status: AgentStatus = 'idle';
  protected taskQueue: AgentTask[] = [];
  protected capabilities = new Map<string, AgentCapability>();
  protected stats: AgentStats;
  protected isProcessing = false;

  constructor(id: string, name: string, description: string) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.stats = this.initializeStats();
    
    // Register with kernel
    kernel.registerModule(`agent:${id}`);
  }

  // ----------------------------- Lifecycle ----------------------------------
  async start(): Promise<void> {
    if (this.status !== 'stopped' && this.status !== 'idle') return;

    this.status = 'idle';
    await this.onStart();
    this.startProcessingLoop();

    globalEvents.emit(PrimeEvents.AGENT_STARTED, { agentId: this.id });
    console.log(`[Agent:${this.name}] Started`);
  }

  async stop(): Promise<void> {
    this.status = 'stopped';
    await this.onStop();

    globalEvents.emit(PrimeEvents.AGENT_STOPPED, { agentId: this.id });
    console.log(`[Agent:${this.name}] Stopped`);
  }

  pause(): void {
    this.status = 'paused';
    console.log(`[Agent:${this.name}] Paused`);
  }

  resume(): void {
    if (this.status === 'paused') {
      this.status = 'idle';
      console.log(`[Agent:${this.name}] Resumed`);
    }
  }

  // ----------------------------- Abstract Methods ---------------------------
  protected abstract onStart(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract processTask(task: AgentTask): Promise<any>;

  // ----------------------------- Task Management ----------------------------
  addTask(task: Omit<AgentTask, 'id' | 'createdAt'>): string {
    const fullTask: AgentTask = {
      ...task,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
    };

    // Insert by priority
    const insertIndex = this.taskQueue.findIndex(t => 
      this.getPriorityValue(t.priority) < this.getPriorityValue(fullTask.priority)
    );

    if (insertIndex === -1) {
      this.taskQueue.push(fullTask);
    } else {
      this.taskQueue.splice(insertIndex, 0, fullTask);
    }

    return fullTask.id;
  }

  private getPriorityValue(priority: AgentTask['priority']): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'normal': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  private startProcessingLoop(): void {
    const loop = async () => {
      if (this.status === 'stopped') return;

      if (this.status === 'idle' && this.taskQueue.length > 0 && !this.isProcessing) {
        await this.processNextTask();
      }

      // Heartbeat
      kernel.heartbeat(`agent:${this.id}`);

      // Continue loop
      setTimeout(loop, 100);
    };

    loop();
  }

  private async processNextTask(): Promise<void> {
    const task = this.taskQueue.shift();
    if (!task) return;

    this.isProcessing = true;
    this.status = 'working';
    const startTime = Date.now();

    try {
      const result = await this.processTask(task);
      
      this.stats.tasksCompleted++;
      this.stats.avgTaskDuration = 
        (this.stats.avgTaskDuration * (this.stats.tasksCompleted - 1) + 
        (Date.now() - startTime)) / this.stats.tasksCompleted;

      globalEvents.emit(PrimeEvents.AGENT_TASK_COMPLETE, {
        agentId: this.id,
        taskId: task.id,
        result,
        duration: Date.now() - startTime,
      });

    } catch (error) {
      this.stats.tasksFailen++;
      
      globalEvents.emit(PrimeEvents.AGENT_ERROR, {
        agentId: this.id,
        taskId: task.id,
        error,
      });

      console.error(`[Agent:${this.name}] Task failed:`, error);
    }

    this.status = 'idle';
    this.isProcessing = false;
    this.stats.lastActive = Date.now();
  }

  // ----------------------------- Messaging ----------------------------------
  receiveMessage(message: AgentMessage): void {
    this.stats.messagesReceived++;
    
    globalEvents.emit(PrimeEvents.AGENT_MESSAGE, {
      agentId: this.id,
      message,
      direction: 'received',
    });

    this.handleMessage(message);
  }

  protected async handleMessage(message: AgentMessage): Promise<void> {
    // Override in subclasses
    console.log(`[Agent:${this.name}] Received message:`, message.type);
  }

  protected sendMessage(to: string, type: string, payload: any, requiresResponse = false): void {
    const message: AgentMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      from: this.id,
      to,
      type,
      payload,
      timestamp: Date.now(),
      requiresResponse,
    };

    this.stats.messagesSent++;
    globalEvents.emit('agent:send-message', message);
  }

  // ----------------------------- Capabilities -------------------------------
  registerCapability(capability: AgentCapability): void {
    this.capabilities.set(capability.name, capability);
  }

  hasCapability(name: string): boolean {
    return this.capabilities.has(name);
  }

  async executeCapability(name: string, data: any): Promise<any> {
    const capability = this.capabilities.get(name);
    if (!capability) {
      throw new Error(`Capability ${name} not found`);
    }
    return capability.handler(data);
  }

  getCapabilities(): string[] {
    return Array.from(this.capabilities.keys());
  }

  // ----------------------------- Stats --------------------------------------
  private initializeStats(): AgentStats {
    return {
      tasksCompleted: 0,
      tasksFailen: 0,
      messagesReceived: 0,
      messagesSent: 0,
      avgTaskDuration: 0,
      lastActive: Date.now(),
    };
  }

  getStats(): AgentStats {
    return { ...this.stats };
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getTaskCount(): number {
    return this.taskQueue.length;
  }
}

