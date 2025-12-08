/**
 * ============================================================================
 * NEXUS PRIME - APPLY ACTION API
 * ============================================================================
 * 
 * Apply a confirmed action:
 * - Validates confirmation token
 * - Applies action to DB
 * - Logs provenance
 * 
 * @module nexus/prime/api/applyAction
 * @version 1.0.0
 */

import { ActionDraft, NexusAction, ProvenanceRecord } from '../core/types';
import { confirmAction, getConfirmationToken, requestConfirmation } from '../actions/confirmations';
import { routeAction, validateAction } from '../actions/router';
import { createProvenance } from '../core/provenance';

// ============================================================================
// REQUEST TYPES
// ============================================================================

export interface ApplyActionRequest {
  action?: ActionDraft;
  confirmationToken?: string;
  userId: string;
}

export interface ApplyActionResponse {
  success: boolean;
  action?: NexusAction;
  result?: unknown;
  confirmationToken?: string;
  needsConfirmation?: boolean;
  error?: string;
  provenance: ProvenanceRecord;
}

// ============================================================================
// HANDLER
// ============================================================================

export async function handleApplyActionRequest(
  request: ApplyActionRequest
): Promise<ApplyActionResponse> {
  const prov = createProvenance('api', 'action', 'apply');
  prov.withInput({ hasToken: !!request.confirmationToken, hasAction: !!request.action });

  try {
    // Case 1: Confirming with token
    if (request.confirmationToken) {
      const confirmation = confirmAction(request.confirmationToken, request.userId);
      
      if (!confirmation.success) {
        prov.failure(confirmation.error || 'Confirmation failed');
        return {
          success: false,
          error: confirmation.error,
          provenance: prov.build(),
        };
      }

      // Apply the confirmed action
      const applyResult = await routeAction(confirmation.action!, true);
      
      if (!applyResult.success) {
        prov.failure(applyResult.error || 'Action execution failed');
        return {
          success: false,
          error: applyResult.error,
          action: confirmation.action,
          provenance: prov.build(),
        };
      }

      prov.success().withOutput({ actionId: confirmation.action!.id });
      
      return {
        success: true,
        action: confirmation.action,
        result: applyResult.result,
        provenance: prov.build(),
      };
    }

    // Case 2: New action
    if (request.action) {
      // Validate action
      const validation = validateAction(request.action);
      
      if (!validation.valid) {
        prov.failure(`Validation failed: ${validation.errors.join(', ')}`);
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
          provenance: prov.build(),
        };
      }

      // Check if confirmation is needed
      if (validation.requiresConfirmation) {
        const token = requestConfirmation(request.action, request.userId);
        
        prov.success().withOutput({ needsConfirmation: true, tokenId: token.id });
        
        return {
          success: true,
          needsConfirmation: true,
          confirmationToken: token.id,
          provenance: prov.build(),
        };
      }

      // Auto-apply safe actions
      if (validation.autoApplicable) {
        const applyResult = await routeAction(request.action, false);
        
        if (!applyResult.success) {
          prov.failure(applyResult.error || 'Action execution failed');
          return {
            success: false,
            error: applyResult.error,
            provenance: prov.build(),
          };
        }

        const confirmedAction: NexusAction = {
          ...request.action,
          confirmedBy: 'auto',
          confirmedAt: Date.now(),
          status: 'completed',
        };

        prov.success().withOutput({ actionId: request.action.id, auto: true });
        
        return {
          success: true,
          action: confirmedAction,
          result: applyResult.result,
          provenance: prov.build(),
        };
      }

      // Action needs confirmation but wasn't flagged
      const token = requestConfirmation(request.action, request.userId);
      
      prov.success().withOutput({ needsConfirmation: true, tokenId: token.id });
      
      return {
        success: true,
        needsConfirmation: true,
        confirmationToken: token.id,
        provenance: prov.build(),
      };
    }

    // No action or token provided
    prov.failure('No action or confirmation token provided');
    return {
      success: false,
      error: 'No action or confirmation token provided',
      provenance: prov.build(),
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    prov.failure(errorMessage);
    
    return {
      success: false,
      error: errorMessage,
      provenance: prov.build(),
    };
  }
}

// ============================================================================
// BATCH APPLY
// ============================================================================

export interface BatchApplyRequest {
  actions: ActionDraft[];
  userId: string;
  confirmAll?: boolean;
}

export interface BatchApplyResponse {
  success: boolean;
  results: Array<{
    actionId: string;
    success: boolean;
    needsConfirmation?: boolean;
    confirmationToken?: string;
    error?: string;
  }>;
}

export async function handleBatchApplyRequest(
  request: BatchApplyRequest
): Promise<BatchApplyResponse> {
  const results: BatchApplyResponse['results'] = [];

  for (const action of request.actions) {
    const result = await handleApplyActionRequest({
      action,
      userId: request.userId,
    });

    // If confirm all is set and confirmation is needed, auto-confirm
    if (request.confirmAll && result.needsConfirmation && result.confirmationToken) {
      const confirmed = await handleApplyActionRequest({
        confirmationToken: result.confirmationToken,
        userId: request.userId,
      });
      
      results.push({
        actionId: action.id,
        success: confirmed.success,
        error: confirmed.error,
      });
    } else {
      results.push({
        actionId: action.id,
        success: result.success,
        needsConfirmation: result.needsConfirmation,
        confirmationToken: result.confirmationToken,
        error: result.error,
      });
    }
  }

  return {
    success: results.every(r => r.success || r.needsConfirmation),
    results,
  };
}

export default handleApplyActionRequest;

