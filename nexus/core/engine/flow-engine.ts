// ============================================================================
// NEXUS FLOW ENGINE - Automation & Workflow System
// ============================================================================

import { NexusFlow, FlowNode, FlowEdge, FlowExecutionContext, FlowStatus, Hook, HookName } from '../../types';
import { generateUUID, now, deepClone } from '../../utils';
import { getConfig } from '../../config';

export type NodeProcessor = (
  node: FlowNode,
  context: FlowExecutionContext
) => Promise<unknown>;

export class NexusFlowEngine {
  private flows: Map<string, NexusFlow> = new Map();
  private processors: Map<string, NodeProcessor> = new Map();
  private executions: Map<string, FlowExecutionContext> = new Map();
  private hooks: Map<HookName, Hook[]> = new Map();

  // ----------------------------- Flow Management ----------------------------
  createFlow(
    name: string,
    options: Partial<Pick<NexusFlow, 'description' | 'nodes' | 'edges' | 'variables'>> = {}
  ): NexusFlow {
    const flow: NexusFlow = {
      id: generateUUID(),
      name,
      description: options.description,
      nodes: options.nodes || [],
      edges: options.edges || [],
      status: 'idle',
      variables: options.variables || {},
      createdAt: now(),
      updatedAt: now(),
    };

    this.flows.set(flow.id, flow);
    return flow;
  }

  getFlow(id: string): NexusFlow | undefined {
    return this.flows.get(id);
  }

  getAllFlows(): NexusFlow[] {
    return Array.from(this.flows.values());
  }

  updateFlow(id: string, updates: Partial<NexusFlow>): NexusFlow | undefined {
    const flow = this.flows.get(id);
    if (!flow) return undefined;

    Object.assign(flow, updates, { updatedAt: now() });
    return flow;
  }

  deleteFlow(id: string): boolean {
    return this.flows.delete(id);
  }

  // ----------------------------- Node Management ----------------------------
  addNode(flowId: string, node: Omit<FlowNode, 'id'>): FlowNode | undefined {
    const flow = this.flows.get(flowId);
    if (!flow) return undefined;

    const config = getConfig();
    if (flow.nodes.length >= config.flows.maxNodes) {
      throw new Error(`Maximum nodes (${config.flows.maxNodes}) exceeded`);
    }

    const newNode: FlowNode = {
      ...node,
      id: generateUUID(),
    };

    flow.nodes.push(newNode);
    flow.updatedAt = now();
    return newNode;
  }

  removeNode(flowId: string, nodeId: string): boolean {
    const flow = this.flows.get(flowId);
    if (!flow) return false;

    const index = flow.nodes.findIndex(n => n.id === nodeId);
    if (index === -1) return false;

    flow.nodes.splice(index, 1);
    // Remove connected edges
    flow.edges = flow.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    flow.updatedAt = now();
    return true;
  }

  // ----------------------------- Edge Management ----------------------------
  addEdge(flowId: string, edge: Omit<FlowEdge, 'id'>): FlowEdge | undefined {
    const flow = this.flows.get(flowId);
    if (!flow) return undefined;

    // Validate nodes exist
    const sourceExists = flow.nodes.some(n => n.id === edge.source);
    const targetExists = flow.nodes.some(n => n.id === edge.target);
    if (!sourceExists || !targetExists) {
      throw new Error('Source or target node not found');
    }

    const newEdge: FlowEdge = {
      ...edge,
      id: generateUUID(),
    };

    flow.edges.push(newEdge);
    flow.updatedAt = now();
    return newEdge;
  }

  removeEdge(flowId: string, edgeId: string): boolean {
    const flow = this.flows.get(flowId);
    if (!flow) return false;

    const index = flow.edges.findIndex(e => e.id === edgeId);
    if (index === -1) return false;

    flow.edges.splice(index, 1);
    flow.updatedAt = now();
    return true;
  }

  // ----------------------------- Processor Registration ---------------------
  registerProcessor(type: string, processor: NodeProcessor): void {
    this.processors.set(type, processor);
  }

  unregisterProcessor(type: string): boolean {
    return this.processors.delete(type);
  }

  // ----------------------------- Flow Execution -----------------------------
  async executeFlow(
    flowId: string,
    initialVariables: Record<string, unknown> = {}
  ): Promise<FlowExecutionContext> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    const context: FlowExecutionContext = {
      flowId,
      variables: { ...flow.variables, ...initialVariables },
      results: new Map(),
      history: [],
    };

    this.executions.set(flowId, context);
    flow.status = 'running';

    await this.runHooks('flowStarted', { flow, context });

    try {
      // Find start nodes (nodes with no incoming edges)
      const startNodes = this.findStartNodes(flow);
      
      // Execute from start nodes
      await this.executeNodes(flow, startNodes, context);

      flow.status = 'completed';
      await this.runHooks('flowCompleted', { flow, context });

    } catch (error) {
      flow.status = 'failed';
      throw error;
    } finally {
      this.executions.delete(flowId);
    }

    return context;
  }

  private findStartNodes(flow: NexusFlow): FlowNode[] {
    const targetIds = new Set(flow.edges.map(e => e.target));
    return flow.nodes.filter(n => !targetIds.has(n.id));
  }

  private async executeNodes(
    flow: NexusFlow,
    nodes: FlowNode[],
    context: FlowExecutionContext
  ): Promise<void> {
    const config = getConfig();

    // Execute nodes in parallel (up to max parallel paths)
    const chunks: FlowNode[][] = [];
    for (let i = 0; i < nodes.length; i += config.flows.maxParallelPaths) {
      chunks.push(nodes.slice(i, i + config.flows.maxParallelPaths));
    }

    for (const chunk of chunks) {
      await Promise.all(chunk.map(node => this.executeNode(flow, node, context)));
    }
  }

  private async executeNode(
    flow: NexusFlow,
    node: FlowNode,
    context: FlowExecutionContext
  ): Promise<void> {
    const processor = this.processors.get(node.type);
    if (!processor) {
      throw new Error(`No processor found for node type: ${node.type}`);
    }

    context.currentNode = node.id;
    context.history.push(node.id);

    // Execute node
    const result = await processor(node, context);
    context.results.set(node.id, result);

    // Find next nodes
    const outgoingEdges = flow.edges.filter(e => e.source === node.id);
    const nextNodes: FlowNode[] = [];

    for (const edge of outgoingEdges) {
      // Check condition if present
      if (edge.condition) {
        const conditionMet = this.evaluateCondition(edge.condition, context);
        if (!conditionMet) continue;
      }

      const targetNode = flow.nodes.find(n => n.id === edge.target);
      if (targetNode) {
        nextNodes.push(targetNode);
      }
    }

    // Execute next nodes
    if (nextNodes.length > 0) {
      await this.executeNodes(flow, nextNodes, context);
    }
  }

  private evaluateCondition(condition: string, context: FlowExecutionContext): boolean {
    try {
      // Simple condition evaluation
      // In production, use a proper expression evaluator
      const fn = new Function('ctx', `return ${condition}`);
      return Boolean(fn(context));
    } catch {
      return false;
    }
  }

  pauseFlow(flowId: string): boolean {
    const flow = this.flows.get(flowId);
    if (!flow || flow.status !== 'running') return false;
    
    flow.status = 'paused';
    return true;
  }

  resumeFlow(flowId: string): boolean {
    const flow = this.flows.get(flowId);
    if (!flow || flow.status !== 'paused') return false;
    
    flow.status = 'running';
    // Resume execution from saved state would go here
    return true;
  }

  stopFlow(flowId: string): boolean {
    const flow = this.flows.get(flowId);
    if (!flow) return false;
    
    flow.status = 'idle';
    this.executions.delete(flowId);
    return true;
  }

  // ----------------------------- Hook System --------------------------------
  addHook(name: HookName, handler: Hook['handler'], priority: number = 10): void {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }
    
    const hooks = this.hooks.get(name)!;
    hooks.push({ name, handler, priority });
    hooks.sort((a, b) => a.priority - b.priority);
  }

  private async runHooks<T>(name: HookName, data: T): Promise<T> {
    const hooks = this.hooks.get(name);
    if (!hooks) return data;

    let result: T = data;
    for (const hook of hooks) {
      result = await hook.handler(result) as T;
    }
    return result;
  }

  // ----------------------------- Utilities ----------------------------------
  validateFlow(flow: NexusFlow): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for start nodes
    const startNodes = this.findStartNodes(flow);
    if (startNodes.length === 0) {
      errors.push('Flow has no start nodes');
    }

    // Check for orphan nodes
    const connectedIds = new Set<string>();
    flow.edges.forEach(e => {
      connectedIds.add(e.source);
      connectedIds.add(e.target);
    });
    
    const orphanNodes = flow.nodes.filter(n => !connectedIds.has(n.id) && startNodes.length > 1);
    if (orphanNodes.length > 0) {
      errors.push(`Found ${orphanNodes.length} orphan nodes`);
    }

    // Check for cycles (simple DFS)
    const hasCycle = this.detectCycle(flow);
    if (hasCycle) {
      errors.push('Flow contains cycles');
    }

    return { valid: errors.length === 0, errors };
  }

  private detectCycle(flow: NexusFlow): boolean {
    const visited = new Set<string>();
    const stack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      stack.add(nodeId);

      const outgoing = flow.edges.filter(e => e.source === nodeId);
      for (const edge of outgoing) {
        if (!visited.has(edge.target)) {
          if (dfs(edge.target)) return true;
        } else if (stack.has(edge.target)) {
          return true;
        }
      }

      stack.delete(nodeId);
      return false;
    };

    for (const node of flow.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }

  exportFlow(flowId: string): string | undefined {
    const flow = this.flows.get(flowId);
    if (!flow) return undefined;
    return JSON.stringify(flow, null, 2);
  }

  importFlow(json: string): NexusFlow {
    const data = JSON.parse(json) as NexusFlow;
    const flow = this.createFlow(data.name, {
      description: data.description,
      nodes: data.nodes,
      edges: data.edges,
      variables: data.variables,
    });
    return flow;
  }
}

// Singleton instance
export const flowEngine = new NexusFlowEngine();

// ----------------------------- Built-in Processors --------------------------
// Condition node
flowEngine.registerProcessor('condition', async (node, context) => {
  const { field, operator, value } = node.config as { field: string; operator: string; value: unknown };
  const actual = context.variables[field];
  
  switch (operator) {
    case 'eq': return actual === value;
    case 'neq': return actual !== value;
    case 'gt': return (actual as number) > (value as number);
    case 'lt': return (actual as number) < (value as number);
    case 'contains': return String(actual).includes(String(value));
    default: return false;
  }
});

// Transform node
flowEngine.registerProcessor('transform', async (node, context) => {
  const { input, output, transform } = node.config as { 
    input: string; 
    output: string; 
    transform: string;
  };
  
  const inputValue = context.variables[input];
  const fn = new Function('value', `return ${transform}`);
  const result = fn(inputValue);
  context.variables[output] = result;
  return result;
});

// Delay node
flowEngine.registerProcessor('delay', async (node) => {
  const { duration } = node.config as { duration: number };
  await new Promise(resolve => setTimeout(resolve, duration));
  return true;
});

// Log node
flowEngine.registerProcessor('log', async (node, context) => {
  const { message, level = 'info' } = node.config as { message: string; level?: string };
  const interpolated = message.replace(/\{(\w+)\}/g, (_, key) => 
    String(context.variables[key] ?? '')
  );
  console[level as 'log'](interpolated);
  return interpolated;
});

// Set variable node
flowEngine.registerProcessor('setVariable', async (node, context) => {
  const { name, value } = node.config as { name: string; value: unknown };
  context.variables[name] = value;
  return value;
});


