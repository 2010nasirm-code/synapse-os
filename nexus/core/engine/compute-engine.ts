// ============================================================================
// NEXUS COMPUTE ENGINE - Processing & Reasoning System
// ============================================================================

import { Hook, HookName } from '../../types';
import { generateUUID, now, LRUCache } from '../../utils';
import { getConfig } from '../../config';

export interface ComputeJob<T = unknown, R = unknown> {
  id: string;
  type: string;
  input: T;
  output?: R;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: Error;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export type ComputeProcessor<T = unknown, R = unknown> = (
  input: T,
  context: ComputeContext
) => R | Promise<R>;

export interface ComputeContext {
  jobId: string;
  cache: LRUCache<string, unknown>;
  getFromCache: <T>(key: string) => T | undefined;
  setInCache: <T>(key: string, value: T, ttl?: number) => void;
  emit: (event: string, data: unknown) => void;
}

export interface ComputePipeline {
  id: string;
  name: string;
  stages: ComputeStage[];
}

export interface ComputeStage {
  name: string;
  processor: string;
  config?: Record<string, unknown>;
  condition?: (input: unknown, context: ComputeContext) => boolean;
}

export class NexusComputeEngine {
  private processors: Map<string, ComputeProcessor> = new Map();
  private pipelines: Map<string, ComputePipeline> = new Map();
  private jobs: Map<string, ComputeJob> = new Map();
  private cache: LRUCache<string, unknown>;
  private hooks: Map<HookName, Hook[]> = new Map();

  constructor() {
    const config = getConfig();
    this.cache = new LRUCache(config.cache.maxSize);
  }

  // ----------------------------- Processor Registration ---------------------
  registerProcessor<T, R>(type: string, processor: ComputeProcessor<T, R>): void {
    this.processors.set(type, processor as ComputeProcessor);
  }

  unregisterProcessor(type: string): boolean {
    return this.processors.delete(type);
  }

  getProcessor(type: string): ComputeProcessor | undefined {
    return this.processors.get(type);
  }

  // ----------------------------- Pipeline Management ------------------------
  createPipeline(name: string, stages: ComputeStage[]): ComputePipeline {
    const pipeline: ComputePipeline = {
      id: generateUUID(),
      name,
      stages,
    };
    this.pipelines.set(pipeline.id, pipeline);
    return pipeline;
  }

  getPipeline(id: string): ComputePipeline | undefined {
    return this.pipelines.get(id);
  }

  deletePipeline(id: string): boolean {
    return this.pipelines.delete(id);
  }

  // ----------------------------- Job Execution ------------------------------
  async compute<T, R>(
    type: string,
    input: T,
    metadata?: Record<string, unknown>
  ): Promise<ComputeJob<T, R>> {
    const processor = this.processors.get(type);
    if (!processor) {
      throw new Error(`No processor found for type: ${type}`);
    }

    const job: ComputeJob<T, R> = {
      id: generateUUID(),
      type,
      input,
      status: 'pending',
      createdAt: now(),
      metadata,
    };

    this.jobs.set(job.id, job as ComputeJob);

    // Run beforeCompute hooks
    await this.runHooks('beforeCompute', { job, input });

    const context = this.createContext(job.id);

    job.status = 'processing';
    job.startedAt = now();

    try {
      const output = await processor(input, context);
      job.output = output as R;
      job.status = 'completed';
    } catch (error) {
      job.error = error instanceof Error ? error : new Error(String(error));
      job.status = 'failed';
    }

    job.completedAt = now();
    job.duration = job.completedAt - (job.startedAt || job.createdAt);

    // Run afterCompute hooks
    await this.runHooks('afterCompute', { job, output: job.output });

    return job;
  }

  async executePipeline<T, R>(
    pipelineId: string,
    input: T,
    metadata?: Record<string, unknown>
  ): Promise<ComputeJob<T, R>> {
    const pipeline = this.pipelines.get(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline not found: ${pipelineId}`);
    }

    const job: ComputeJob<T, R> = {
      id: generateUUID(),
      type: `pipeline:${pipeline.name}`,
      input,
      status: 'pending',
      createdAt: now(),
      metadata: { ...metadata, pipelineId },
    };

    this.jobs.set(job.id, job as ComputeJob);

    const context = this.createContext(job.id);

    job.status = 'processing';
    job.startedAt = now();

    try {
      let currentData: unknown = input;

      for (const stage of pipeline.stages) {
        // Check condition
        if (stage.condition && !stage.condition(currentData, context)) {
          continue;
        }

        const processor = this.processors.get(stage.processor);
        if (!processor) {
          throw new Error(`Processor not found: ${stage.processor}`);
        }

        currentData = await processor(currentData, context);
      }

      job.output = currentData as R;
      job.status = 'completed';
    } catch (error) {
      job.error = error instanceof Error ? error : new Error(String(error));
      job.status = 'failed';
    }

    job.completedAt = now();
    job.duration = job.completedAt - (job.startedAt || job.createdAt);

    return job;
  }

  private createContext(jobId: string): ComputeContext {
    return {
      jobId,
      cache: this.cache,
      getFromCache: <T>(key: string) => this.cache.get(key) as T | undefined,
      setInCache: <T>(key: string, value: T) => this.cache.set(key, value),
      emit: (event: string, data: unknown) => {
        // Would emit to event bus
        console.log(`[Compute:${jobId}] Event: ${event}`, data);
      },
    };
  }

  // ----------------------------- Job Management -----------------------------
  getJob<T, R>(id: string): ComputeJob<T, R> | undefined {
    return this.jobs.get(id) as ComputeJob<T, R> | undefined;
  }

  getAllJobs(): ComputeJob[] {
    return Array.from(this.jobs.values());
  }

  clearCompletedJobs(): number {
    let count = 0;
    const entries = Array.from(this.jobs.entries());
    for (const [id, job] of entries) {
      if (job.status === 'completed' || job.status === 'failed') {
        this.jobs.delete(id);
        count++;
      }
    }
    return count;
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

  // ----------------------------- Caching ------------------------------------
  getCacheStats() {
    return {
      size: this.cache.size(),
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  // ----------------------------- Statistics ---------------------------------
  getStats() {
    const jobs = this.getAllJobs();
    const completedJobs = jobs.filter(j => j.status === 'completed');
    
    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter(j => j.status === 'pending').length,
      processingJobs: jobs.filter(j => j.status === 'processing').length,
      completedJobs: completedJobs.length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      avgDuration: completedJobs.length > 0
        ? completedJobs.reduce((sum, j) => sum + (j.duration || 0), 0) / completedJobs.length
        : 0,
      processors: this.processors.size,
      pipelines: this.pipelines.size,
      cacheSize: this.cache.size(),
    };
  }
}

// Singleton instance
export const computeEngine = new NexusComputeEngine();

// ----------------------------- Built-in Processors --------------------------
// Identity processor
computeEngine.registerProcessor('identity', (input) => input);

// Map processor
computeEngine.registerProcessor('map', (input, context) => {
  const { array, transform } = input as { array: unknown[]; transform: string };
  const fn = new Function('item', 'index', `return ${transform}`);
  return array.map((item, index) => fn(item, index));
});

// Filter processor
computeEngine.registerProcessor('filter', (input) => {
  const { array, predicate } = input as { array: unknown[]; predicate: string };
  const fn = new Function('item', 'index', `return ${predicate}`);
  return array.filter((item, index) => fn(item, index));
});

// Reduce processor
computeEngine.registerProcessor('reduce', (input) => {
  const { array, reducer, initial } = input as { array: unknown[]; reducer: string; initial: unknown };
  const fn = new Function('acc', 'item', 'index', `return ${reducer}`);
  return array.reduce((acc, item, index) => fn(acc, item, index), initial);
});

// Sort processor
computeEngine.registerProcessor('sort', (input) => {
  const { array, key, order = 'asc' } = input as { array: Record<string, unknown>[]; key: string; order?: 'asc' | 'desc' };
  return [...array].sort((a, b) => {
    const aVal = a[key] as number | string;
    const bVal = b[key] as number | string;
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return order === 'asc' ? comparison : -comparison;
  });
});

// Aggregate processor
computeEngine.registerProcessor('aggregate', (input) => {
  const { array, operations } = input as { 
    array: number[]; 
    operations: ('sum' | 'avg' | 'min' | 'max' | 'count')[];
  };
  
  const result: Record<string, number> = {};
  
  if (operations.includes('sum')) {
    result.sum = array.reduce((a, b) => a + b, 0);
  }
  if (operations.includes('avg')) {
    result.avg = array.length > 0 ? array.reduce((a, b) => a + b, 0) / array.length : 0;
  }
  if (operations.includes('min')) {
    result.min = Math.min(...array);
  }
  if (operations.includes('max')) {
    result.max = Math.max(...array);
  }
  if (operations.includes('count')) {
    result.count = array.length;
  }
  
  return result;
});

// Group processor
computeEngine.registerProcessor('group', (input) => {
  const { array, key } = input as { array: Record<string, unknown>[]; key: string };
  const groups: Record<string, Record<string, unknown>[]> = {};
  for (const item of array) {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
  }
  return groups;
});

// Flatten processor
computeEngine.registerProcessor('flatten', (input) => {
  const { array, depth = 1 } = input as { array: unknown[]; depth?: number };
  return array.flat(depth);
});

// Unique processor
computeEngine.registerProcessor('unique', (input) => {
  const { array, key } = input as { array: unknown[]; key?: string };
  if (key) {
    const seen = new Set();
    return (array as Record<string, unknown>[]).filter(item => {
      const value = item[key];
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
  }
  return Array.from(new Set(array));
});


