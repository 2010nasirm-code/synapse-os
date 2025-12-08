// ============================================================================
// NEXUS PERFORMANCE - Request Batching
// ============================================================================

interface BatchRequest<T, R> {
  input: T;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
}

interface BatcherOptions<T, R> {
  maxBatchSize?: number;
  maxWaitTime?: number;
  processor: (inputs: T[]) => Promise<R[]>;
}

export class RequestBatcher<T, R> {
  private queue: BatchRequest<T, R>[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private maxBatchSize: number;
  private maxWaitTime: number;
  private processor: (inputs: T[]) => Promise<R[]>;

  constructor(options: BatcherOptions<T, R>) {
    this.maxBatchSize = options.maxBatchSize || 10;
    this.maxWaitTime = options.maxWaitTime || 50;
    this.processor = options.processor;
  }

  async add(input: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push({ input, resolve, reject });

      if (this.queue.length >= this.maxBatchSize) {
        this.flush();
      } else if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), this.maxWaitTime);
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.maxBatchSize);
    const inputs = batch.map(r => r.input);

    try {
      const results = await this.processor(inputs);
      
      batch.forEach((request, index) => {
        if (results[index] !== undefined) {
          request.resolve(results[index]);
        } else {
          request.reject(new Error('No result for batch item'));
        }
      });
    } catch (error) {
      batch.forEach(request => {
        request.reject(error instanceof Error ? error : new Error(String(error)));
      });
    }
  }

  pending(): number {
    return this.queue.length;
  }

  clear(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    
    this.queue.forEach(request => {
      request.reject(new Error('Batch cleared'));
    });
    
    this.queue = [];
  }
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}

// Rate limiter
export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number;
  private lastRefill: number;

  constructor(options: { maxRequests: number; perSeconds: number }) {
    this.maxTokens = options.maxRequests;
    this.tokens = options.maxRequests;
    this.refillRate = options.maxRequests / options.perSeconds;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  canProceed(): boolean {
    this.refill();
    return this.tokens >= 1;
  }

  async acquire(): Promise<boolean> {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }

    // Wait for refill
    const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    this.refill();
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }

    return false;
  }

  remaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

// Concurrent limiter
export class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];
  private maxConcurrent: number;

  constructor(maxConcurrent: number) {
    this.maxConcurrent = maxConcurrent;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.maxConcurrent) {
      this.running++;
      return Promise.resolve();
    }

    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  private release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) {
      this.running++;
      next();
    }
  }

  pending(): number {
    return this.queue.length;
  }

  active(): number {
    return this.running;
  }
}


