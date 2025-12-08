// ============================================================================
// NEXUS TASK ENGINE - Task Execution System
// ============================================================================

import { NexusTask, TaskExecutor, TaskStatus, TaskPriority, Hook, HookName } from '../../types';
import { generateUUID, now, sleep } from '../../utils';
import { getConfig } from '../../config';

export class NexusTaskEngine {
  private tasks: Map<string, NexusTask> = new Map();
  private executors: Map<string, TaskExecutor> = new Map();
  private queue: NexusTask[] = [];
  private running: Set<string> = new Set();
  private hooks: Map<HookName, Hook[]> = new Map();
  private isProcessing = false;

  // ----------------------------- Task Management ----------------------------
  createTask<T, R>(
    type: string,
    payload: T,
    options: Partial<Pick<NexusTask<T, R>, 'name' | 'priority' | 'timeout' | 'maxRetries' | 'metadata'>> = {}
  ): NexusTask<T, R> {
    const config = getConfig();
    
    const task: NexusTask<T, R> = {
      id: generateUUID(),
      name: options.name || `Task-${type}`,
      type,
      status: 'pending',
      priority: options.priority || 'normal',
      payload,
      createdAt: now(),
      retries: 0,
      maxRetries: options.maxRetries ?? config.tasks.maxRetries,
      timeout: options.timeout ?? config.tasks.defaultTimeout,
      metadata: options.metadata,
    };

    this.tasks.set(task.id, task as NexusTask);
    this.enqueue(task as NexusTask);
    
    return task;
  }

  getTask<T, R>(id: string): NexusTask<T, R> | undefined {
    return this.tasks.get(id) as NexusTask<T, R> | undefined;
  }

  getAllTasks(): NexusTask[] {
    return Array.from(this.tasks.values());
  }

  getTasksByStatus(status: TaskStatus): NexusTask[] {
    return this.getAllTasks().filter(t => t.status === status);
  }

  cancelTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task || task.status === 'completed' || task.status === 'failed') {
      return false;
    }
    
    task.status = 'cancelled';
    this.running.delete(id);
    this.queue = this.queue.filter(t => t.id !== id);
    
    return true;
  }

  // ----------------------------- Executor Registration ----------------------
  registerExecutor<T, R>(executor: TaskExecutor<T, R>): void {
    this.executors.set(executor.type, executor as TaskExecutor);
  }

  unregisterExecutor(type: string): boolean {
    return this.executors.delete(type);
  }

  getExecutor(type: string): TaskExecutor | undefined {
    return this.executors.get(type);
  }

  // ----------------------------- Queue Management ---------------------------
  private enqueue(task: NexusTask): void {
    // Insert based on priority
    const priorityOrder: Record<TaskPriority, number> = {
      critical: 0,
      high: 1,
      normal: 2,
      low: 3,
    };

    const insertIndex = this.queue.findIndex(
      t => priorityOrder[t.priority] > priorityOrder[task.priority]
    );

    if (insertIndex === -1) {
      this.queue.push(task);
    } else {
      this.queue.splice(insertIndex, 0, task);
    }

    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const config = getConfig();

    while (this.queue.length > 0 && this.running.size < config.tasks.maxConcurrent) {
      const task = this.queue.shift();
      if (!task) break;

      this.running.add(task.id);
      this.executeTask(task).finally(() => {
        this.running.delete(task.id);
        this.processQueue();
      });
    }

    this.isProcessing = false;
  }

  private async executeTask(task: NexusTask): Promise<void> {
    const executor = this.executors.get(task.type);
    
    if (!executor) {
      task.status = 'failed';
      task.error = new Error(`No executor found for task type: ${task.type}`);
      return;
    }

    // Validate payload
    if (executor.validate && !executor.validate(task.payload)) {
      task.status = 'failed';
      task.error = new Error('Task payload validation failed');
      return;
    }

    // Run hooks
    await this.runHooks('taskStarted', task);

    task.status = 'running';
    task.startedAt = now();
    executor.onStart?.(task);

    try {
      // Execute with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), task.timeout);
      });

      const result = await Promise.race([
        executor.execute(task),
        timeoutPromise,
      ]);

      task.result = result;
      task.status = 'completed';
      task.completedAt = now();
      executor.onComplete?.(task, result);

      await this.runHooks('taskCompleted', task);

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      if (task.retries < task.maxRetries) {
        task.retries++;
        task.status = 'pending';
        
        const config = getConfig();
        await sleep(config.tasks.retryDelay * task.retries);
        
        this.enqueue(task);
      } else {
        task.status = 'failed';
        task.error = err;
        task.completedAt = now();
        executor.onError?.(task, err);
      }
    }
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

  removeHook(name: HookName, handler: Hook['handler']): boolean {
    const hooks = this.hooks.get(name);
    if (!hooks) return false;
    
    const index = hooks.findIndex(h => h.handler === handler);
    if (index === -1) return false;
    
    hooks.splice(index, 1);
    return true;
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

  // ----------------------------- Statistics ---------------------------------
  getStats() {
    const tasks = this.getAllTasks();
    
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      queueLength: this.queue.length,
      activeExecutors: this.executors.size,
    };
  }

  // ----------------------------- Cleanup ------------------------------------
  clearCompleted(): number {
    let count = 0;
    const entries = Array.from(this.tasks.entries());
    for (const [id, task] of entries) {
      if (task.status === 'completed' || task.status === 'cancelled') {
        this.tasks.delete(id);
        count++;
      }
    }
    return count;
  }

  clearAll(): void {
    // Cancel all running tasks
    const runningIds = Array.from(this.running);
    for (const id of runningIds) {
      this.cancelTask(id);
    }
    
    this.tasks.clear();
    this.queue = [];
    this.running.clear();
  }
}

// Singleton instance
export const taskEngine = new NexusTaskEngine();

// ----------------------------- Built-in Executors ---------------------------
// Generic async executor
taskEngine.registerExecutor({
  type: 'async',
  execute: async (task) => {
    const fn = task.payload as () => Promise<unknown>;
    return await fn();
  },
});

// Delayed executor
taskEngine.registerExecutor({
  type: 'delayed',
  execute: async (task) => {
    const { delay, action } = task.payload as { delay: number; action: () => unknown };
    await sleep(delay);
    return typeof action === 'function' ? action() : action;
  },
});

// Batch executor
taskEngine.registerExecutor({
  type: 'batch',
  execute: async (task) => {
    const { items, processor } = task.payload as { 
      items: unknown[]; 
      processor: (item: unknown) => Promise<unknown>;
    };
    return await Promise.all(items.map(processor));
  },
});


