/**
 * ============================================================================
 * NEXUS PRIME - ACTION ROUTER
 * ============================================================================
 * 
 * Validates and routes actions:
 * - Validates every action draft
 * - Flags dangerous actions
 * - Requires confirmation for writes/deletes
 * - Allows auto-actions only for safe operations
 * 
 * @module nexus/prime/actions/router
 * @version 1.0.0
 */

import { ActionDraft, NexusAction } from '../core/types';
import { ACTION_TYPES, getActionConfig, isAutoApplicable } from './actionTypes';

// ============================================================================
// VALIDATION RESULT
// ============================================================================

export interface ActionValidationResult {
  valid: boolean;
  autoApplicable: boolean;
  requiresConfirmation: boolean;
  warnings: string[];
  errors: string[];
  modifiedAction?: ActionDraft;
}

// ============================================================================
// ACTION ROUTER
// ============================================================================

export class ActionRouter {
  private static instance: ActionRouter;
  private blockedPatterns: RegExp[] = [
    /rm\s+-rf/i,
    /drop\s+table/i,
    /delete\s+from.*where\s+1\s*=\s*1/i,
    /truncate/i,
    /format\s+c:/i,
  ];

  private constructor() {}

  static getInstance(): ActionRouter {
    if (!ActionRouter.instance) {
      ActionRouter.instance = new ActionRouter();
    }
    return ActionRouter.instance;
  }

  /**
   * Validate an action draft
   */
  validate(action: ActionDraft): ActionValidationResult {
    const result: ActionValidationResult = {
      valid: true,
      autoApplicable: false,
      requiresConfirmation: true,
      warnings: [],
      errors: [],
    };

    // Get action config
    const config = getActionConfig(action.type as any);
    
    if (!config) {
      result.errors.push(`Unknown action type: ${action.type}`);
      result.valid = false;
      return result;
    }

    // Check for blocked patterns
    const payloadStr = JSON.stringify(action.payload);
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(payloadStr)) {
        result.errors.push('Action contains blocked dangerous pattern');
        result.valid = false;
        return result;
      }
    }

    // Validate payload
    const payloadValidation = this.validatePayload(action);
    if (!payloadValidation.valid) {
      result.errors.push(...payloadValidation.errors);
      result.valid = false;
    }
    result.warnings.push(...payloadValidation.warnings);

    // Determine if auto-applicable
    result.autoApplicable = isAutoApplicable(action.type as any) && 
      action.safetyLevel === 'low' &&
      !action.requiresConfirmation;

    // Determine confirmation requirement
    result.requiresConfirmation = config.requiresConfirmation || 
      action.requiresConfirmation ||
      action.safetyLevel !== 'low';

    // Force confirmation for write/delete/modify operations
    if ([ACTION_TYPES.CREATE, ACTION_TYPES.UPDATE, ACTION_TYPES.DELETE, 
         ACTION_TYPES.PATCH, ACTION_TYPES.EXECUTE, ACTION_TYPES.MODIFY_SETTINGS]
        .includes(action.type as any)) {
      result.requiresConfirmation = true;
      result.autoApplicable = false;
    }

    return result;
  }

  /**
   * Validate action payload
   */
  private validatePayload(action: ActionDraft): { valid: boolean; warnings: string[]; errors: string[] } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check required payload
    if (!action.payload || Object.keys(action.payload).length === 0) {
      if ([ACTION_TYPES.CREATE, ACTION_TYPES.UPDATE, ACTION_TYPES.DELETE].includes(action.type as any)) {
        errors.push('Action requires a payload');
      }
    }

    // Specific validations
    switch (action.type) {
      case ACTION_TYPES.CREATE:
        if (!action.payload.type && !action.payload.entityType) {
          warnings.push('Create action should specify entity type');
        }
        break;

      case ACTION_TYPES.DELETE:
        if (!action.payload.id && !action.payload.ids) {
          errors.push('Delete action requires target ID(s)');
        }
        break;

      case ACTION_TYPES.PATCH:
        if (!action.payload.patch && !action.payload.patches) {
          errors.push('Patch action requires patch data');
        }
        break;

      case ACTION_TYPES.NAVIGATE:
        if (!action.payload.path && !action.payload.route) {
          errors.push('Navigate action requires a path');
        }
        break;
    }

    return { valid: errors.length === 0, warnings, errors };
  }

  /**
   * Route an action to appropriate handler
   */
  async route(
    action: ActionDraft,
    confirmed: boolean = false
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const validation = this.validate(action);

    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
      };
    }

    if (validation.requiresConfirmation && !confirmed) {
      return {
        success: false,
        error: 'Action requires confirmation',
      };
    }

    // Route to handler
    try {
      const handler = await this.getHandler(action.type);
      if (!handler) {
        return {
          success: false,
          error: `No handler for action type: ${action.type}`,
        };
      }

      const result = await handler(action);
      return { success: true, result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get handler for action type
   */
  private async getHandler(type: string): Promise<((action: ActionDraft) => Promise<unknown>) | null> {
    // Dynamic handler loading
    const handlers = await import('./handlers');
    return (handlers as any)[`handle${this.capitalize(type)}`] || null;
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Convert action draft to confirmed action
   */
  toConfirmedAction(draft: ActionDraft, userId: string): NexusAction {
    return {
      ...draft,
      confirmedBy: userId,
      confirmedAt: Date.now(),
      status: 'pending',
    };
  }

  /**
   * Filter actions by safety level
   */
  filterByUnsafe(actions: ActionDraft[]): {
    safe: ActionDraft[];
    needsConfirmation: ActionDraft[];
    blocked: ActionDraft[];
  } {
    const safe: ActionDraft[] = [];
    const needsConfirmation: ActionDraft[] = [];
    const blocked: ActionDraft[] = [];

    for (const action of actions) {
      const validation = this.validate(action);
      
      if (!validation.valid) {
        blocked.push(action);
      } else if (validation.autoApplicable) {
        safe.push(action);
      } else {
        needsConfirmation.push(action);
      }
    }

    return { safe, needsConfirmation, blocked };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function getActionRouter(): ActionRouter {
  return ActionRouter.getInstance();
}

export function validateAction(action: ActionDraft): ActionValidationResult {
  return ActionRouter.getInstance().validate(action);
}

export async function routeAction(
  action: ActionDraft,
  confirmed?: boolean
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  return ActionRouter.getInstance().route(action, confirmed);
}

export default ActionRouter;

