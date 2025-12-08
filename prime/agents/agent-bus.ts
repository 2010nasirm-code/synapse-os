// ============================================================================
// NEXUS PRIME - AGENT MESSAGE BUS
// Central communication hub for all agents
// ============================================================================

import { globalEvents } from '../core/events';
import { BaseAgent, AgentMessage } from './base-agent';

export interface BusSubscription {
  agentId: string;
  pattern: string;
  handler: (message: AgentMessage) => void;
}

export class AgentMessageBus {
  private static instance: AgentMessageBus;
  private agents = new Map<string, BaseAgent>();
  private subscriptions: BusSubscription[] = [];
  private messageHistory: AgentMessage[] = [];
  private maxHistory = 500;

  private constructor() {
    this.setupEventListeners();
  }

  static getInstance(): AgentMessageBus {
    if (!AgentMessageBus.instance) {
      AgentMessageBus.instance = new AgentMessageBus();
    }
    return AgentMessageBus.instance;
  }

  // ----------------------------- Setup --------------------------------------
  private setupEventListeners(): void {
    // Listen for agent send messages
    globalEvents.on('agent:send-message', (message: AgentMessage) => {
      this.routeMessage(message);
    });
  }

  // ----------------------------- Agent Registration -------------------------
  registerAgent(agent: BaseAgent): void {
    this.agents.set(agent.id, agent);
    console.log(`[AgentBus] Agent ${agent.name} registered`);
  }

  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    // Remove subscriptions for this agent
    this.subscriptions = this.subscriptions.filter(s => s.agentId !== agentId);
    console.log(`[AgentBus] Agent ${agentId} unregistered`);
  }

  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  // ----------------------------- Message Routing ----------------------------
  private routeMessage(message: AgentMessage): void {
    // Store in history
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistory) {
      this.messageHistory.shift();
    }

    // Direct routing
    if (message.to !== '*') {
      const targetAgent = this.agents.get(message.to);
      if (targetAgent) {
        targetAgent.receiveMessage(message);
      } else {
        console.warn(`[AgentBus] Target agent ${message.to} not found`);
      }
      return;
    }

    // Broadcast (to = '*')
    for (const agent of this.agents.values()) {
      if (agent.id !== message.from) {
        agent.receiveMessage(message);
      }
    }

    // Pattern-based subscriptions
    for (const sub of this.subscriptions) {
      if (this.matchesPattern(message.type, sub.pattern)) {
        try {
          sub.handler(message);
        } catch (error) {
          console.error(`[AgentBus] Subscription handler error:`, error);
        }
      }
    }
  }

  private matchesPattern(type: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.endsWith('*')) {
      return type.startsWith(pattern.slice(0, -1));
    }
    return type === pattern;
  }

  // ----------------------------- Subscriptions ------------------------------
  subscribe(agentId: string, pattern: string, handler: (message: AgentMessage) => void): () => void {
    const subscription: BusSubscription = { agentId, pattern, handler };
    this.subscriptions.push(subscription);

    return () => {
      const idx = this.subscriptions.indexOf(subscription);
      if (idx > -1) {
        this.subscriptions.splice(idx, 1);
      }
    };
  }

  // ----------------------------- Direct Send --------------------------------
  send(from: string, to: string, type: string, payload: any): void {
    const message: AgentMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      from,
      to,
      type,
      payload,
      timestamp: Date.now(),
      requiresResponse: false,
    };

    this.routeMessage(message);
  }

  broadcast(from: string, type: string, payload: any): void {
    this.send(from, '*', type, payload);
  }

  // ----------------------------- Request/Response ---------------------------
  async request(from: string, to: string, type: string, payload: any, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const responseType = `${type}:response:${requestId}`;

      // Set up timeout
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error(`Request timeout: ${type}`));
      }, timeout);

      // Subscribe for response
      const unsubscribe = this.subscribe(from, responseType, (message) => {
        clearTimeout(timer);
        unsubscribe();
        resolve(message.payload);
      });

      // Send request
      const message: AgentMessage = {
        id: requestId,
        from,
        to,
        type,
        payload: { ...payload, requestId },
        timestamp: Date.now(),
        requiresResponse: true,
      };

      this.routeMessage(message);
    });
  }

  respond(originalMessage: AgentMessage, payload: any): void {
    if (!originalMessage.requiresResponse) return;

    const responseType = `${originalMessage.type}:response:${originalMessage.id}`;
    this.send(originalMessage.to, originalMessage.from, responseType, payload);
  }

  // ----------------------------- Queries ------------------------------------
  getMessageHistory(filter?: { from?: string; to?: string; type?: string; limit?: number }): AgentMessage[] {
    let messages = [...this.messageHistory];

    if (filter?.from) {
      messages = messages.filter(m => m.from === filter.from);
    }

    if (filter?.to) {
      messages = messages.filter(m => m.to === filter.to);
    }

    if (filter?.type) {
      messages = messages.filter(m => m.type.includes(filter.type!));
    }

    if (filter?.limit) {
      messages = messages.slice(-filter.limit);
    }

    return messages;
  }

  getStats(): {
    agentCount: number;
    subscriptionCount: number;
    messagesRouted: number;
  } {
    return {
      agentCount: this.agents.size,
      subscriptionCount: this.subscriptions.length,
      messagesRouted: this.messageHistory.length,
    };
  }
}

export const agentBus = AgentMessageBus.getInstance();

