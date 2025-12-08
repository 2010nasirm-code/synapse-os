// ============================================================================
// NEXUS SCHEDULER - Task Scheduling System
// ============================================================================

import { generateUUID, now } from '../../utils';
import { eventBus } from '../../core/engine';

export type ScheduleType = 'once' | 'interval' | 'cron' | 'daily' | 'weekly';

export interface ScheduledJob {
  id: string;
  name: string;
  type: ScheduleType;
  handler: () => void | Promise<void>;
  config: {
    at?: number;        // Timestamp for 'once'
    interval?: number;  // Milliseconds for 'interval'
    cron?: string;      // Cron expression
    time?: string;      // HH:MM for daily
    dayOfWeek?: number; // 0-6 for weekly
  };
  enabled: boolean;
  lastRun?: number;
  nextRun?: number;
  runCount: number;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export class NexusScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  // ----------------------------- Job Management -----------------------------
  schedule(
    name: string,
    handler: () => void | Promise<void>,
    type: ScheduleType,
    config: ScheduledJob['config'],
    metadata?: Record<string, unknown>
  ): ScheduledJob {
    const job: ScheduledJob = {
      id: generateUUID(),
      name,
      type,
      handler,
      config,
      enabled: true,
      runCount: 0,
      createdAt: now(),
      metadata,
    };

    // Calculate next run
    job.nextRun = this.calculateNextRun(job);

    this.jobs.set(job.id, job);
    
    if (this.isRunning && job.enabled) {
      this.scheduleJob(job);
    }

    return job;
  }

  // Convenience methods
  scheduleOnce(
    name: string,
    handler: () => void | Promise<void>,
    at: number | Date
  ): ScheduledJob {
    const timestamp = at instanceof Date ? at.getTime() : at;
    return this.schedule(name, handler, 'once', { at: timestamp });
  }

  scheduleInterval(
    name: string,
    handler: () => void | Promise<void>,
    intervalMs: number
  ): ScheduledJob {
    return this.schedule(name, handler, 'interval', { interval: intervalMs });
  }

  scheduleDaily(
    name: string,
    handler: () => void | Promise<void>,
    time: string // HH:MM
  ): ScheduledJob {
    return this.schedule(name, handler, 'daily', { time });
  }

  scheduleWeekly(
    name: string,
    handler: () => void | Promise<void>,
    dayOfWeek: number,
    time: string
  ): ScheduledJob {
    return this.schedule(name, handler, 'weekly', { dayOfWeek, time });
  }

  // ----------------------------- Job Control --------------------------------
  cancel(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    // Clear timer
    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }

    return this.jobs.delete(jobId);
  }

  pause(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.enabled = false;

    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }

    return true;
  }

  resume(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    job.enabled = true;
    job.nextRun = this.calculateNextRun(job);

    if (this.isRunning) {
      this.scheduleJob(job);
    }

    return true;
  }

  trigger(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return Promise.reject(new Error('Job not found'));

    return this.executeJob(job);
  }

  // ----------------------------- Scheduler Control --------------------------
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    for (const job of this.jobs.values()) {
      if (job.enabled) {
        this.scheduleJob(job);
      }
    }
  }

  stop(): void {
    this.isRunning = false;

    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }

  // ----------------------------- Internal -----------------------------------
  private scheduleJob(job: ScheduledJob): void {
    if (!job.nextRun) return;

    const delay = Math.max(0, job.nextRun - now());

    const timer = setTimeout(async () => {
      await this.executeJob(job);

      // Reschedule if recurring
      if (job.type !== 'once' && job.enabled) {
        job.nextRun = this.calculateNextRun(job);
        this.scheduleJob(job);
      }
    }, delay);

    this.timers.set(job.id, timer);
  }

  private async executeJob(job: ScheduledJob): Promise<void> {
    try {
      eventBus.emit('scheduler:job:start', { jobId: job.id, name: job.name });
      
      await job.handler();
      
      job.lastRun = now();
      job.runCount++;
      
      eventBus.emit('scheduler:job:complete', { jobId: job.id, name: job.name });
    } catch (error) {
      eventBus.emit('scheduler:job:error', { jobId: job.id, name: job.name, error });
    }
  }

  private calculateNextRun(job: ScheduledJob): number {
    const currentTime = now();

    switch (job.type) {
      case 'once':
        return job.config.at || currentTime;

      case 'interval':
        return currentTime + (job.config.interval || 60000);

      case 'daily': {
        const [hours, minutes] = (job.config.time || '09:00').split(':').map(Number);
        const next = new Date();
        next.setHours(hours, minutes, 0, 0);
        if (next.getTime() <= currentTime) {
          next.setDate(next.getDate() + 1);
        }
        return next.getTime();
      }

      case 'weekly': {
        const [hours, minutes] = (job.config.time || '09:00').split(':').map(Number);
        const targetDay = job.config.dayOfWeek || 1;
        const next = new Date();
        next.setHours(hours, minutes, 0, 0);
        
        const currentDay = next.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0 || (daysUntil === 0 && next.getTime() <= currentTime)) {
          daysUntil += 7;
        }
        
        next.setDate(next.getDate() + daysUntil);
        return next.getTime();
      }

      case 'cron':
        // Simplified cron - in production use a proper cron parser
        return currentTime + 60000;

      default:
        return currentTime;
    }
  }

  // ----------------------------- Queries ------------------------------------
  getJob(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  getUpcomingJobs(limit: number = 10): ScheduledJob[] {
    return this.getAllJobs()
      .filter(j => j.enabled && j.nextRun)
      .sort((a, b) => (a.nextRun || 0) - (b.nextRun || 0))
      .slice(0, limit);
  }

  // ----------------------------- Statistics ---------------------------------
  getStats() {
    const jobs = this.getAllJobs();
    
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.enabled).length,
      pausedJobs: jobs.filter(j => !j.enabled).length,
      totalRuns: jobs.reduce((sum, j) => sum + j.runCount, 0),
      isRunning: this.isRunning,
    };
  }
}

// Singleton instance
export const nexusScheduler = new NexusScheduler();
export default nexusScheduler;


