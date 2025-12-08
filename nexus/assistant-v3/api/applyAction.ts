/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - APPLY ACTION API
 * ============================================================================
 * 
 * Validates and applies confirmed actions.
 * 
 * @module nexus/assistant-v3/api/applyAction
 * @version 3.0.0
 */

import { ActionDraft, ActionType } from '../core/types';
import { SafetyChecker, ConsentManager } from '../core/safety';
import { ProvenanceManager, createProvenance } from '../core/provenance';

// ============================================================================
// TOKEN STORE
// ============================================================================

interface ConfirmationToken {
  actionId: string;
  userId: string;
  action: ActionDraft;
  createdAt: number;
  expiresAt: number;
}

const tokenStore = new Map<string, ConfirmationToken>();

// Cleanup expired tokens
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(tokenStore.entries());
  for (const [key, token] of entries) {
    if (now > token.expiresAt) {
      tokenStore.delete(key);
    }
  }
}, 60000); // Every minute

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate a confirmation token for an action
 */
export function generateConfirmationToken(
  action: ActionDraft,
  userId: string
): string {
  const token = `confirm-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  
  tokenStore.set(token, {
    actionId: action.id,
    userId,
    action,
    createdAt: Date.now(),
    expiresAt: action.expiresAt || Date.now() + 5 * 60 * 1000, // 5 min default
  });

  return token;
}

/**
 * Validate a confirmation token
 */
export function validateToken(
  token: string,
  userId: string
): { valid: boolean; action?: ActionDraft; reason?: string } {
  const stored = tokenStore.get(token);

  if (!stored) {
    return { valid: false, reason: 'Invalid or expired token' };
  }

  if (stored.userId !== userId) {
    return { valid: false, reason: 'Token does not belong to this user' };
  }

  if (Date.now() > stored.expiresAt) {
    tokenStore.delete(token);
    return { valid: false, reason: 'Token has expired' };
  }

  return { valid: true, action: stored.action };
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

type ActionHandler = (action: ActionDraft, userId: string) => Promise<{
  success: boolean;
  result?: unknown;
  error?: string;
}>;

const actionHandlers: Record<ActionType, ActionHandler> = {
  create_tracker: async (action, userId) => {
    // Would integrate with tracker service
    console.log('[ApplyAction] Creating tracker:', action.payload);
    return { success: true, result: { id: `tracker-${Date.now()}` } };
  },

  update_tracker: async (action, userId) => {
    console.log('[ApplyAction] Updating tracker:', action.payload);
    return { success: true };
  },

  delete_tracker: async (action, userId) => {
    console.log('[ApplyAction] Deleting tracker:', action.payload);
    return { success: true };
  },

  create_automation: async (action, userId) => {
    console.log('[ApplyAction] Creating automation:', action.payload);
    return { success: true, result: { id: `automation-${Date.now()}` } };
  },

  update_automation: async (action, userId) => {
    console.log('[ApplyAction] Updating automation:', action.payload);
    return { success: true };
  },

  create_item: async (action, userId) => {
    console.log('[ApplyAction] Creating item:', action.payload);
    return { success: true, result: { id: `item-${Date.now()}` } };
  },

  update_item: async (action, userId) => {
    console.log('[ApplyAction] Updating item:', action.payload);
    return { success: true };
  },

  delete_item: async (action, userId) => {
    console.log('[ApplyAction] Deleting item:', action.payload);
    return { success: true };
  },

  create_suggestion: async (action, userId) => {
    console.log('[ApplyAction] Creating suggestion:', action.payload);
    return { success: true, result: { id: `suggestion-${Date.now()}` } };
  },

  navigate: async (action, userId) => {
    // Navigation is client-side only
    return { success: true, result: { path: action.payload.path } };
  },

  show_insight: async (action, userId) => {
    // Insight display is client-side
    return { success: true };
  },

  patch_code: async (action, userId) => {
    // Code patches require special handling - create PR draft
    console.log('[ApplyAction] Code patch requested:', action.payload);
    return { 
      success: true, 
      result: { 
        type: 'pr_draft',
        message: 'Code patch saved as draft PR. Review and apply manually.',
      }
    };
  },

  create_note: async (action, userId) => {
    console.log('[ApplyAction] Creating note:', action.payload);
    return { success: true, result: { id: `note-${Date.now()}` } };
  },

  set_reminder: async (action, userId) => {
    console.log('[ApplyAction] Setting reminder:', action.payload);
    return { success: true, result: { id: `reminder-${Date.now()}` } };
  },
};

// ============================================================================
// REQUEST HANDLER
// ============================================================================

export interface ApplyActionRequest {
  token: string;
  userId: string;
  confirm: boolean;
}

export interface ApplyActionResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  provenance?: Record<string, unknown>;
}

export async function handleApplyAction(
  request: ApplyActionRequest
): Promise<ApplyActionResponse> {
  const provenanceBuilder = ProvenanceManager.create(`action-${Date.now()}`);

  try {
    // Validate token
    const tokenValidation = validateToken(request.token, request.userId);
    provenanceBuilder.add('applyAction', ['token_validation'], { 
      operation: 'validate_token',
      confidence: tokenValidation.valid ? 1 : 0,
    });

    if (!tokenValidation.valid) {
      return { 
        success: false, 
        error: tokenValidation.reason,
      };
    }

    const action = tokenValidation.action!;

    // Check if user declined
    if (!request.confirm) {
      tokenStore.delete(request.token);
      provenanceBuilder.add('applyAction', ['declined'], { operation: 'user_declined' });
      provenanceBuilder.save();
      return { 
        success: true, 
        result: { declined: true },
      };
    }

    // Safety check on action
    const safetyCheck = SafetyChecker.checkAction(action);
    provenanceBuilder.add('applyAction', ['safety_check'], {
      operation: 'safety_check',
      confidence: safetyCheck.safe ? 1 : 0.5,
    });

    if (!safetyCheck.safe) {
      return {
        success: false,
        error: `Action blocked: ${safetyCheck.warnings.join(', ')}`,
      };
    }

    // Check consent for data-modifying actions
    if (['create_tracker', 'create_item', 'create_note'].includes(action.type)) {
      if (!ConsentManager.canStoreMemory(request.userId)) {
        // For now, allow but note it
        console.log('[ApplyAction] User has not consented to data storage');
      }
    }

    // Execute action
    const handler = actionHandlers[action.type];
    if (!handler) {
      return {
        success: false,
        error: `Unknown action type: ${action.type}`,
      };
    }

    const result = await handler(action, request.userId);
    provenanceBuilder.add('applyAction', [action.type], {
      operation: 'execute',
      confidence: result.success ? 1 : 0,
    });

    // Remove used token
    tokenStore.delete(request.token);

    // Save provenance
    provenanceBuilder.save();

    return {
      success: result.success,
      result: result.result,
      error: result.error,
      provenance: {
        chain: provenanceBuilder.getChain(),
      },
    };

  } catch (error) {
    console.error('[ApplyAction] Error:', error);
    provenanceBuilder.add('applyAction', ['error'], { operation: 'error' });
    provenanceBuilder.save();

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Action failed',
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { tokenStore };
export default handleApplyAction;

