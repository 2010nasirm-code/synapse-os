/**
 * ============================================================================
 * NEXUS PRIME - USER PREFERENCES
 * ============================================================================
 * 
 * Manages user mode, preferences, and settings.
 * 
 * @module nexus/prime/ux/preferences
 * @version 1.0.0
 */

import { UserPreferences, UserMode, SkillLevel, DEFAULT_PREFERENCES } from './types';

// ============================================================================
// STORAGE KEY
// ============================================================================

const STORAGE_KEY = 'nexus-prime-preferences';

// ============================================================================
// PREFERENCES MANAGER
// ============================================================================

class PreferencesManager {
  private preferences: UserPreferences = DEFAULT_PREFERENCES;
  private listeners: Set<(prefs: UserPreferences) => void> = new Set();

  constructor() {
    this.load();
  }

  /**
   * Load preferences from storage
   */
  load(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('[Preferences] Failed to load:', error);
    }
  }

  /**
   * Save preferences to storage
   */
  private save(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
      this.notifyListeners();
    } catch (error) {
      console.error('[Preferences] Failed to save:', error);
    }
  }

  /**
   * Get all preferences
   */
  get(): UserPreferences {
    return { ...this.preferences };
  }

  /**
   * Update preferences
   */
  update(updates: Partial<UserPreferences>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.save();
  }

  /**
   * Get current mode
   */
  getMode(): UserMode {
    return this.preferences.mode;
  }

  /**
   * Set mode (simple/pro)
   */
  setMode(mode: UserMode): void {
    this.update({ mode });
  }

  /**
   * Toggle mode
   */
  toggleMode(): UserMode {
    const newMode = this.preferences.mode === 'simple' ? 'pro' : 'simple';
    this.setMode(newMode);
    return newMode;
  }

  /**
   * Check if in simple mode
   */
  isSimpleMode(): boolean {
    return this.preferences.mode === 'simple';
  }

  /**
   * Check if in pro mode
   */
  isProMode(): boolean {
    return this.preferences.mode === 'pro';
  }

  /**
   * Get skill level
   */
  getSkillLevel(): SkillLevel {
    return this.preferences.skillLevel;
  }

  /**
   * Set skill level
   */
  setSkillLevel(level: SkillLevel): void {
    this.update({ skillLevel: level });
  }

  /**
   * Check if onboarding is complete
   */
  hasCompletedOnboarding(): boolean {
    return this.preferences.hasCompletedOnboarding;
  }

  /**
   * Complete onboarding
   */
  completeOnboarding(): void {
    this.update({ hasCompletedOnboarding: true });
  }

  /**
   * Increment tracker count
   */
  incrementTrackers(): void {
    this.update({ trackersCreated: this.preferences.trackersCreated + 1 });
    this.checkForAutoUpgrade();
  }

  /**
   * Increment automation count
   */
  incrementAutomations(): void {
    this.update({ automationsCreated: this.preferences.automationsCreated + 1 });
    this.checkForAutoUpgrade();
  }

  /**
   * Check if user should be upgraded to pro based on usage
   */
  private checkForAutoUpgrade(): void {
    const { trackersCreated, automationsCreated, skillLevel } = this.preferences;

    // Auto-upgrade skill level based on usage
    if (skillLevel === 'beginner' && trackersCreated >= 3) {
      this.setSkillLevel('intermediate');
    } else if (skillLevel === 'intermediate' && automationsCreated >= 2) {
      this.setSkillLevel('advanced');
    }
  }

  /**
   * Should show feature based on mode and skill
   */
  shouldShowFeature(featureLevel: SkillLevel): boolean {
    if (this.preferences.mode === 'pro') return true;

    const levels: SkillLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];
    const userIndex = levels.indexOf(this.preferences.skillLevel);
    const featureIndex = levels.indexOf(featureLevel);

    return userIndex >= featureIndex;
  }

  /**
   * Subscribe to preference changes
   */
  subscribe(callback: (prefs: UserPreferences) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(cb => cb(this.get()));
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.preferences = { ...DEFAULT_PREFERENCES };
    this.save();
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: PreferencesManager | null = null;

export function getPreferences(): PreferencesManager {
  if (!instance) {
    instance = new PreferencesManager();
  }
  return instance;
}

export default PreferencesManager;

