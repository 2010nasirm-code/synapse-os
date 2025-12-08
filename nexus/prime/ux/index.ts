/**
 * ============================================================================
 * NEXUS PRIME - UX MODULE
 * ============================================================================
 * 
 * Simplified UX system for user-friendly experience.
 * 
 * @module nexus/prime/ux
 * @version 1.0.0
 */

// Types
export * from './types';

// Preferences
export { getPreferences } from './preferences';

// Skill Detection
export { getSkillDetector } from './skill-detector';

// Templates
export {
  TEMPLATES,
  getTemplatesByCategory,
  getBeginnerTemplates,
  getPopularTemplates,
  getTemplateById,
  getRecommendedTemplates,
  getAllCategories,
  CATEGORY_METADATA,
} from './templates';

// Help System
export {
  FEATURE_EXPLANATIONS,
  CONTEXTUAL_HELP,
  getExplanation,
  getContextualHelp,
  getTopTip,
  getDoForMeHandler,
  getFriendlyResponse,
  FRIENDLY_RESPONSES,
} from './help-system';

