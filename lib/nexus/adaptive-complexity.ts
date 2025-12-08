// Adaptive Complexity Mode - App adjusts to user skill level
export type UserLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface FeatureAvailability {
  feature: string;
  minLevel: UserLevel;
  description: string;
  unlockHint?: string;
}

export interface UserSkillProfile {
  level: UserLevel;
  score: number; // 0-100
  actionsCount: number;
  featuresUsed: Set<string>;
  advancedActionsCount: number;
  sessionDuration: number; // minutes
  errorRate: number;
  lastLevelChange: Date;
}

const LEVEL_THRESHOLDS = {
  beginner: 0,
  intermediate: 25,
  advanced: 50,
  expert: 75,
};

const FEATURES: FeatureAvailability[] = [
  // Beginner
  { feature: 'create-item', minLevel: 'beginner', description: 'Create tasks and items' },
  { feature: 'edit-item', minLevel: 'beginner', description: 'Edit existing items' },
  { feature: 'delete-item', minLevel: 'beginner', description: 'Delete items' },
  { feature: 'view-dashboard', minLevel: 'beginner', description: 'View dashboard' },
  { feature: 'view-suggestions', minLevel: 'beginner', description: 'View AI suggestions' },
  
  // Intermediate
  { feature: 'create-automation', minLevel: 'intermediate', description: 'Create basic automations', unlockHint: 'Complete 10 tasks to unlock' },
  { feature: 'view-analytics', minLevel: 'intermediate', description: 'View analytics dashboard', unlockHint: 'Use the app for 3 days to unlock' },
  { feature: 'bulk-actions', minLevel: 'intermediate', description: 'Select and edit multiple items' },
  { feature: 'filters', minLevel: 'intermediate', description: 'Advanced filtering options' },
  { feature: 'keyboard-shortcuts', minLevel: 'intermediate', description: 'Keyboard shortcuts' },
  
  // Advanced
  { feature: 'conditional-automations', minLevel: 'advanced', description: 'Automations with conditions', unlockHint: 'Create 5 automations to unlock' },
  { feature: 'knowledge-graph', minLevel: 'advanced', description: 'Knowledge graph visualization' },
  { feature: 'api-access', minLevel: 'advanced', description: 'API access for integrations' },
  { feature: 'custom-themes', minLevel: 'advanced', description: 'Advanced theme customization' },
  { feature: 'ai-chat', minLevel: 'advanced', description: 'Chat with Nexus AI' },
  
  // Expert
  { feature: 'nexus-mode', minLevel: 'expert', description: 'Full Nexus interface', unlockHint: 'Master all features to unlock' },
  { feature: 'dimensional-view', minLevel: 'expert', description: '3D graph visualization' },
  { feature: 'temporal-ui', minLevel: 'expert', description: 'Adaptive UI memory' },
  { feature: 'predictive-flow', minLevel: 'expert', description: 'Predictive preloading' },
  { feature: 'agent-management', minLevel: 'expert', description: 'Manage AI agents' },
  { feature: 'admin-panel', minLevel: 'expert', description: 'Admin controls' },
];

const STORAGE_KEY = 'nexus_user_skill';

class AdaptiveComplexityEngine {
  private profile: UserSkillProfile;
  private sessionStart: number;
  private listeners: Set<(profile: UserSkillProfile) => void> = new Set();

  constructor() {
    this.sessionStart = Date.now();
    this.profile = this.load();
  }

  private load(): UserSkillProfile {
    if (typeof window === 'undefined') {
      return this.getDefaultProfile();
    }
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return {
          ...data,
          featuresUsed: new Set(data.featuresUsed || []),
          lastLevelChange: new Date(data.lastLevelChange),
        };
      }
    } catch {}
    
    return this.getDefaultProfile();
  }

  private getDefaultProfile(): UserSkillProfile {
    return {
      level: 'beginner',
      score: 0,
      actionsCount: 0,
      featuresUsed: new Set(),
      advancedActionsCount: 0,
      sessionDuration: 0,
      errorRate: 0,
      lastLevelChange: new Date(),
    };
  }

  private save() {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...this.profile,
      featuresUsed: Array.from(this.profile.featuresUsed),
    }));
  }

  recordAction(action: string, isAdvanced: boolean = false) {
    this.profile.actionsCount++;
    this.profile.featuresUsed.add(action);
    
    if (isAdvanced) {
      this.profile.advancedActionsCount++;
    }
    
    this.recalculateLevel();
    this.save();
    this.notifyListeners();
  }

  recordError() {
    this.profile.errorRate = (this.profile.errorRate * this.profile.actionsCount + 1) / (this.profile.actionsCount + 1);
    this.save();
  }

  updateSessionDuration() {
    this.profile.sessionDuration += (Date.now() - this.sessionStart) / 60000; // minutes
    this.sessionStart = Date.now();
    this.recalculateLevel();
    this.save();
  }

  private recalculateLevel() {
    let score = 0;
    
    // Actions count (max 30 points)
    score += Math.min(30, this.profile.actionsCount / 10);
    
    // Features used (max 25 points)
    score += Math.min(25, this.profile.featuresUsed.size * 2);
    
    // Advanced actions (max 20 points)
    score += Math.min(20, this.profile.advancedActionsCount * 2);
    
    // Session duration (max 15 points)
    score += Math.min(15, this.profile.sessionDuration / 60); // hours
    
    // Low error rate bonus (max 10 points)
    score += Math.max(0, 10 - this.profile.errorRate * 100);
    
    this.profile.score = Math.min(100, score);
    
    // Determine level
    let newLevel: UserLevel = 'beginner';
    if (this.profile.score >= LEVEL_THRESHOLDS.expert) newLevel = 'expert';
    else if (this.profile.score >= LEVEL_THRESHOLDS.advanced) newLevel = 'advanced';
    else if (this.profile.score >= LEVEL_THRESHOLDS.intermediate) newLevel = 'intermediate';
    
    if (newLevel !== this.profile.level) {
      this.profile.level = newLevel;
      this.profile.lastLevelChange = new Date();
      
      // Dispatch level change event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus:level-change', {
          detail: { level: newLevel, score: this.profile.score }
        }));
      }
    }
  }

  isFeatureAvailable(feature: string): boolean {
    const featureConfig = FEATURES.find(f => f.feature === feature);
    if (!featureConfig) return true; // Unknown features are allowed
    
    const levelOrder: UserLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
    const currentLevelIndex = levelOrder.indexOf(this.profile.level);
    const requiredLevelIndex = levelOrder.indexOf(featureConfig.minLevel);
    
    return currentLevelIndex >= requiredLevelIndex;
  }

  getAvailableFeatures(): FeatureAvailability[] {
    return FEATURES.filter(f => this.isFeatureAvailable(f.feature));
  }

  getLockedFeatures(): FeatureAvailability[] {
    return FEATURES.filter(f => !this.isFeatureAvailable(f.feature));
  }

  getNextUnlocks(): FeatureAvailability[] {
    const levelOrder: UserLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
    const currentIndex = levelOrder.indexOf(this.profile.level);
    const nextLevel = levelOrder[currentIndex + 1];
    
    if (!nextLevel) return [];
    
    return FEATURES.filter(f => f.minLevel === nextLevel);
  }

  getProfile(): UserSkillProfile {
    return { ...this.profile, featuresUsed: new Set(this.profile.featuresUsed) };
  }

  setLevel(level: UserLevel) {
    // Manual override (for testing or admin)
    this.profile.level = level;
    this.profile.lastLevelChange = new Date();
    this.save();
    this.notifyListeners();
  }

  subscribe(listener: (profile: UserSkillProfile) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.profile));
  }

  reset() {
    this.profile = this.getDefaultProfile();
    this.save();
    this.notifyListeners();
  }
}

export const adaptiveComplexity = new AdaptiveComplexityEngine();

// Update session duration periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    adaptiveComplexity.updateSessionDuration();
  }, 60000); // Every minute
}


