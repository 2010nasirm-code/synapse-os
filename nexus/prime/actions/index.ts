/**
 * ============================================================================
 * NEXUS PRIME - ACTIONS MODULE
 * ============================================================================
 * 
 * Central exports for the NEXUS PRIME action system.
 * 
 * @module nexus/prime/actions
 * @version 1.0.0
 */

// Action Types
export {
  ACTION_TYPES,
  ACTION_CONFIGS,
  getActionConfig,
  isAutoApplicable,
  requiresConfirmation,
  getSafetyLevel,
  isReversible,
  type ActionType,
  type ActionTypeConfig,
} from './actionTypes';

// Router
export {
  ActionRouter,
  getActionRouter,
  validateAction,
  routeAction,
  type ActionValidationResult,
} from './router';

// Handlers
export {
  handleNavigate,
  handleHighlight,
  handleSuggest,
  handleLog,
  handleCreate,
  handleUpdate,
  handleStore,
  handleAutomation,
  handleDelete,
  handlePatch,
  handleExecute,
  handleModify_settings,
  type HandlerResult,
} from './handlers';

// Confirmations
export {
  requestConfirmation,
  confirmAction,
  rejectAction,
  getActionPreview,
  getConfirmationToken,
  cleanupConfirmations,
  generatePreview,
  type ConfirmationToken,
  type ActionPreview,
  type ChangePreview,
} from './confirmations';

