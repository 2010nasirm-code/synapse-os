// Predictive Flow Engine - Pre-loads and predicts user actions
export interface PredictedAction {
  action: string;
  target: string;
  confidence: number;
  preloadData?: any;
}

export interface UserBehaviorModel {
  timePatterns: Map<number, string[]>; // Hour -> common actions
  sequencePatterns: Map<string, string[]>; // current action -> likely next
  contextPatterns: Map<string, string[]>; // page context -> common actions
}

const STORAGE_KEY = 'nexus_predictive_flow';

class PredictiveFlowEngine {
  private behaviorModel: UserBehaviorModel = {
    timePatterns: new Map(),
    sequencePatterns: new Map(),
    contextPatterns: new Map(),
  };
  private actionHistory: { action: string; context: string; timestamp: number }[] = [];
  private preloadedResources: Set<string> = new Set();
  private prefetchCallbacks: Map<string, () => Promise<any>> = new Map();

  constructor() {
    this.load();
    this.startPredictor();
  }

  private load() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.actionHistory = data.actionHistory || [];
        // Reconstruct maps
        if (data.timePatterns) {
          this.behaviorModel.timePatterns = new Map(data.timePatterns);
        }
        if (data.sequencePatterns) {
          this.behaviorModel.sequencePatterns = new Map(data.sequencePatterns);
        }
        if (data.contextPatterns) {
          this.behaviorModel.contextPatterns = new Map(data.contextPatterns);
        }
      }
    } catch {
      // Start fresh
    }
  }

  private save() {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      actionHistory: this.actionHistory.slice(-500),
      timePatterns: Array.from(this.behaviorModel.timePatterns.entries()),
      sequencePatterns: Array.from(this.behaviorModel.sequencePatterns.entries()),
      contextPatterns: Array.from(this.behaviorModel.contextPatterns.entries()),
    }));
  }

  recordAction(action: string, context: string) {
    const record = { action, context, timestamp: Date.now() };
    this.actionHistory.push(record);
    
    // Update time patterns
    const hour = new Date().getHours();
    const timeActions = this.behaviorModel.timePatterns.get(hour) || [];
    timeActions.push(action);
    this.behaviorModel.timePatterns.set(hour, timeActions.slice(-50));
    
    // Update sequence patterns
    if (this.actionHistory.length > 1) {
      const prev = this.actionHistory[this.actionHistory.length - 2].action;
      const seqActions = this.behaviorModel.sequencePatterns.get(prev) || [];
      seqActions.push(action);
      this.behaviorModel.sequencePatterns.set(prev, seqActions.slice(-30));
    }
    
    // Update context patterns
    const ctxActions = this.behaviorModel.contextPatterns.get(context) || [];
    ctxActions.push(action);
    this.behaviorModel.contextPatterns.set(context, ctxActions.slice(-30));
    
    this.save();
    
    // Trigger predictions
    this.predict();
  }

  registerPrefetch(action: string, callback: () => Promise<any>) {
    this.prefetchCallbacks.set(action, callback);
  }

  private predict(): PredictedAction[] {
    const predictions: PredictedAction[] = [];
    const currentContext = typeof window !== 'undefined' ? window.location.pathname : '/';
    const currentHour = new Date().getHours();
    const lastAction = this.actionHistory[this.actionHistory.length - 1]?.action;
    
    // Time-based predictions
    const timeActions = this.behaviorModel.timePatterns.get(currentHour) || [];
    const timeFreq = this.getFrequencies(timeActions);
    for (const [action, count] of timeFreq.slice(0, 3)) {
      predictions.push({
        action,
        target: action,
        confidence: Math.min(count / timeActions.length * 100, 90),
      });
    }
    
    // Sequence-based predictions
    if (lastAction) {
      const seqActions = this.behaviorModel.sequencePatterns.get(lastAction) || [];
      const seqFreq = this.getFrequencies(seqActions);
      for (const [action, count] of seqFreq.slice(0, 3)) {
        const existing = predictions.find(p => p.action === action);
        if (existing) {
          existing.confidence = Math.min(existing.confidence + count / seqActions.length * 50, 95);
        } else {
          predictions.push({
            action,
            target: action,
            confidence: count / seqActions.length * 80,
          });
        }
      }
    }
    
    // Context-based predictions
    const ctxActions = this.behaviorModel.contextPatterns.get(currentContext) || [];
    const ctxFreq = this.getFrequencies(ctxActions);
    for (const [action, count] of ctxFreq.slice(0, 3)) {
      const existing = predictions.find(p => p.action === action);
      if (existing) {
        existing.confidence = Math.min(existing.confidence + count / ctxActions.length * 30, 98);
      } else {
        predictions.push({
          action,
          target: action,
          confidence: count / ctxActions.length * 60,
        });
      }
    }
    
    // Sort by confidence and prefetch top predictions
    predictions.sort((a, b) => b.confidence - a.confidence);
    this.prefetch(predictions.slice(0, 3));
    
    return predictions;
  }

  private getFrequencies(arr: string[]): [string, number][] {
    const freq = new Map<string, number>();
    for (const item of arr) {
      freq.set(item, (freq.get(item) || 0) + 1);
    }
    return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
  }

  private async prefetch(predictions: PredictedAction[]) {
    for (const pred of predictions) {
      if (pred.confidence > 60 && !this.preloadedResources.has(pred.action)) {
        const callback = this.prefetchCallbacks.get(pred.action);
        if (callback) {
          try {
            const data = await callback();
            pred.preloadData = data;
            this.preloadedResources.add(pred.action);
            
            // Clear after 30 seconds
            setTimeout(() => {
              this.preloadedResources.delete(pred.action);
            }, 30000);
          } catch {
            // Prefetch failed, not critical
          }
        }
      }
    }
  }

  private startPredictor() {
    if (typeof window === 'undefined') return;
    
    // Re-run predictions every 10 seconds
    setInterval(() => {
      this.predict();
    }, 10000);
  }

  getPredictions(): PredictedAction[] {
    return this.predict();
  }

  getPreloadedData(action: string): any | null {
    const callback = this.prefetchCallbacks.get(action);
    if (callback && this.preloadedResources.has(action)) {
      return callback();
    }
    return null;
  }

  reset() {
    this.behaviorModel = {
      timePatterns: new Map(),
      sequencePatterns: new Map(),
      contextPatterns: new Map(),
    };
    this.actionHistory = [];
    this.preloadedResources.clear();
    this.save();
  }
}

export const predictiveFlow = new PredictiveFlowEngine();


