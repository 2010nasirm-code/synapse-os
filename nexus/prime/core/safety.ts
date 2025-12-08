/**
 * ============================================================================
 * NEXUS PRIME - SAFETY LAYER
 * ============================================================================
 * 
 * Enforces safety rules across all NEXUS PRIME operations.
 * No destructive actions may execute without explicit confirmation.
 * 
 * @module nexus/prime/core/safety
 * @version 1.0.0
 */

import {
  ActionDraft,
  ActionType,
  ActionSafetyLevel,
  AgentType,
  NexusAction,
  ValidationResult,
  ValidationError,
} from './types';

// ============================================================================
// SAFETY CONFIGURATION
// ============================================================================

/**
 * Action safety classifications
 */
const ACTION_SAFETY_MAP: Record<string, ActionSafetyLevel> = {
  // Low risk (auto-executable)
  navigate: 'low',
  highlight: 'low',
  suggest: 'low',
  log: 'low',
  
  // Medium risk (confirmation preferred)
  create: 'medium',
  update: 'medium',
  store: 'medium',
  automation: 'medium',
  
  // High risk (confirmation required)
  delete: 'high',
  patch: 'high',
  execute: 'high',
  modify_settings: 'high',
};

/**
 * Blocked patterns in content
 */
const BLOCKED_PATTERNS = [
  /password/i,
  /api[_-]?key/i,
  /secret/i,
  /token/i,
  /credential/i,
  /private[_-]?key/i,
  /ssh[_-]?key/i,
  /bearer/i,
];

/**
 * Protected memory categories
 */
const PROTECTED_MEMORY_CATEGORIES = ['preference', 'instruction'];

/**
 * Maximum action payload size in bytes
 */
const MAX_PAYLOAD_SIZE = 1024 * 100; // 100KB

// ============================================================================
// SAFETY VALIDATOR CLASS
// ============================================================================

export class SafetyValidator {
  /**
   * Get safety level for an action type
   */
  static getActionSafetyLevel(actionType: ActionType): ActionSafetyLevel {
    return ACTION_SAFETY_MAP[actionType] || 'high_risk';
  }

  /**
   * Check if action can auto-execute
   */
  static canAutoExecute(action: NexusAction | ActionDraft): boolean {
    return action.safetyLevel === 'low';
  }

  /**
   * Check if action requires confirmation
   */
  static requiresConfirmation(action: NexusAction | ActionDraft): boolean {
    return action.safetyLevel !== 'low';
  }

  /**
   * Check if action is blocked (PR draft only)
   */
  static isBlocked(action: NexusAction | ActionDraft): boolean {
    // High safety level actions are blocked without explicit confirmation
    return action.safetyLevel === 'high' && action.requiresConfirmation;
  }

  /**
   * Validate an action draft
   */
  static validateAction(action: ActionDraft): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!action.id) {
      errors.push({ field: 'id', code: 'REQUIRED', message: 'Action ID is required' });
    }
    if (!action.type) {
      errors.push({ field: 'type', code: 'REQUIRED', message: 'Action type is required' });
    }
    if (!action.description) {
      errors.push({ field: 'description', code: 'REQUIRED', message: 'Description is required' });
    }

    // Check payload size
    const payloadSize = JSON.stringify(action.payload || {}).length;
    if (payloadSize > MAX_PAYLOAD_SIZE) {
      errors.push({
        field: 'payload',
        code: 'TOO_LARGE',
        message: `Payload exceeds maximum size of ${MAX_PAYLOAD_SIZE} bytes`,
      });
    }

    // Check for sensitive content in payload
    const sensitiveFields = this.checkSensitiveContent(action.payload);
    if (sensitiveFields.length > 0) {
      errors.push({
        field: 'payload',
        code: 'SENSITIVE_CONTENT',
        message: `Payload contains potentially sensitive content in: ${sensitiveFields.join(', ')}`,
      });
    }

    // Warn about high-risk actions
    if (action.safetyLevel === 'high') {
      warnings.push('This is a high-risk action that requires explicit confirmation');
    }

    // Block certain high-risk actions
    if (action.safetyLevel === 'high' && action.type === 'patch') {
      warnings.push('This action requires careful review before execution.');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check for sensitive content in payload
   */
  static checkSensitiveContent(payload: unknown, path = ''): string[] {
    const sensitiveFields: string[] = [];

    if (typeof payload === 'object' && payload !== null) {
      for (const [key, value] of Object.entries(payload)) {
        const currentPath = path ? `${path}.${key}` : key;

        // Check if key matches blocked patterns
        for (const pattern of BLOCKED_PATTERNS) {
          if (pattern.test(key)) {
            sensitiveFields.push(currentPath);
            break;
          }
        }

        // Check string values
        if (typeof value === 'string') {
          for (const pattern of BLOCKED_PATTERNS) {
            if (pattern.test(value)) {
              sensitiveFields.push(currentPath);
              break;
            }
          }
        }

        // Recursively check nested objects
        if (typeof value === 'object' && value !== null) {
          sensitiveFields.push(...this.checkSensitiveContent(value, currentPath));
        }
      }
    }

    return sensitiveFields;
  }

  /**
   * Check if memory category is protected
   */
  static isProtectedMemoryCategory(category: string): boolean {
    return PROTECTED_MEMORY_CATEGORIES.includes(category);
  }

  /**
   * Sanitize content for safe output
   */
  static sanitizeContent(content: string): string {
    let sanitized = content;

    // Redact potential secrets
    for (const pattern of BLOCKED_PATTERNS) {
      sanitized = sanitized.replace(
        new RegExp(`(${pattern.source})\\s*[:=]\\s*[^\\s]+`, 'gi'),
        '$1=[REDACTED]'
      );
    }

    return sanitized;
  }

  /**
   * Validate agent is allowed to perform action
   */
  static validateAgentPermission(agentId: AgentType, actionType: ActionType): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Repair and Evolution agents can only create PR drafts
    if (['repair', 'evolution'].includes(agentId) && actionType === 'apply_patch') {
      warnings.push('Patches from this agent will be created as PR drafts only');
    }

    // Memory agent can only access memory actions
    if (agentId === 'memory') {
      const allowedActions: ActionType[] = ['store_memory', 'delete_memory'];
      if (!allowedActions.includes(actionType) && !['create_insight', 'create_suggestion'].includes(actionType)) {
        errors.push({
          field: 'agentId',
          code: 'PERMISSION_DENIED',
          message: `Memory agent cannot perform ${actionType} actions`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Create safety context for action
   */
  static createSafetyContext(action: ActionDraft): {
    requiresConfirmation: boolean;
    confirmationType: 'none' | 'soft' | 'explicit' | 'explicit_with_reason';
    warnings: string[];
    blockedReason?: string;
  } {
    const warnings: string[] = [];
    let confirmationType: 'none' | 'soft' | 'explicit' | 'explicit_with_reason' = 'none';
    let blockedReason: string | undefined;

    switch (action.safetyLevel) {
      case 'low':
        confirmationType = 'none';
        break;
      case 'medium':
        confirmationType = 'explicit';
        warnings.push('Please review this action before confirming');
        break;
      case 'high':
        confirmationType = 'explicit_with_reason';
        warnings.push('This is a high-risk action. Please review carefully.');
        break;
    }

    return {
      requiresConfirmation: confirmationType !== 'none',
      confirmationType,
      warnings,
      blockedReason,
    };
  }
}

// ============================================================================
// SAFETY FILTERS
// ============================================================================

/**
 * Filter unsafe actions from a list
 */
export function filterUnsafeActions(actions: ActionDraft[]): {
  safe: ActionDraft[];
  needsConfirmation: ActionDraft[];
  blocked: ActionDraft[];
} {
  const safe: ActionDraft[] = [];
  const needsConfirmation: ActionDraft[] = [];
  const blocked: ActionDraft[] = [];

  for (const action of actions) {
    if (SafetyValidator.isBlocked(action)) {
      blocked.push(action);
    } else if (SafetyValidator.requiresConfirmation(action)) {
      needsConfirmation.push(action);
    } else {
      safe.push(action);
    }
  }

  return { safe, needsConfirmation, blocked };
}

/**
 * Create a safe action draft
 */
export function createSafeActionDraft(
  type: string,
  title: string,
  description: string,
  payload: Record<string, unknown>,
  source: string
): ActionDraft {
  const safetyLevel = SafetyValidator.getActionSafetyLevel(type as ActionType);
  const now = Date.now();
  
  return {
    id: `action-${now}-${Math.random().toString(36).slice(2)}`,
    type,
    title,
    description,
    payload,
    source,
    safetyLevel,
    requiresConfirmation: safetyLevel !== 'low',
    createdAt: now,
  };
}

// ============================================================================
// CONTENT SANITIZER
// ============================================================================

/**
 * Sanitize user input before processing
 */
export function sanitizeUserInput(input: string): string {
  // Remove potential injection patterns
  let sanitized = input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();

  // Limit length
  if (sanitized.length > 10000) {
    sanitized = sanitized.slice(0, 10000) + '...';
  }

  return sanitized;
}

/**
 * Sanitize output before returning to user
 */
export function sanitizeOutput(output: unknown): unknown {
  if (typeof output === 'string') {
    return SafetyValidator.sanitizeContent(output);
  }

  if (typeof output === 'object' && output !== null) {
    if (Array.isArray(output)) {
      return output.map(sanitizeOutput);
    }
    
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(output)) {
      // Skip sensitive keys entirely
      const isSensitive = BLOCKED_PATTERNS.some(p => p.test(key));
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeOutput(value);
      }
    }
    return sanitized;
  }

  return output;
}

export default SafetyValidator;

