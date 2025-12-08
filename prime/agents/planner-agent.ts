// ============================================================================
// NEXUS PRIME - PLANNER AGENT
// Workflow planning and task orchestration
// ============================================================================

import { BaseAgent, AgentTask } from './base-agent';
import { globalEvents } from '../core/events';

export interface Plan {
  id: string;
  name: string;
  steps: PlanStep[];
  status: 'draft' | 'active' | 'paused' | 'completed' | 'failed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface PlanStep {
  id: string;
  name: string;
  action: string;
  dependencies: string[];
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  data: any;
  result?: any;
}

export class PlannerAgent extends BaseAgent {
  private plans = new Map<string, Plan>();

  constructor() {
    super('planner-agent', 'Planner Agent', 'Plans and coordinates complex workflows');
    this.registerCapabilities();
  }

  protected async onStart(): Promise<void> {
    globalEvents.on('planner:create-plan', (data) => this.createPlanFromGoal(data));
  }

  protected async onStop(): Promise<void> {
    // Save plans
    this.savePlans();
  }

  protected async processTask(task: AgentTask): Promise<any> {
    switch (task.type) {
      case 'create-plan':
        return this.createPlanFromGoal(task.data);
      case 'execute-plan':
        return this.executePlan(task.data.planId);
      case 'next-step':
        return this.executeNextStep(task.data.planId);
      default:
        console.warn(`[PlannerAgent] Unknown task type: ${task.type}`);
    }
  }

  // ----------------------------- Capabilities -------------------------------
  private registerCapabilities(): void {
    this.registerCapability({
      name: 'plan',
      description: 'Create execution plan from goal',
      handler: async (data) => this.createPlanFromGoal(data),
    });

    this.registerCapability({
      name: 'execute',
      description: 'Execute a plan',
      handler: async (data) => this.executePlan(data.planId),
    });
  }

  // ----------------------------- Plan Creation ------------------------------
  async createPlanFromGoal(data: { goal: string; context?: any }): Promise<Plan> {
    const { goal, context } = data;
    
    // Analyze goal and create steps
    const steps = this.analyzeGoalAndCreateSteps(goal, context);

    const plan: Plan = {
      id: `plan-${Date.now()}`,
      name: goal,
      steps,
      status: 'draft',
      createdAt: Date.now(),
    };

    this.plans.set(plan.id, plan);
    globalEvents.emit('planner:plan-created', plan);

    return plan;
  }

  private analyzeGoalAndCreateSteps(goal: string, context?: any): PlanStep[] {
    const steps: PlanStep[] = [];
    const goalLower = goal.toLowerCase();

    // Simple rule-based step generation
    // In a real implementation, this would use AI

    if (goalLower.includes('create') || goalLower.includes('add')) {
      steps.push({
        id: 'step-1',
        name: 'Prepare data',
        action: 'prepare',
        dependencies: [],
        status: 'pending',
        data: { goal },
      });
      steps.push({
        id: 'step-2',
        name: 'Validate input',
        action: 'validate',
        dependencies: ['step-1'],
        status: 'pending',
        data: {},
      });
      steps.push({
        id: 'step-3',
        name: 'Execute creation',
        action: 'create',
        dependencies: ['step-2'],
        status: 'pending',
        data: { context },
      });
      steps.push({
        id: 'step-4',
        name: 'Verify result',
        action: 'verify',
        dependencies: ['step-3'],
        status: 'pending',
        data: {},
      });
    } else if (goalLower.includes('update') || goalLower.includes('modify')) {
      steps.push({
        id: 'step-1',
        name: 'Load current state',
        action: 'load',
        dependencies: [],
        status: 'pending',
        data: { goal },
      });
      steps.push({
        id: 'step-2',
        name: 'Apply modifications',
        action: 'modify',
        dependencies: ['step-1'],
        status: 'pending',
        data: { context },
      });
      steps.push({
        id: 'step-3',
        name: 'Save changes',
        action: 'save',
        dependencies: ['step-2'],
        status: 'pending',
        data: {},
      });
    } else {
      // Generic plan
      steps.push({
        id: 'step-1',
        name: 'Analyze requirements',
        action: 'analyze',
        dependencies: [],
        status: 'pending',
        data: { goal, context },
      });
      steps.push({
        id: 'step-2',
        name: 'Execute task',
        action: 'execute',
        dependencies: ['step-1'],
        status: 'pending',
        data: {},
      });
      steps.push({
        id: 'step-3',
        name: 'Finalize',
        action: 'finalize',
        dependencies: ['step-2'],
        status: 'pending',
        data: {},
      });
    }

    return steps;
  }

  // ----------------------------- Plan Execution -----------------------------
  async executePlan(planId: string): Promise<boolean> {
    const plan = this.plans.get(planId);
    if (!plan) return false;

    plan.status = 'active';
    plan.startedAt = Date.now();
    globalEvents.emit('planner:plan-started', plan);

    try {
      while (this.hasRemainingSteps(plan)) {
        const result = await this.executeNextStep(planId);
        if (!result) {
          plan.status = 'failed';
          break;
        }
      }

      if (plan.status !== 'failed') {
        plan.status = 'completed';
        plan.completedAt = Date.now();
      }

      globalEvents.emit('planner:plan-completed', plan);
      return plan.status === 'completed';

    } catch (error) {
      plan.status = 'failed';
      globalEvents.emit('planner:plan-failed', { plan, error });
      return false;
    }
  }

  private hasRemainingSteps(plan: Plan): boolean {
    return plan.steps.some(s => s.status === 'pending' || s.status === 'running');
  }

  async executeNextStep(planId: string): Promise<boolean> {
    const plan = this.plans.get(planId);
    if (!plan) return false;

    // Find next executable step (dependencies satisfied)
    const nextStep = plan.steps.find(step => {
      if (step.status !== 'pending') return false;
      
      // Check dependencies
      return step.dependencies.every(depId => {
        const dep = plan.steps.find(s => s.id === depId);
        return dep && dep.status === 'completed';
      });
    });

    if (!nextStep) {
      return !this.hasRemainingSteps(plan);
    }

    try {
      nextStep.status = 'running';
      globalEvents.emit('planner:step-started', { plan, step: nextStep });

      // Execute step
      const result = await this.executeStepAction(nextStep);
      
      nextStep.status = 'completed';
      nextStep.result = result;
      globalEvents.emit('planner:step-completed', { plan, step: nextStep });

      return true;
    } catch (error) {
      nextStep.status = 'failed';
      globalEvents.emit('planner:step-failed', { plan, step: nextStep, error });
      return false;
    }
  }

  private async executeStepAction(step: PlanStep): Promise<any> {
    // Emit event for step action
    return new Promise((resolve) => {
      globalEvents.emit(`planner:action:${step.action}`, step.data);
      
      // Simulate async action
      setTimeout(() => {
        resolve({ success: true, action: step.action });
      }, 100);
    });
  }

  // ----------------------------- Plan Management ----------------------------
  pausePlan(planId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan || plan.status !== 'active') return false;

    plan.status = 'paused';
    globalEvents.emit('planner:plan-paused', plan);
    return true;
  }

  resumePlan(planId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan || plan.status !== 'paused') return false;

    plan.status = 'active';
    this.executePlan(planId);
    return true;
  }

  cancelPlan(planId: string): boolean {
    const plan = this.plans.get(planId);
    if (!plan) return false;

    plan.status = 'failed';
    plan.steps.forEach(step => {
      if (step.status === 'pending') {
        step.status = 'skipped';
      }
    });

    globalEvents.emit('planner:plan-cancelled', plan);
    return true;
  }

  // ----------------------------- Persistence --------------------------------
  private savePlans(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const data = Array.from(this.plans.entries());
      localStorage.setItem('nexus-prime-plans', JSON.stringify(data));
    } catch (e) {
      console.warn('[PlannerAgent] Failed to save plans:', e);
    }
  }

  loadPlans(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const saved = localStorage.getItem('nexus-prime-plans');
      if (saved) {
        const data = JSON.parse(saved);
        this.plans = new Map(data);
      }
    } catch (e) {
      console.warn('[PlannerAgent] Failed to load plans:', e);
    }
  }

  // ----------------------------- Getters ------------------------------------
  getPlan(planId: string): Plan | undefined {
    return this.plans.get(planId);
  }

  getAllPlans(): Plan[] {
    return Array.from(this.plans.values());
  }

  getActivePlans(): Plan[] {
    return this.getAllPlans().filter(p => p.status === 'active');
  }
}

