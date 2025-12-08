/**
 * ============================================================================
 * NEXUS PRIME - CONFIRMATION SYSTEM
 * ============================================================================
 * 
 * Handles action confirmations:
 * - Implements confirmation flows
 * - Returns preview of final effect
 * - Manages confirmation tokens
 * 
 * @module nexus/prime/actions/confirmations
 * @version 1.0.0
 */

import { ActionDraft, NexusAction } from '../core/types';
import { getActionConfig } from './actionTypes';

// ============================================================================
// CONFIRMATION TOKEN
// ============================================================================

export interface ConfirmationToken {
  id: string;
  actionId: string;
  userId: string;
  action: ActionDraft;
  preview: ActionPreview;
  expiresAt: number;
  confirmed: boolean;
  confirmedAt?: number;
}

// ============================================================================
// ACTION PREVIEW
// ============================================================================

export interface ActionPreview {
  title: string;
  description: string;
  changes: ChangePreview[];
  warnings: string[];
  impact: 'low' | 'medium' | 'high';
  reversible: boolean;
}

export interface ChangePreview {
  type: 'create' | 'update' | 'delete' | 'modify';
  target: string;
  before?: unknown;
  after?: unknown;
  description: string;
}

// ============================================================================
// CONFIRMATION STORE
// ============================================================================

class ConfirmationStore {
  private tokens = new Map<string, ConfirmationToken>();
  private readonly TOKEN_TTL = 5 * 60 * 1000; // 5 minutes

  create(action: ActionDraft, userId: string): ConfirmationToken {
    const token: ConfirmationToken = {
      id: `confirm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      actionId: action.id,
      userId,
      action,
      preview: generatePreview(action),
      expiresAt: Date.now() + this.TOKEN_TTL,
      confirmed: false,
    };

    this.tokens.set(token.id, token);
    return token;
  }

  get(tokenId: string): ConfirmationToken | null {
    const token = this.tokens.get(tokenId);
    
    if (!token) return null;
    
    // Check expiration
    if (Date.now() > token.expiresAt) {
      this.tokens.delete(tokenId);
      return null;
    }

    return token;
  }

  confirm(tokenId: string, userId: string): ConfirmationToken | null {
    const token = this.get(tokenId);
    
    if (!token) return null;
    if (token.userId !== userId) return null;

    token.confirmed = true;
    token.confirmedAt = Date.now();
    this.tokens.set(tokenId, token);

    return token;
  }

  reject(tokenId: string): void {
    this.tokens.delete(tokenId);
  }

  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, token] of this.tokens) {
      if (now > token.expiresAt) {
        this.tokens.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}

const confirmationStore = new ConfirmationStore();

// ============================================================================
// PREVIEW GENERATION
// ============================================================================

export function generatePreview(action: ActionDraft): ActionPreview {
  const config = getActionConfig(action.type as any);
  const changes: ChangePreview[] = [];
  const warnings: string[] = [];

  // Generate changes based on action type
  const actionType = action.type as string;
  switch (actionType) {
    case 'create':
      changes.push({
        type: 'create',
        target: String(action.payload.type || action.payload.entityType || 'item'),
        after: action.payload.config || action.payload.data,
        description: `Create new ${String(action.payload.type || 'item')}`,
      });
      break;

    case 'update':
      changes.push({
        type: 'update',
        target: String(action.payload.id || action.payload.targetId || 'item'),
        before: '(current values)',
        after: action.payload.updates || action.payload.data,
        description: `Update existing item`,
      });
      break;

    case 'delete':
      const deleteIds = (action.payload.ids || [action.payload.id]) as string[];
      for (const id of deleteIds) {
        changes.push({
          type: 'delete',
          target: String(id),
          before: '(will be deleted)',
          description: `Delete item ${id}`,
        });
      }
      warnings.push('This action cannot be undone.');
      break;

    case 'patch':
      const patchList = (action.payload.patches || [action.payload.patch]) as any[];
      for (const patch of patchList) {
        if (patch) {
          changes.push({
            type: 'modify',
            target: String(patch.file || 'code'),
            before: patch.before,
            after: patch.after,
            description: String(patch.description || 'Apply code change'),
          });
        }
      }
      warnings.push('Code changes will be proposed as a PR draft.');
      break;

    case 'automation':
      changes.push({
        type: 'create',
        target: 'automation',
        after: action.payload.blueprint || action.payload,
        description: 'Create automation rule',
      });
      warnings.push('Automation will be created in disabled state.');
      break;

    case 'modify_settings':
      const settingsObj = (action.payload.settings || action.payload) as Record<string, unknown>;
      for (const [key, value] of Object.entries(settingsObj)) {
        changes.push({
          type: 'modify',
          target: `settings.${key}`,
          after: value,
          description: `Change ${key} setting`,
        });
      }
      warnings.push('Settings changes may affect app behavior.');
      break;

    default:
      changes.push({
        type: 'modify',
        target: 'unknown',
        description: action.description,
      });
  }

  // Determine impact
  let impact: 'low' | 'medium' | 'high' = 'low';
  if (config?.safetyLevel === 'high') impact = 'high';
  else if (config?.safetyLevel === 'medium') impact = 'medium';

  return {
    title: action.title,
    description: action.description,
    changes,
    warnings,
    impact,
    reversible: config?.reversible ?? true,
  };
}

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

/**
 * Request confirmation for an action
 */
export function requestConfirmation(action: ActionDraft, userId: string): ConfirmationToken {
  return confirmationStore.create(action, userId);
}

/**
 * Confirm an action
 */
export function confirmAction(tokenId: string, userId: string): {
  success: boolean;
  action?: NexusAction;
  error?: string;
} {
  const token = confirmationStore.confirm(tokenId, userId);
  
  if (!token) {
    return {
      success: false,
      error: 'Invalid or expired confirmation token',
    };
  }

  const confirmedAction: NexusAction = {
    ...token.action,
    confirmedBy: userId,
    confirmedAt: token.confirmedAt!,
    status: 'confirmed',
  };

  return {
    success: true,
    action: confirmedAction,
  };
}

/**
 * Reject an action
 */
export function rejectAction(tokenId: string): void {
  confirmationStore.reject(tokenId);
}

/**
 * Get preview for an action
 */
export function getActionPreview(action: ActionDraft): ActionPreview {
  return generatePreview(action);
}

/**
 * Get confirmation token
 */
export function getConfirmationToken(tokenId: string): ConfirmationToken | null {
  return confirmationStore.get(tokenId);
}

/**
 * Cleanup expired tokens
 */
export function cleanupConfirmations(): number {
  return confirmationStore.cleanup();
}

export default {
  requestConfirmation,
  confirmAction,
  rejectAction,
  getActionPreview,
  getConfirmationToken,
  cleanupConfirmations,
};

