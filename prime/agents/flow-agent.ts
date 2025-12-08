// ============================================================================
// NEXUS PRIME - FLOW AGENT
// Manages user flow state and adaptive experiences
// ============================================================================

import { BaseAgent, AgentTask } from './base-agent';
import { globalEvents } from '../core/events';
import { flowStateEngine, FlowState, FlowAdaptation } from '../intelligence/flow-state';

export class FlowAgent extends BaseAgent {
  private flowHistory: Array<{ state: FlowState; timestamp: number }> = [];
  private adaptationOverrides = new Map<string, any>();

  constructor() {
    super('flow-agent', 'Flow Agent', 'Optimizes user experience based on flow state');
    this.registerCapabilities();
  }

  protected async onStart(): Promise<void> {
    // Subscribe to flow events
    globalEvents.on('flow:state-change', (data) => this.handleStateChange(data));
    globalEvents.on('flow:adaptation-update', (data) => this.handleAdaptationUpdate(data));
  }

  protected async onStop(): Promise<void> {
    // Cleanup
  }

  protected async processTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case 'optimize-flow':
        return this.optimizeFlow();
      case 'apply-adaptation':
        return this.applyAdaptation(task.data);
      case 'analyze-flow-history':
        return this.analyzeFlowHistory();
      case 'set-override':
        return this.setAdaptationOverride(task.data);
      default:
        console.warn(`[FlowAgent] Unknown task type: ${task.type}`);
    }
  }

  // ----------------------------- Capabilities -------------------------------
  private registerCapabilities(): void {
    this.registerCapability({
      name: 'optimize',
      description: 'Optimize current flow experience',
      handler: async () => this.optimizeFlow(),
    });

    this.registerCapability({
      name: 'adapt',
      description: 'Apply flow adaptation',
      handler: async (data) => this.applyAdaptation(data),
    });

    this.registerCapability({
      name: 'analyze',
      description: 'Analyze flow history',
      handler: async () => this.analyzeFlowHistory(),
    });
  }

  // ----------------------------- Event Handlers -----------------------------
  private handleStateChange(data: { from: FlowState; to: FlowState }): void {
    this.flowHistory.push({
      state: data.to,
      timestamp: Date.now(),
    });

    // Keep last 100 entries
    if (this.flowHistory.length > 100) {
      this.flowHistory.shift();
    }

    // Trigger optimization for significant state changes
    if (this.isSignificantChange(data.from, data.to)) {
      this.addTask({
        type: 'optimize-flow',
        priority: 'high',
        data: {},
      });
    }
  }

  private isSignificantChange(from: FlowState, to: FlowState): boolean {
    const stateOrder = ['idle', 'exploring', 'productive', 'focused', 'rushed'];
    const fromIndex = stateOrder.indexOf(from);
    const toIndex = stateOrder.indexOf(to);
    return Math.abs(fromIndex - toIndex) >= 2;
  }

  private handleAdaptationUpdate(adaptation: FlowAdaptation): void {
    // Apply any overrides
    const mergedAdaptation = { ...adaptation };
    
    for (const [key, value] of this.adaptationOverrides) {
      (mergedAdaptation as any)[key] = value;
    }

    // Apply to CSS
    flowStateEngine.applyToCSSVariables();
  }

  // ----------------------------- Flow Optimization --------------------------
  private async optimizeFlow(): Promise<{
    currentState: FlowState;
    recommendations: string[];
    appliedOptimizations: string[];
  }> {
    const currentState = flowStateEngine.getCurrentState();
    const adaptation = flowStateEngine.getAdaptation();
    const recommendations: string[] = [];
    const appliedOptimizations: string[] = [];

    switch (currentState) {
      case 'focused':
        // Reduce distractions
        recommendations.push('Minimize sidebar');
        recommendations.push('Disable non-critical notifications');
        
        globalEvents.emit('flow:optimize', {
          hideNotifications: true,
          reduceDitractions: true,
        });
        appliedOptimizations.push('Distraction reduction');
        break;

      case 'rushed':
        // Speed up everything
        recommendations.push('Enable instant transitions');
        recommendations.push('Preload all likely actions');
        
        globalEvents.emit('flow:optimize', {
          instantMode: true,
          aggressivePreload: true,
        });
        appliedOptimizations.push('Speed optimization');
        break;

      case 'exploring':
        // Enhance discovery
        recommendations.push('Show related items');
        recommendations.push('Enable preview mode');
        
        globalEvents.emit('flow:optimize', {
          showSuggestions: true,
          enablePreviews: true,
        });
        appliedOptimizations.push('Discovery enhancement');
        break;

      case 'idle':
        // Gentle engagement
        recommendations.push('Show activity summary');
        recommendations.push('Suggest next actions');
        
        globalEvents.emit('flow:optimize', {
          showSummary: true,
          gentleReminders: true,
        });
        appliedOptimizations.push('Engagement boost');
        break;
    }

    return { currentState, recommendations, appliedOptimizations };
  }

  private async applyAdaptation(data: Partial<FlowAdaptation>): Promise<void> {
    // Store overrides
    for (const [key, value] of Object.entries(data)) {
      this.adaptationOverrides.set(key, value);
    }

    // Trigger re-application
    globalEvents.emit('flow:adaptation-override', data);
  }

  private setAdaptationOverride(data: { key: string; value: any }): void {
    this.adaptationOverrides.set(data.key, data.value);
  }

  // ----------------------------- Analysis -----------------------------------
  private async analyzeFlowHistory(): Promise<{
    dominantState: FlowState;
    stateDistribution: Record<FlowState, number>;
    transitions: Array<{ from: FlowState; to: FlowState; count: number }>;
    insights: string[];
  }> {
    const stateDistribution: Record<FlowState, number> = {
      idle: 0,
      exploring: 0,
      focused: 0,
      productive: 0,
      rushed: 0,
    };

    const transitions = new Map<string, number>();

    // Calculate distribution
    for (const entry of this.flowHistory) {
      stateDistribution[entry.state]++;
    }

    // Calculate transitions
    for (let i = 1; i < this.flowHistory.length; i++) {
      const from = this.flowHistory[i - 1].state;
      const to = this.flowHistory[i].state;
      const key = `${from}→${to}`;
      transitions.set(key, (transitions.get(key) || 0) + 1);
    }

    // Find dominant state
    let dominantState: FlowState = 'idle';
    let maxCount = 0;
    for (const [state, count] of Object.entries(stateDistribution)) {
      if (count > maxCount) {
        maxCount = count;
        dominantState = state as FlowState;
      }
    }

    // Generate insights
    const insights: string[] = [];

    if (stateDistribution.rushed > stateDistribution.focused) {
      insights.push('User often seems rushed - consider simplifying workflows');
    }

    if (stateDistribution.idle > this.flowHistory.length * 0.3) {
      insights.push('High idle time - consider adding engagement features');
    }

    if (stateDistribution.focused > this.flowHistory.length * 0.4) {
      insights.push('User is highly focused - minimize interruptions');
    }

    return {
      dominantState,
      stateDistribution,
      transitions: Array.from(transitions.entries()).map(([key, count]) => {
        const [from, to] = key.split('→') as [FlowState, FlowState];
        return { from, to, count };
      }),
      insights,
    };
  }

  // ----------------------------- Getters ------------------------------------
  getCurrentFlow(): {
    state: FlowState;
    adaptation: FlowAdaptation;
    overrides: Record<string, any>;
  } {
    return {
      state: flowStateEngine.getCurrentState(),
      adaptation: flowStateEngine.getAdaptation(),
      overrides: Object.fromEntries(this.adaptationOverrides),
    };
  }

  getFlowHistory(): typeof this.flowHistory {
    return [...this.flowHistory];
  }
}

