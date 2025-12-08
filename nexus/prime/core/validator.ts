/**
 * ============================================================================
 * NEXUS PRIME - INPUT VALIDATION
 * ============================================================================
 * 
 * Validates all inputs to the NEXUS PRIME system.
 * 
 * @module nexus/prime/core/validator
 * @version 1.0.0
 */

import {
  AIRequest,
  ValidationResult,
  ValidationError,
  ActionDraft,
  AutomationBlueprint,
  NexusMemoryItem,
  AgentType,
} from './types';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Valid agent types
 */
const VALID_AGENT_TYPES: AgentType[] = [
  'orchestrator',
  'insight',
  'builder',
  'repair',
  'ui',
  'automation',
  'memory',
  'evolution',
];

/**
 * Maximum prompt length
 */
const MAX_PROMPT_LENGTH = 10000;

/**
 * Maximum conversation history
 */
const MAX_CONVERSATION_HISTORY = 50;

// ============================================================================
// VALIDATOR CLASS
// ============================================================================

export class Validator {
  /**
   * Validate AI request
   */
  static validateAIRequest(request: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!request || typeof request !== 'object') {
      return {
        valid: false,
        errors: [{ field: 'request', code: 'INVALID_TYPE', message: 'Request must be an object' }],
        warnings: [],
      };
    }

    const req = request as Record<string, unknown>;

    // Check required fields
    if (!req.id || typeof req.id !== 'string') {
      errors.push({ field: 'id', code: 'REQUIRED', message: 'Request ID is required' });
    }

    if (!req.prompt || typeof req.prompt !== 'string') {
      errors.push({ field: 'prompt', code: 'REQUIRED', message: 'Prompt is required' });
    } else if ((req.prompt as string).length > MAX_PROMPT_LENGTH) {
      errors.push({
        field: 'prompt',
        code: 'TOO_LONG',
        message: `Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
      });
    } else if ((req.prompt as string).trim().length === 0) {
      errors.push({ field: 'prompt', code: 'EMPTY', message: 'Prompt cannot be empty' });
    }

    // Validate target agent if specified
    if (req.targetAgent) {
      if (!VALID_AGENT_TYPES.includes(req.targetAgent as AgentType)) {
        errors.push({
          field: 'targetAgent',
          code: 'INVALID_VALUE',
          message: `Invalid agent type. Must be one of: ${VALID_AGENT_TYPES.join(', ')}`,
        });
      }
    }

    // Validate conversation history if present
    if (req.conversationHistory) {
      if (!Array.isArray(req.conversationHistory)) {
        errors.push({
          field: 'conversationHistory',
          code: 'INVALID_TYPE',
          message: 'Conversation history must be an array',
        });
      } else if (req.conversationHistory.length > MAX_CONVERSATION_HISTORY) {
        warnings.push(`Conversation history exceeds ${MAX_CONVERSATION_HISTORY} messages, only recent messages will be used`);
      }
    }

    // Validate metadata if present
    if (req.metadata && typeof req.metadata === 'object') {
      const meta = req.metadata as Record<string, unknown>;
      if (meta.priority && !['low', 'normal', 'high', 'critical'].includes(meta.priority as string)) {
        errors.push({
          field: 'metadata.priority',
          code: 'INVALID_VALUE',
          message: 'Priority must be one of: low, normal, high, critical',
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
   * Validate action draft
   */
  static validateActionDraft(draft: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!draft || typeof draft !== 'object') {
      return {
        valid: false,
        errors: [{ field: 'draft', code: 'INVALID_TYPE', message: 'Draft must be an object' }],
        warnings: [],
      };
    }

    const d = draft as Record<string, unknown>;

    // Required fields
    if (!d.id || typeof d.id !== 'string') {
      errors.push({ field: 'id', code: 'REQUIRED', message: 'Action ID is required' });
    }

    if (!d.type || typeof d.type !== 'string') {
      errors.push({ field: 'type', code: 'REQUIRED', message: 'Action type is required' });
    }

    if (!d.description || typeof d.description !== 'string') {
      errors.push({ field: 'description', code: 'REQUIRED', message: 'Description is required' });
    }

    if (!d.payload || typeof d.payload !== 'object') {
      errors.push({ field: 'payload', code: 'REQUIRED', message: 'Payload is required' });
    }

    if (!d.rationale || typeof d.rationale !== 'string') {
      errors.push({ field: 'rationale', code: 'REQUIRED', message: 'Rationale is required' });
    }

    // Check expiration
    if (d.expiresAt && typeof d.expiresAt === 'number') {
      if (d.expiresAt < Date.now()) {
        errors.push({ field: 'expiresAt', code: 'EXPIRED', message: 'Action draft has expired' });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate automation blueprint
   */
  static validateAutomationBlueprint(blueprint: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!blueprint || typeof blueprint !== 'object') {
      return {
        valid: false,
        errors: [{ field: 'blueprint', code: 'INVALID_TYPE', message: 'Blueprint must be an object' }],
        warnings: [],
      };
    }

    const bp = blueprint as Record<string, unknown>;

    // Required fields
    if (!bp.name || typeof bp.name !== 'string') {
      errors.push({ field: 'name', code: 'REQUIRED', message: 'Automation name is required' });
    }

    if (!bp.trigger || typeof bp.trigger !== 'object') {
      errors.push({ field: 'trigger', code: 'REQUIRED', message: 'Trigger configuration is required' });
    } else {
      const trigger = bp.trigger as Record<string, unknown>;
      if (!['schedule', 'event', 'condition', 'manual', 'webhook'].includes(trigger.type as string)) {
        errors.push({
          field: 'trigger.type',
          code: 'INVALID_VALUE',
          message: 'Invalid trigger type',
        });
      }
    }

    if (!bp.actions || !Array.isArray(bp.actions) || bp.actions.length === 0) {
      errors.push({ field: 'actions', code: 'REQUIRED', message: 'At least one action is required' });
    }

    // Validate conditions if present
    if (bp.conditions && Array.isArray(bp.conditions)) {
      for (let i = 0; i < bp.conditions.length; i++) {
        const condition = bp.conditions[i] as Record<string, unknown>;
        if (!condition.field) {
          errors.push({
            field: `conditions[${i}].field`,
            code: 'REQUIRED',
            message: 'Condition field is required',
          });
        }
        if (!condition.operator) {
          errors.push({
            field: `conditions[${i}].operator`,
            code: 'REQUIRED',
            message: 'Condition operator is required',
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate memory item
   */
  static validateMemoryItem(item: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    if (!item || typeof item !== 'object') {
      return {
        valid: false,
        errors: [{ field: 'item', code: 'INVALID_TYPE', message: 'Item must be an object' }],
        warnings: [],
      };
    }

    const mem = item as Record<string, unknown>;

    // Required fields
    if (!mem.content || typeof mem.content !== 'string') {
      errors.push({ field: 'content', code: 'REQUIRED', message: 'Content is required' });
    } else if ((mem.content as string).length > 50000) {
      errors.push({
        field: 'content',
        code: 'TOO_LONG',
        message: 'Content exceeds maximum length of 50000 characters',
      });
    }

    if (!mem.category || typeof mem.category !== 'string') {
      errors.push({ field: 'category', code: 'REQUIRED', message: 'Category is required' });
    } else {
      const validCategories = ['conversation', 'preference', 'fact', 'pattern', 'instruction', 'context', 'summary'];
      if (!validCategories.includes(mem.category as string)) {
        errors.push({
          field: 'category',
          code: 'INVALID_VALUE',
          message: `Category must be one of: ${validCategories.join(', ')}`,
        });
      }
    }

    // Validate importance
    if (mem.importance !== undefined) {
      if (typeof mem.importance !== 'number' || mem.importance < 0 || mem.importance > 1) {
        errors.push({
          field: 'importance',
          code: 'INVALID_VALUE',
          message: 'Importance must be a number between 0 and 1',
        });
      }
    }

    // Validate TTL
    if (mem.ttl !== undefined) {
      if (typeof mem.ttl !== 'number' || mem.ttl < 0) {
        errors.push({
          field: 'ttl',
          code: 'INVALID_VALUE',
          message: 'TTL must be a non-negative number',
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
   * Sanitize and normalize input
   */
  static sanitize<T>(input: T): T {
    if (typeof input === 'string') {
      return input.trim() as T;
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitize(item)) as T;
    }

    if (input && typeof input === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitize(value);
      }
      return sanitized as T;
    }

    return input;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate and throw if invalid
 */
export function validateOrThrow<T>(
  value: T,
  validator: (v: T) => ValidationResult,
  errorMessage: string
): T {
  const result = validator(value);
  if (!result.valid) {
    const details = result.errors.map(e => `${e.field}: ${e.message}`).join(', ');
    throw new Error(`${errorMessage}: ${details}`);
  }
  return value;
}

/**
 * Check if value is valid AI request
 */
export function isValidAIRequest(value: unknown): value is AIRequest {
  return Validator.validateAIRequest(value).valid;
}

/**
 * Check if value is valid action draft
 */
export function isValidActionDraft(value: unknown): value is ActionDraft {
  return Validator.validateActionDraft(value).valid;
}

/**
 * Check if value is valid automation blueprint
 */
export function isValidAutomationBlueprint(value: unknown): value is AutomationBlueprint {
  return Validator.validateAutomationBlueprint(value).valid;
}

/**
 * Check if value is valid memory item
 */
export function isValidMemoryItem(value: unknown): value is NexusMemoryItem {
  return Validator.validateMemoryItem(value).valid;
}

export default Validator;

