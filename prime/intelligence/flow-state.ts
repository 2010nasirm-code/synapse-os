// ============================================================================
// NEXUS PRIME - FLOW-STATE ENGINE
// Adapts UI behavior based on user interaction rhythm
// ============================================================================

import { globalEvents } from '../core/events';
import { globalState } from '../core/state';
import { getConfig } from '../core/config';

export type FlowState = 'idle' | 'exploring' | 'focused' | 'productive' | 'rushed';

export interface FlowMetrics {
  clicksPerMinute: number;
  scrollsPerMinute: number;
  keystrokesPerMinute: number;
  timeOnPage: number;
  navigationSpeed: number;
  pauseFrequency: number;
}

export interface FlowAdaptation {
  animationSpeed: number;       // Multiplier for animation duration
  layoutDensity: 'compact' | 'normal' | 'spacious';
  transitionStyle: 'instant' | 'quick' | 'smooth' | 'elegant';
  feedbackIntensity: number;    // 0-1
  autoHideElements: boolean;
  preloadAggression: number;    // 0-1
}

export class FlowStateEngine {
  private static instance: FlowStateEngine;
  private currentState: FlowState = 'idle';
  private metrics: FlowMetrics;
  private adaptation: FlowAdaptation;
  
  // Tracking buffers
  private clickTimes: number[] = [];
  private scrollTimes: number[] = [];
  private keystrokeTimes: number[] = [];
  private navigationTimes: number[] = [];
  private pauseCount: number = 0;
  private lastActivityTime: number = 0;
  private pageEnterTime: number = 0;

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.adaptation = this.initializeAdaptation();
    this.setupEventListeners();
  }

  static getInstance(): FlowStateEngine {
    if (!FlowStateEngine.instance) {
      FlowStateEngine.instance = new FlowStateEngine();
    }
    return FlowStateEngine.instance;
  }

  // ----------------------------- Initialization -----------------------------
  private initializeMetrics(): FlowMetrics {
    return {
      clicksPerMinute: 0,
      scrollsPerMinute: 0,
      keystrokesPerMinute: 0,
      timeOnPage: 0,
      navigationSpeed: 0,
      pauseFrequency: 0,
    };
  }

  private initializeAdaptation(): FlowAdaptation {
    return {
      animationSpeed: 1.0,
      layoutDensity: 'normal',
      transitionStyle: 'smooth',
      feedbackIntensity: 0.7,
      autoHideElements: false,
      preloadAggression: 0.5,
    };
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Track clicks
    window.addEventListener('click', () => this.recordClick());
    
    // Track scrolls
    window.addEventListener('scroll', () => this.recordScroll(), { passive: true });
    
    // Track keystrokes
    window.addEventListener('keydown', () => this.recordKeystroke());

    // Track navigation (through history)
    window.addEventListener('popstate', () => this.recordNavigation());

    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.pageEnterTime = Date.now();
      }
    });

    // Initial page enter
    this.pageEnterTime = Date.now();

    // Start analysis loop
    setInterval(() => this.analyzeFlow(), 5000);
  }

  // ----------------------------- Event Recording ----------------------------
  private recordClick(): void {
    const now = Date.now();
    this.clickTimes.push(now);
    this.lastActivityTime = now;
    this.cleanupOldEvents(this.clickTimes);
  }

  private recordScroll(): void {
    const now = Date.now();
    this.scrollTimes.push(now);
    this.lastActivityTime = now;
    this.cleanupOldEvents(this.scrollTimes);
  }

  private recordKeystroke(): void {
    const now = Date.now();
    this.keystrokeTimes.push(now);
    this.lastActivityTime = now;
    this.cleanupOldEvents(this.keystrokeTimes);
  }

  private recordNavigation(): void {
    const now = Date.now();
    this.navigationTimes.push(now);
    this.lastActivityTime = now;
    this.cleanupOldEvents(this.navigationTimes);
  }

  private cleanupOldEvents(times: number[]): void {
    const oneMinuteAgo = Date.now() - 60000;
    while (times.length > 0 && times[0] < oneMinuteAgo) {
      times.shift();
    }
  }

  // ----------------------------- Flow Analysis ------------------------------
  private analyzeFlow(): void {
    const now = Date.now();

    // Update metrics
    this.metrics = {
      clicksPerMinute: this.clickTimes.length,
      scrollsPerMinute: this.scrollTimes.length,
      keystrokesPerMinute: this.keystrokeTimes.length,
      timeOnPage: (now - this.pageEnterTime) / 1000,
      navigationSpeed: this.calculateNavigationSpeed(),
      pauseFrequency: this.pauseCount / Math.max(1, this.metrics.timeOnPage / 60),
    };

    // Check for pauses
    if (now - this.lastActivityTime > 5000) {
      this.pauseCount++;
    }

    // Determine flow state
    const newState = this.determineFlowState();
    
    if (newState !== this.currentState) {
      const oldState = this.currentState;
      this.currentState = newState;
      this.updateAdaptation();
      
      globalEvents.emit('flow:state-change', { 
        from: oldState, 
        to: newState,
        metrics: this.metrics,
        adaptation: this.adaptation,
      });
    }
  }

  private calculateNavigationSpeed(): number {
    if (this.navigationTimes.length < 2) return 0;
    
    const intervals: number[] = [];
    for (let i = 1; i < this.navigationTimes.length; i++) {
      intervals.push(this.navigationTimes[i] - this.navigationTimes[i - 1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    return 60000 / avgInterval; // Navigations per minute
  }

  private determineFlowState(): FlowState {
    const { clicksPerMinute, scrollsPerMinute, keystrokesPerMinute, navigationSpeed, pauseFrequency } = this.metrics;
    const totalActivity = clicksPerMinute + scrollsPerMinute + keystrokesPerMinute;

    // Idle: Very low activity
    if (totalActivity < 5 && navigationSpeed < 1) {
      return 'idle';
    }

    // Rushed: Very high activity, fast navigation
    if (totalActivity > 60 || navigationSpeed > 10) {
      return 'rushed';
    }

    // Focused: High keystrokes, low navigation
    if (keystrokesPerMinute > 30 && navigationSpeed < 3) {
      return 'focused';
    }

    // Productive: Balanced high activity
    if (totalActivity > 30 && pauseFrequency < 2) {
      return 'productive';
    }

    // Exploring: Medium activity with navigation
    if (navigationSpeed > 2 || scrollsPerMinute > 10) {
      return 'exploring';
    }

    return 'idle';
  }

  // ----------------------------- Adaptation ---------------------------------
  private updateAdaptation(): void {
    const config = getConfig().ui;
    if (!config.morphingEnabled) return;

    switch (this.currentState) {
      case 'idle':
        this.adaptation = {
          animationSpeed: 1.2,
          layoutDensity: 'spacious',
          transitionStyle: 'elegant',
          feedbackIntensity: 0.5,
          autoHideElements: false,
          preloadAggression: 0.3,
        };
        break;

      case 'exploring':
        this.adaptation = {
          animationSpeed: 1.0,
          layoutDensity: 'normal',
          transitionStyle: 'smooth',
          feedbackIntensity: 0.7,
          autoHideElements: false,
          preloadAggression: 0.7,
        };
        break;

      case 'focused':
        this.adaptation = {
          animationSpeed: 0.8,
          layoutDensity: 'compact',
          transitionStyle: 'quick',
          feedbackIntensity: 0.3,
          autoHideElements: true,
          preloadAggression: 0.5,
        };
        break;

      case 'productive':
        this.adaptation = {
          animationSpeed: 0.9,
          layoutDensity: 'normal',
          transitionStyle: 'quick',
          feedbackIntensity: 0.6,
          autoHideElements: false,
          preloadAggression: 0.8,
        };
        break;

      case 'rushed':
        this.adaptation = {
          animationSpeed: 0.5,
          layoutDensity: 'compact',
          transitionStyle: 'instant',
          feedbackIntensity: 0.2,
          autoHideElements: true,
          preloadAggression: 1.0,
        };
        break;
    }

    // Apply animation speed modifier from config
    this.adaptation.animationSpeed *= config.animationIntensity;

    // Update global state
    globalState.setKey('ui', prev => ({
      ...prev,
      morphingLevel: this.adaptation.animationSpeed,
    }));

    globalEvents.emit('flow:adaptation-update', this.adaptation);
  }

  // ----------------------------- CSS Variables ------------------------------
  applyToCSSVariables(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const { animationSpeed, feedbackIntensity } = this.adaptation;

    root.style.setProperty('--flow-animation-speed', `${animationSpeed}`);
    root.style.setProperty('--flow-feedback-intensity', `${feedbackIntensity}`);
    root.style.setProperty('--flow-transition', this.getTransitionCSS());
  }

  private getTransitionCSS(): string {
    switch (this.adaptation.transitionStyle) {
      case 'instant': return '0ms';
      case 'quick': return '100ms ease-out';
      case 'smooth': return '200ms ease-in-out';
      case 'elegant': return '300ms cubic-bezier(0.4, 0, 0.2, 1)';
      default: return '200ms ease';
    }
  }

  // ----------------------------- Getters ------------------------------------
  getCurrentState(): FlowState {
    return this.currentState;
  }

  getMetrics(): FlowMetrics {
    return { ...this.metrics };
  }

  getAdaptation(): FlowAdaptation {
    return { ...this.adaptation };
  }
}

export const flowStateEngine = FlowStateEngine.getInstance();

