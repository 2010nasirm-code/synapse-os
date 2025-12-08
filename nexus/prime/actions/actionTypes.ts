/**
 * ============================================================================
 * NEXUS PRIME - ACTION TYPES
 * ============================================================================
 * 
 * Defines all available action types and their configurations.
 * 
 * @module nexus/prime/actions/actionTypes
 * @version 1.0.0
 */

// ============================================================================
// ACTION TYPE DEFINITIONS
// ============================================================================

export const ACTION_TYPES = {
  // Safe actions (auto-applicable)
  NAVIGATE: 'navigate',
  HIGHLIGHT: 'highlight',
  SUGGEST: 'suggest',
  LOG: 'log',
  
  // Medium safety (confirmation preferred)
  CREATE: 'create',
  UPDATE: 'update',
  STORE: 'store',
  AUTOMATION: 'automation',
  
  // High safety (confirmation required)
  DELETE: 'delete',
  PATCH: 'patch',
  EXECUTE: 'execute',
  MODIFY_SETTINGS: 'modify_settings',
} as const;

export type ActionType = typeof ACTION_TYPES[keyof typeof ACTION_TYPES];

// ============================================================================
// ACTION CONFIGURATIONS
// ============================================================================

export interface ActionTypeConfig {
  type: ActionType;
  name: string;
  description: string;
  safetyLevel: 'low' | 'medium' | 'high';
  requiresConfirmation: boolean;
  reversible: boolean;
  allowedRoles?: string[];
}

export const ACTION_CONFIGS: Record<ActionType, ActionTypeConfig> = {
  // Safe actions
  [ACTION_TYPES.NAVIGATE]: {
    type: ACTION_TYPES.NAVIGATE,
    name: 'Navigate',
    description: 'Navigate to a page or section',
    safetyLevel: 'low',
    requiresConfirmation: false,
    reversible: true,
  },
  [ACTION_TYPES.HIGHLIGHT]: {
    type: ACTION_TYPES.HIGHLIGHT,
    name: 'Highlight',
    description: 'Highlight UI elements',
    safetyLevel: 'low',
    requiresConfirmation: false,
    reversible: true,
  },
  [ACTION_TYPES.SUGGEST]: {
    type: ACTION_TYPES.SUGGEST,
    name: 'Suggest',
    description: 'Make a suggestion',
    safetyLevel: 'low',
    requiresConfirmation: false,
    reversible: true,
  },
  [ACTION_TYPES.LOG]: {
    type: ACTION_TYPES.LOG,
    name: 'Log',
    description: 'Log information',
    safetyLevel: 'low',
    requiresConfirmation: false,
    reversible: false,
  },
  
  // Medium safety
  [ACTION_TYPES.CREATE]: {
    type: ACTION_TYPES.CREATE,
    name: 'Create',
    description: 'Create a new item',
    safetyLevel: 'medium',
    requiresConfirmation: true,
    reversible: true,
  },
  [ACTION_TYPES.UPDATE]: {
    type: ACTION_TYPES.UPDATE,
    name: 'Update',
    description: 'Update an existing item',
    safetyLevel: 'medium',
    requiresConfirmation: true,
    reversible: true,
  },
  [ACTION_TYPES.STORE]: {
    type: ACTION_TYPES.STORE,
    name: 'Store',
    description: 'Store data in memory',
    safetyLevel: 'medium',
    requiresConfirmation: false,
    reversible: true,
  },
  [ACTION_TYPES.AUTOMATION]: {
    type: ACTION_TYPES.AUTOMATION,
    name: 'Automation',
    description: 'Create or modify automation',
    safetyLevel: 'medium',
    requiresConfirmation: true,
    reversible: true,
  },
  
  // High safety
  [ACTION_TYPES.DELETE]: {
    type: ACTION_TYPES.DELETE,
    name: 'Delete',
    description: 'Delete an item',
    safetyLevel: 'high',
    requiresConfirmation: true,
    reversible: false,
  },
  [ACTION_TYPES.PATCH]: {
    type: ACTION_TYPES.PATCH,
    name: 'Patch',
    description: 'Apply code patch',
    safetyLevel: 'high',
    requiresConfirmation: true,
    reversible: true,
  },
  [ACTION_TYPES.EXECUTE]: {
    type: ACTION_TYPES.EXECUTE,
    name: 'Execute',
    description: 'Execute a command or script',
    safetyLevel: 'high',
    requiresConfirmation: true,
    reversible: false,
  },
  [ACTION_TYPES.MODIFY_SETTINGS]: {
    type: ACTION_TYPES.MODIFY_SETTINGS,
    name: 'Modify Settings',
    description: 'Change application settings',
    safetyLevel: 'high',
    requiresConfirmation: true,
    reversible: true,
  },
};

// ============================================================================
// ACTION HELPERS
// ============================================================================

export function getActionConfig(type: ActionType): ActionTypeConfig {
  return ACTION_CONFIGS[type];
}

export function isAutoApplicable(type: ActionType): boolean {
  const config = ACTION_CONFIGS[type];
  return config.safetyLevel === 'low' && !config.requiresConfirmation;
}

export function requiresConfirmation(type: ActionType): boolean {
  return ACTION_CONFIGS[type].requiresConfirmation;
}

export function getSafetyLevel(type: ActionType): 'low' | 'medium' | 'high' {
  return ACTION_CONFIGS[type].safetyLevel;
}

export function isReversible(type: ActionType): boolean {
  return ACTION_CONFIGS[type].reversible;
}

