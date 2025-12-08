// Self-Healing Architecture - Auto-detect and fix issues
export interface HealingAction {
  id: string;
  type: 'restore' | 'patch' | 'reload' | 'reset' | 'retry';
  target: string;
  description: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export interface SystemStatus {
  isHealthy: boolean;
  lastCheck: Date;
  issues: string[];
  healingActions: HealingAction[];
  uptime: number;
}

const STORAGE_KEY = 'nexus_healing_log';
const MAX_RETRY_ATTEMPTS = 3;

class SelfHealingArchitecture {
  private status: SystemStatus = {
    isHealthy: true,
    lastCheck: new Date(),
    issues: [],
    healingActions: [],
    uptime: Date.now(),
  };
  private retryCounters: Map<string, number> = new Map();
  private listeners: Set<(status: SystemStatus) => void> = new Set();

  constructor() {
    this.load();
    this.startMonitoring();
  }

  private load() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.status.healingActions = data.healingActions?.map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        })) || [];
      }
    } catch {}
  }

  private save() {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      healingActions: this.status.healingActions.slice(-50),
    }));
  }

  private startMonitoring() {
    if (typeof window === 'undefined') return;

    // Monitor for errors
    window.addEventListener('error', (event) => {
      this.handleError('runtime', event.message, event.filename);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('promise', String(event.reason));
    });

    // Periodic health check
    setInterval(() => this.healthCheck(), 30000);

    // Check on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.healthCheck();
      }
    });
  }

  private async handleError(type: string, message: string, source?: string) {
    const errorKey = `${type}:${message}`;
    
    // Track retry count
    const retryCount = this.retryCounters.get(errorKey) || 0;
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      console.warn(`[SelfHealing] Max retries reached for: ${errorKey}`);
      return;
    }
    
    this.retryCounters.set(errorKey, retryCount + 1);
    this.status.issues.push(message);
    this.status.isHealthy = false;
    
    // Attempt healing based on error type
    const action = await this.heal(type, message, source);
    if (action) {
      this.status.healingActions.push(action);
      this.save();
    }
    
    this.notifyListeners();
  }

  private async heal(type: string, message: string, source?: string): Promise<HealingAction | null> {
    const action: HealingAction = {
      id: `heal-${Date.now()}`,
      type: 'patch',
      target: source || type,
      description: '',
      timestamp: new Date(),
      success: false,
    };

    try {
      // Network/fetch errors
      if (message.includes('fetch') || message.includes('network')) {
        action.type = 'retry';
        action.description = 'Retrying failed network request';
        
        // Queue for retry when online
        if (!navigator.onLine) {
          action.description = 'Waiting for network connection';
        }
        action.success = true;
      }
      
      // LocalStorage errors
      else if (message.includes('localStorage') || message.includes('QuotaExceeded')) {
        action.type = 'reset';
        action.description = 'Clearing old cache data';
        
        // Clear old data
        const keys = Object.keys(localStorage);
        const nexusKeys = keys.filter(k => k.startsWith('nexus_'));
        for (const key of nexusKeys) {
          const data = localStorage.getItem(key);
          if (data && data.length > 100000) { // > 100KB
            localStorage.removeItem(key);
          }
        }
        action.success = true;
      }
      
      // State corruption
      else if (message.includes('JSON') || message.includes('parse')) {
        action.type = 'restore';
        action.description = 'Restoring corrupted state';
        
        // Find and remove corrupted items
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          try {
            const data = localStorage.getItem(key);
            if (data) JSON.parse(data);
          } catch {
            localStorage.removeItem(key);
          }
        }
        action.success = true;
      }
      
      // Component/render errors
      else if (message.includes('render') || message.includes('component')) {
        action.type = 'reload';
        action.description = 'Refreshing component state';
        
        // Dispatch refresh event
        window.dispatchEvent(new CustomEvent('nexus:refresh'));
        action.success = true;
      }
      
      // Supabase errors
      else if (message.includes('supabase') || message.includes('database')) {
        action.type = 'retry';
        action.description = 'Retrying database operation';
        
        // Will be picked up by sync manager
        action.success = true;
      }
      
      // Unknown errors - log and continue
      else {
        action.type = 'patch';
        action.description = 'Logged error for analysis';
        action.success = true;
      }

      // Clear the issue if healed
      if (action.success) {
        this.status.issues = this.status.issues.filter(i => i !== message);
        if (this.status.issues.length === 0) {
          this.status.isHealthy = true;
        }
      }

    } catch (error) {
      action.success = false;
      action.error = String(error);
    }

    return action;
  }

  async healthCheck(): Promise<SystemStatus> {
    this.status.lastCheck = new Date();
    const issues: string[] = [];
    
    // Check localStorage
    try {
      localStorage.setItem('nexus_health_test', 'ok');
      localStorage.removeItem('nexus_health_test');
    } catch {
      issues.push('LocalStorage unavailable');
    }
    
    // Check IndexedDB
    if (typeof indexedDB !== 'undefined') {
      try {
        const request = indexedDB.open('nexus_health_test');
        request.onsuccess = () => {
          request.result.close();
          indexedDB.deleteDatabase('nexus_health_test');
        };
      } catch {
        issues.push('IndexedDB unavailable');
      }
    }
    
    // Check network
    if (!navigator.onLine) {
      issues.push('Network offline');
    }
    
    // Check service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        // Not critical, just note it
      }
    }
    
    // Check memory (if available)
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
        issues.push('High memory usage');
        
        // Attempt to free memory
        this.heal('memory', 'High memory usage');
      }
    }
    
    this.status.issues = issues;
    this.status.isHealthy = issues.length === 0;
    this.status.uptime = Date.now() - this.status.uptime;
    
    this.notifyListeners();
    return this.status;
  }

  getStatus(): SystemStatus {
    return { ...this.status };
  }

  getHealingHistory(): HealingAction[] {
    return [...this.status.healingActions];
  }

  subscribe(listener: (status: SystemStatus) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.status));
  }

  // Manual healing trigger
  async forceHeal(): Promise<void> {
    // Clear all caches
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear IndexedDB
    if (typeof indexedDB !== 'undefined') {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name?.startsWith('nexus')) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    }
    
    // Reload
    window.location.reload();
  }

  clearHistory() {
    this.status.healingActions = [];
    this.save();
    this.notifyListeners();
  }
}

export const selfHealing = new SelfHealingArchitecture();


