// ============================================================================
// NEXUS PRIME - EMOTION-RESPONSIVE BEHAVIOR
// Adapts UI based on interaction patterns (without collecting personal data)
// ============================================================================

import { globalEvents } from '../core/events';
import { getConfig } from '../core/config';

export type EmotionalState = 'calm' | 'engaged' | 'frustrated' | 'distracted' | 'focused';

export interface EmotionSignals {
  clickSpeed: number;        // Clicks per second
  scrollBehavior: 'smooth' | 'erratic' | 'none';
  backtracking: number;      // Navigation reversals
  errorRate: number;         // Failed actions
  hesitationTime: number;    // Time before actions
  completionRate: number;    // Tasks completed vs abandoned
}

export interface EmotionResponse {
  theme: 'soften' | 'energize' | 'calm' | 'none';
  animationSpeed: number;
  feedbackIntensity: number;
  assistanceLevel: 'high' | 'medium' | 'low';
  simplifyUI: boolean;
  showEncouragement: boolean;
}

export class EmotionResponseEngine {
  private static instance: EmotionResponseEngine;
  private currentState: EmotionalState = 'calm';
  private signals: EmotionSignals;
  private signalHistory: EmotionSignals[] = [];
  
  // Tracking buffers
  private clickTimes: number[] = [];
  private scrollVelocities: number[] = [];
  private navigationHistory: string[] = [];
  private errorEvents: number[] = [];
  private actionStartTimes = new Map<string, number>();

  private constructor() {
    this.signals = this.initializeSignals();
    this.setupTracking();
    this.startAnalysis();
  }

  static getInstance(): EmotionResponseEngine {
    if (!EmotionResponseEngine.instance) {
      EmotionResponseEngine.instance = new EmotionResponseEngine();
    }
    return EmotionResponseEngine.instance;
  }

  // ----------------------------- Setup --------------------------------------
  private initializeSignals(): EmotionSignals {
    return {
      clickSpeed: 0,
      scrollBehavior: 'none',
      backtracking: 0,
      errorRate: 0,
      hesitationTime: 0,
      completionRate: 1,
    };
  }

  private setupTracking(): void {
    if (typeof window === 'undefined') return;

    // Track clicks
    window.addEventListener('click', () => {
      this.clickTimes.push(Date.now());
      this.cleanupOldData(this.clickTimes, 10000);
    });

    // Track scroll velocity
    let lastScrollTop = 0;
    let lastScrollTime = Date.now();
    window.addEventListener('scroll', () => {
      const now = Date.now();
      const scrollTop = window.scrollY;
      const velocity = Math.abs(scrollTop - lastScrollTop) / (now - lastScrollTime);
      this.scrollVelocities.push(velocity);
      this.cleanupOldData(this.scrollVelocities, 5000);
      lastScrollTop = scrollTop;
      lastScrollTime = now;
    }, { passive: true });

    // Track navigation
    globalEvents.on('navigation', (data: { path: string }) => {
      this.trackNavigation(data.path);
    });

    // Track errors
    globalEvents.on('user:error', () => {
      this.errorEvents.push(Date.now());
      this.cleanupOldData(this.errorEvents, 60000);
    });
  }

  private cleanupOldData(arr: number[], maxAge: number): void {
    const threshold = Date.now() - maxAge;
    while (arr.length > 0 && arr[0] < threshold) {
      arr.shift();
    }
  }

  // ----------------------------- Analysis -----------------------------------
  private startAnalysis(): void {
    setInterval(() => this.analyzeSignals(), 5000);
  }

  private analyzeSignals(): void {
    // Calculate click speed (clicks per second)
    this.signals.clickSpeed = this.clickTimes.length / 10;

    // Analyze scroll behavior
    if (this.scrollVelocities.length > 0) {
      const avgVelocity = this.scrollVelocities.reduce((a, b) => a + b, 0) / this.scrollVelocities.length;
      const variance = this.scrollVelocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / this.scrollVelocities.length;
      
      if (variance > 100) {
        this.signals.scrollBehavior = 'erratic';
      } else if (avgVelocity > 0.1) {
        this.signals.scrollBehavior = 'smooth';
      } else {
        this.signals.scrollBehavior = 'none';
      }
    }

    // Calculate backtracking rate
    this.signals.backtracking = this.calculateBacktracking();

    // Calculate error rate (errors per minute)
    this.signals.errorRate = this.errorEvents.length;

    // Store history
    this.signalHistory.push({ ...this.signals });
    if (this.signalHistory.length > 100) {
      this.signalHistory.shift();
    }

    // Determine emotional state
    const newState = this.determineEmotionalState();
    if (newState !== this.currentState) {
      const oldState = this.currentState;
      this.currentState = newState;
      this.applyEmotionResponse(newState);

      globalEvents.emit('emotion:state-change', { from: oldState, to: newState });
    }
  }

  private calculateBacktracking(): number {
    if (this.navigationHistory.length < 2) return 0;

    let backtrackCount = 0;
    for (let i = 2; i < this.navigationHistory.length; i++) {
      if (this.navigationHistory[i] === this.navigationHistory[i - 2]) {
        backtrackCount++;
      }
    }

    return backtrackCount / Math.max(1, this.navigationHistory.length - 2);
  }

  private trackNavigation(path: string): void {
    this.navigationHistory.push(path);
    if (this.navigationHistory.length > 20) {
      this.navigationHistory.shift();
    }
  }

  private determineEmotionalState(): EmotionalState {
    const { clickSpeed, scrollBehavior, backtracking, errorRate, hesitationTime } = this.signals;

    // Frustrated: High error rate, erratic scrolling, backtracking
    if (errorRate > 3 || (scrollBehavior === 'erratic' && backtracking > 0.3)) {
      return 'frustrated';
    }

    // Distracted: Very low activity or inconsistent patterns
    if (clickSpeed < 0.1 && scrollBehavior === 'none') {
      return 'distracted';
    }

    // Focused: Consistent, moderate activity
    if (clickSpeed > 0.2 && clickSpeed < 2 && scrollBehavior === 'smooth' && errorRate < 1) {
      return 'focused';
    }

    // Engaged: High but controlled activity
    if (clickSpeed > 0.5 && errorRate < 2) {
      return 'engaged';
    }

    // Default: Calm
    return 'calm';
  }

  // ----------------------------- Response Application -----------------------
  private applyEmotionResponse(state: EmotionalState): void {
    const response = this.getResponseForState(state);

    if (typeof document !== 'undefined') {
      const root = document.documentElement;

      // Apply theme modification
      root.setAttribute('data-emotion-theme', response.theme);

      // Apply animation speed
      root.style.setProperty('--emotion-animation-speed', String(response.animationSpeed));

      // Apply feedback intensity
      root.style.setProperty('--emotion-feedback', String(response.feedbackIntensity));

      // Apply UI simplification
      root.setAttribute('data-simplify-ui', String(response.simplifyUI));
    }

    // Emit response
    globalEvents.emit('emotion:response-applied', { state, response });

    // Show encouragement if needed
    if (response.showEncouragement) {
      globalEvents.emit('emotion:show-encouragement', { state });
    }
  }

  private getResponseForState(state: EmotionalState): EmotionResponse {
    switch (state) {
      case 'frustrated':
        return {
          theme: 'calm',
          animationSpeed: 0.5, // Slower, calmer
          feedbackIntensity: 0.3,
          assistanceLevel: 'high',
          simplifyUI: true,
          showEncouragement: true,
        };

      case 'distracted':
        return {
          theme: 'energize',
          animationSpeed: 1.2,
          feedbackIntensity: 0.8,
          assistanceLevel: 'high',
          simplifyUI: true,
          showEncouragement: false,
        };

      case 'focused':
        return {
          theme: 'none',
          animationSpeed: 0.8,
          feedbackIntensity: 0.4,
          assistanceLevel: 'low',
          simplifyUI: false,
          showEncouragement: false,
        };

      case 'engaged':
        return {
          theme: 'energize',
          animationSpeed: 1.0,
          feedbackIntensity: 0.7,
          assistanceLevel: 'medium',
          simplifyUI: false,
          showEncouragement: false,
        };

      case 'calm':
      default:
        return {
          theme: 'none',
          animationSpeed: 1.0,
          feedbackIntensity: 0.6,
          assistanceLevel: 'medium',
          simplifyUI: false,
          showEncouragement: false,
        };
    }
  }

  // ----------------------------- Action Tracking ----------------------------
  startAction(actionId: string): void {
    this.actionStartTimes.set(actionId, Date.now());
  }

  completeAction(actionId: string, success: boolean): void {
    const startTime = this.actionStartTimes.get(actionId);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.actionStartTimes.delete(actionId);

      // Track hesitation (long time to complete)
      if (duration > 5000) {
        this.signals.hesitationTime = (this.signals.hesitationTime + duration) / 2;
      }

      // Track completion
      if (!success) {
        this.errorEvents.push(Date.now());
      }
    }
  }

  // ----------------------------- Getters ------------------------------------
  getCurrentState(): EmotionalState {
    return this.currentState;
  }

  getSignals(): EmotionSignals {
    return { ...this.signals };
  }

  getSignalHistory(): EmotionSignals[] {
    return [...this.signalHistory];
  }
}

export const emotionResponse = EmotionResponseEngine.getInstance();

