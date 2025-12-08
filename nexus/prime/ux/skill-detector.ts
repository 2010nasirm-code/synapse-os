/**
 * ============================================================================
 * NEXUS PRIME - SKILL DETECTOR
 * ============================================================================
 * 
 * Detects user skill level based on behavior and adapts UI accordingly.
 * 
 * @module nexus/prime/ux/skill-detector
 * @version 1.0.0
 */

import { UserBehavior, SkillAssessment, SkillLevel } from './types';
import { getPreferences } from './preferences';

// ============================================================================
// BEHAVIOR TRACKER
// ============================================================================

class BehaviorTracker {
  private clickTimes: number[] = [];
  private hesitations: number[] = [];
  private errors: number = 0;
  private helpRequests: number = 0;
  private featureUsage: Record<string, number> = {};
  private sessionStart: number = Date.now();

  /**
   * Record a click event
   */
  recordClick(): void {
    this.clickTimes.push(Date.now());
    // Keep only last 20 clicks
    if (this.clickTimes.length > 20) {
      this.clickTimes.shift();
    }
  }

  /**
   * Record a hesitation (pause > 3s)
   */
  recordHesitation(): void {
    this.hesitations.push(Date.now());
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.errors++;
  }

  /**
   * Record a help request
   */
  recordHelpRequest(): void {
    this.helpRequests++;
  }

  /**
   * Record feature usage
   */
  recordFeatureUsage(feature: string): void {
    this.featureUsage[feature] = (this.featureUsage[feature] || 0) + 1;
  }

  /**
   * Get average click speed
   */
  getAverageClickSpeed(): number {
    if (this.clickTimes.length < 2) return 1000;

    let totalDelta = 0;
    for (let i = 1; i < this.clickTimes.length; i++) {
      totalDelta += this.clickTimes[i] - this.clickTimes[i - 1];
    }

    return totalDelta / (this.clickTimes.length - 1);
  }

  /**
   * Get current behavior snapshot
   */
  getBehavior(): UserBehavior {
    return {
      clickSpeed: this.getAverageClickSpeed(),
      hesitationCount: this.hesitations.length,
      errorCount: this.errors,
      helpRequestCount: this.helpRequests,
      featureUsage: { ...this.featureUsage },
      sessionDuration: Date.now() - this.sessionStart,
      navigationPattern: this.detectNavigationPattern(),
    };
  }

  /**
   * Detect navigation pattern
   */
  private detectNavigationPattern(): 'linear' | 'exploratory' | 'focused' {
    const uniqueFeatures = Object.keys(this.featureUsage).length;
    const totalClicks = this.clickTimes.length;

    if (uniqueFeatures > 5) return 'exploratory';
    if (totalClicks > 10 && uniqueFeatures < 3) return 'focused';
    return 'linear';
  }

  /**
   * Reset tracker
   */
  reset(): void {
    this.clickTimes = [];
    this.hesitations = [];
    this.errors = 0;
    this.helpRequests = 0;
    this.featureUsage = {};
    this.sessionStart = Date.now();
  }
}

// ============================================================================
// SKILL DETECTOR
// ============================================================================

class SkillDetector {
  private tracker = new BehaviorTracker();
  private lastAssessment: SkillAssessment | null = null;
  private assessmentListeners: Set<(assessment: SkillAssessment) => void> = new Set();

  /**
   * Record user behavior
   */
  recordClick(): void {
    this.tracker.recordClick();
    this.maybeReassess();
  }

  recordHesitation(): void {
    this.tracker.recordHesitation();
    this.maybeReassess();
  }

  recordError(): void {
    this.tracker.recordError();
    this.maybeReassess();
  }

  recordHelpRequest(): void {
    this.tracker.recordHelpRequest();
    this.maybeReassess();
  }

  recordFeatureUsage(feature: string): void {
    this.tracker.recordFeatureUsage(feature);
    this.maybeReassess();
  }

  /**
   * Assess user skill level
   */
  assess(): SkillAssessment {
    const behavior = this.tracker.getBehavior();
    const prefs = getPreferences().get();

    let level: SkillLevel = prefs.skillLevel;
    let confidence = 0.5;
    const strengths: string[] = [];
    const suggestedFeatures: string[] = [];
    let shouldSimplify = false;

    // Fast clicks = more advanced
    if (behavior.clickSpeed < 500) {
      confidence += 0.2;
      strengths.push('Quick navigation');
    }

    // Many hesitations = struggling
    if (behavior.hesitationCount > 5) {
      shouldSimplify = true;
      suggestedFeatures.push('guided_mode');
    }

    // Errors indicate confusion
    if (behavior.errorCount > 3) {
      shouldSimplify = true;
      level = 'beginner';
    }

    // Help requests indicate need for simpler UI
    if (behavior.helpRequestCount > 2) {
      shouldSimplify = true;
    }

    // Exploratory users might be ready for more
    if (behavior.navigationPattern === 'exploratory' && behavior.errorCount < 2) {
      level = this.upgradeLevel(level);
      suggestedFeatures.push('pro_features');
    }

    // Feature usage indicates expertise
    const featureCount = Object.keys(behavior.featureUsage).length;
    if (featureCount > 5) {
      strengths.push('Feature explorer');
      level = this.upgradeLevel(level);
    }

    // Long sessions with few errors = competent
    if (behavior.sessionDuration > 300000 && behavior.errorCount < 2) {
      confidence += 0.2;
      strengths.push('Comfortable with the app');
    }

    const assessment: SkillAssessment = {
      level,
      confidence: Math.min(confidence, 1),
      strengths,
      suggestedFeatures,
      shouldSimplify,
    };

    this.lastAssessment = assessment;
    return assessment;
  }

  /**
   * Upgrade skill level by one
   */
  private upgradeLevel(current: SkillLevel): SkillLevel {
    const levels: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
    const index = levels.indexOf(current);
    return levels[Math.min(index + 1, levels.length - 1)];
  }

  /**
   * Maybe reassess if enough data
   */
  private maybeReassess(): void {
    const behavior = this.tracker.getBehavior();
    
    // Reassess every 10 clicks or 5 hesitations
    if (behavior.clickSpeed > 0 && 
        (this.tracker['clickTimes'].length % 10 === 0 || 
         behavior.hesitationCount % 5 === 0)) {
      const assessment = this.assess();
      this.notifyListeners(assessment);
    }
  }

  /**
   * Get last assessment
   */
  getLastAssessment(): SkillAssessment | null {
    return this.lastAssessment;
  }

  /**
   * Subscribe to assessment changes
   */
  subscribe(callback: (assessment: SkillAssessment) => void): () => void {
    this.assessmentListeners.add(callback);
    return () => this.assessmentListeners.delete(callback);
  }

  /**
   * Notify listeners
   */
  private notifyListeners(assessment: SkillAssessment): void {
    this.assessmentListeners.forEach(cb => cb(assessment));
  }

  /**
   * Should auto-simplify UI
   */
  shouldSimplify(): boolean {
    return this.lastAssessment?.shouldSimplify ?? false;
  }

  /**
   * Reset detector
   */
  reset(): void {
    this.tracker.reset();
    this.lastAssessment = null;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: SkillDetector | null = null;

export function getSkillDetector(): SkillDetector {
  if (!instance) {
    instance = new SkillDetector();
  }
  return instance;
}

export default SkillDetector;

