// Background Sync Manager
import { createClient } from '@/lib/supabase/client';

interface SyncQueueItem {
  id: string;
  table: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
  retries: number;
}

const SYNC_QUEUE_KEY = 'nexus_sync_queue';
const MAX_RETRIES = 3;

export class SyncManager {
  private queue: SyncQueueItem[] = [];
  private isOnline: boolean = true;
  private syncInProgress: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadQueue();
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(SYNC_QUEUE_KEY);
      this.queue = stored ? JSON.parse(stored) : [];
    } catch {
      this.queue = [];
    }
  }

  private saveQueue() {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(this.queue));
  }

  private handleOnline() {
    this.isOnline = true;
    this.processQueue();
  }

  private handleOffline() {
    this.isOnline = false;
  }

  addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retries'>) {
    const queueItem: SyncQueueItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
    };
    this.queue.push(queueItem);
    this.saveQueue();
    
    if (this.isOnline) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.syncInProgress || !this.isOnline || this.queue.length === 0) return;
    
    this.syncInProgress = true;
    const supabase = createClient();
    
    const itemsToProcess = [...this.queue];
    
    for (const item of itemsToProcess) {
      try {
        let result;
        
        switch (item.action) {
          case 'create':
            result = await supabase.from(item.table).insert(item.data as any);
            break;
          case 'update':
            result = await supabase.from(item.table).update(item.data.updates as any).eq('id', item.data.id);
            break;
          case 'delete':
            result = await supabase.from(item.table).delete().eq('id', item.data.id);
            break;
        }
        
        if (result?.error) throw result.error;
        
        // Remove from queue on success
        this.queue = this.queue.filter(q => q.id !== item.id);
        this.saveQueue();
        
      } catch (error) {
        item.retries++;
        if (item.retries >= MAX_RETRIES) {
          this.queue = this.queue.filter(q => q.id !== item.id);
        }
        this.saveQueue();
      }
    }
    
    this.syncInProgress = false;
  }

  getQueueLength() {
    return this.queue.length;
  }

  isNetworkOnline() {
    return this.isOnline;
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }
}

export const syncManager = new SyncManager();


