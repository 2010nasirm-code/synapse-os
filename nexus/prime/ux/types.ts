/**
 * ============================================================================
 * NEXUS PRIME - UX TYPES
 * ============================================================================
 * 
 * Types for the simplified UX system.
 * 
 * @module nexus/prime/ux/types
 * @version 1.0.0
 */

// ============================================================================
// USER MODE
// ============================================================================

export type UserMode = 'simple' | 'pro';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface UserPreferences {
  mode: UserMode;
  skillLevel: SkillLevel;
  hasCompletedOnboarding: boolean;
  onboardingStep: number;
  showTooltips: boolean;
  showHelpPanel: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark' | 'system';
  language: 'simple' | 'detailed';
  autoSimplify: boolean;
  trackersCreated: number;
  automationsCreated: number;
  sessionsCompleted: number;
  lastActiveAt: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  mode: 'simple',
  skillLevel: 'beginner',
  hasCompletedOnboarding: false,
  onboardingStep: 0,
  showTooltips: true,
  showHelpPanel: true,
  reducedMotion: false,
  fontSize: 'medium',
  theme: 'system',
  language: 'simple',
  autoSimplify: true,
  trackersCreated: 0,
  automationsCreated: 0,
  sessionsCompleted: 0,
  lastActiveAt: Date.now(),
};

// ============================================================================
// BEHAVIOR TRACKING
// ============================================================================

export interface UserBehavior {
  clickSpeed: number; // avg ms between clicks
  hesitationCount: number; // times user paused > 3s
  errorCount: number; // times user hit errors
  helpRequestCount: number; // times user asked for help
  featureUsage: Record<string, number>;
  sessionDuration: number;
  navigationPattern: 'linear' | 'exploratory' | 'focused';
}

export interface SkillAssessment {
  level: SkillLevel;
  confidence: number;
  strengths: string[];
  suggestedFeatures: string[];
  shouldSimplify: boolean;
}

// ============================================================================
// TEMPLATES
// ============================================================================

export type TemplateCategory = 
  | 'habits' 
  | 'fitness' 
  | 'school' 
  | 'mood' 
  | 'sleep' 
  | 'goals' 
  | 'finance'
  | 'work'
  | 'health'
  | 'custom';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  color: string;
  fields: TemplateField[];
  defaultValues?: Record<string, unknown>;
  popularity: number;
  forBeginners: boolean;
}

export interface TemplateField {
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'rating';
  label: string;
  placeholder?: string;
  options?: string[];
  required?: boolean;
  defaultValue?: unknown;
}

// ============================================================================
// ONBOARDING
// ============================================================================

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  action?: 'select_templates' | 'create_tracker' | 'tour' | 'set_preferences';
  isRequired: boolean;
  isCompleted: boolean;
}

export interface OnboardingState {
  currentStep: number;
  steps: OnboardingStep[];
  selectedTemplates: string[];
  createdTrackers: string[];
  preferences: Partial<UserPreferences>;
  isComplete: boolean;
}

// ============================================================================
// HELP SYSTEM
// ============================================================================

export interface ExplainThis {
  id: string;
  feature: string;
  simpleExplanation: string;
  example: string;
  canDoForMe: boolean;
  doForMeAction?: string;
}

export interface ContextualHelp {
  id: string;
  context: string;
  tip: string;
  action?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface HelpPanelState {
  isOpen: boolean;
  currentContext: string;
  suggestions: ContextualHelp[];
  recentQuestions: string[];
}

// ============================================================================
// AI PERSONALITY
// ============================================================================

export interface AIPersonality {
  tone: 'friendly' | 'professional' | 'casual';
  verbosity: 'minimal' | 'balanced' | 'detailed';
  useEmoji: boolean;
  encouragement: boolean;
}

export const FRIENDLY_PERSONALITY: AIPersonality = {
  tone: 'friendly',
  verbosity: 'minimal',
  useEmoji: true,
  encouragement: true,
};

