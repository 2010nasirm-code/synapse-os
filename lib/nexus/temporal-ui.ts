// Temporal UI Memory - The UI learns and adapts to user behavior
export interface UIInteraction {
  element: string;
  action: 'click' | 'hover' | 'focus' | 'scroll';
  timestamp: number;
  duration?: number;
  context: string;
}

export interface UIPattern {
  id: string;
  sequence: string[];
  frequency: number;
  lastOccurred: number;
  avgTimeBetween: number;
}

export interface UIOptimization {
  type: 'reorder' | 'highlight' | 'shortcut' | 'preload';
  target: string;
  priority: number;
  reason: string;
}

const STORAGE_KEY = 'nexus_temporal_ui';
const MAX_INTERACTIONS = 1000;
const PATTERN_THRESHOLD = 3;

class TemporalUIMemory {
  private interactions: UIInteraction[] = [];
  private patterns: UIPattern[] = [];
  private optimizations: UIOptimization[] = [];

  constructor() {
    this.load();
  }

  private load() {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.interactions = data.interactions || [];
        this.patterns = data.patterns || [];
      }
    } catch {
      // Start fresh
    }
  }

  private save() {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      interactions: this.interactions.slice(-MAX_INTERACTIONS),
      patterns: this.patterns,
    }));
  }

  recordInteraction(interaction: Omit<UIInteraction, 'timestamp'>) {
    const record: UIInteraction = {
      ...interaction,
      timestamp: Date.now(),
    };
    
    this.interactions.push(record);
    this.analyzePatterns();
    this.save();
  }

  private analyzePatterns() {
    // Get recent interactions (last 100)
    const recent = this.interactions.slice(-100);
    
    // Look for sequences of 2-4 actions
    for (let seqLength = 2; seqLength <= 4; seqLength++) {
      for (let i = 0; i <= recent.length - seqLength; i++) {
        const sequence = recent.slice(i, i + seqLength).map(r => r.element);
        const sequenceKey = sequence.join('->');
        
        // Count occurrences
        let count = 0;
        const occurrences: number[] = [];
        
        for (let j = 0; j <= recent.length - seqLength; j++) {
          const checkSeq = recent.slice(j, j + seqLength).map(r => r.element).join('->');
          if (checkSeq === sequenceKey) {
            count++;
            occurrences.push(recent[j].timestamp);
          }
        }
        
        if (count >= PATTERN_THRESHOLD) {
          const existing = this.patterns.find(p => p.sequence.join('->') === sequenceKey);
          
          if (existing) {
            existing.frequency = count;
            existing.lastOccurred = occurrences[occurrences.length - 1];
          } else {
            // Calculate average time between occurrences
            let avgTime = 0;
            if (occurrences.length > 1) {
              const diffs = [];
              for (let k = 1; k < occurrences.length; k++) {
                diffs.push(occurrences[k] - occurrences[k - 1]);
              }
              avgTime = diffs.reduce((a, b) => a + b, 0) / diffs.length;
            }
            
            this.patterns.push({
              id: `pattern-${Date.now()}`,
              sequence,
              frequency: count,
              lastOccurred: occurrences[occurrences.length - 1],
              avgTimeBetween: avgTime,
            });
          }
        }
      }
    }
    
    // Keep only top 20 patterns
    this.patterns.sort((a, b) => b.frequency - a.frequency);
    this.patterns = this.patterns.slice(0, 20);
    
    // Generate optimizations
    this.generateOptimizations();
  }

  private generateOptimizations() {
    this.optimizations = [];
    
    // Most frequent first element should be highlighted
    const firstElements = new Map<string, number>();
    for (const pattern of this.patterns) {
      const first = pattern.sequence[0];
      firstElements.set(first, (firstElements.get(first) || 0) + pattern.frequency);
    }
    
    const sortedFirst = Array.from(firstElements.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    for (const [element, freq] of sortedFirst) {
      this.optimizations.push({
        type: 'highlight',
        target: element,
        priority: freq,
        reason: `Frequently accessed (${freq} times)`,
      });
    }
    
    // Common sequences should have shortcuts
    for (const pattern of this.patterns.slice(0, 3)) {
      if (pattern.sequence.length >= 3) {
        this.optimizations.push({
          type: 'shortcut',
          target: pattern.sequence.join('->'),
          priority: pattern.frequency,
          reason: `Common sequence (${pattern.frequency} times)`,
        });
      }
    }
    
    // Predict next action for preloading
    const lastElement = this.interactions[this.interactions.length - 1]?.element;
    if (lastElement) {
      for (const pattern of this.patterns) {
        const idx = pattern.sequence.indexOf(lastElement);
        if (idx >= 0 && idx < pattern.sequence.length - 1) {
          this.optimizations.push({
            type: 'preload',
            target: pattern.sequence[idx + 1],
            priority: pattern.frequency,
            reason: `Likely next action after ${lastElement}`,
          });
        }
      }
    }
  }

  getOptimizations(): UIOptimization[] {
    return this.optimizations;
  }

  getPatterns(): UIPattern[] {
    return this.patterns;
  }

  predictNext(): string[] {
    const preloads = this.optimizations
      .filter(o => o.type === 'preload')
      .sort((a, b) => b.priority - a.priority)
      .map(o => o.target);
    
    return Array.from(new Set(preloads)).slice(0, 3);
  }

  getHighlightedElements(): string[] {
    return this.optimizations
      .filter(o => o.type === 'highlight')
      .sort((a, b) => b.priority - a.priority)
      .map(o => o.target)
      .slice(0, 5);
  }

  reset() {
    this.interactions = [];
    this.patterns = [];
    this.optimizations = [];
    this.save();
  }
}

export const temporalUI = new TemporalUIMemory();

