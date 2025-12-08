/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - VALIDATORS
 * ============================================================================
 * 
 * Input validation utilities.
 * 
 * @module nexus/assistant-v3/utils/validators
 * @version 3.0.0
 */

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate assistant request
 */
export function validateAssistantRequest(request: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isObject(request)) {
    return { valid: false, errors: ['Request must be an object'] };
  }

  // Query is required
  if (!isNonEmptyString(request.query)) {
    errors.push('Query is required and must be a non-empty string');
  }

  // Optional: userId
  if (request.userId !== undefined && !isString(request.userId)) {
    errors.push('userId must be a string');
  }

  // Optional: sessionId
  if (request.sessionId !== undefined && !isString(request.sessionId)) {
    errors.push('sessionId must be a string');
  }

  // Optional: persona
  if (request.persona !== undefined) {
    const validPersonas = ['friendly', 'teacher', 'expert', 'concise'];
    if (!isString(request.persona) || !validPersonas.includes(request.persona)) {
      errors.push(`persona must be one of: ${validPersonas.join(', ')}`);
    }
  }

  // Optional: options
  if (request.options !== undefined) {
    if (!isObject(request.options)) {
      errors.push('options must be an object');
    } else {
      if (request.options.maxTokens !== undefined && !isNumber(request.options.maxTokens)) {
        errors.push('options.maxTokens must be a number');
      }
      if (request.options.temperature !== undefined) {
        if (!isNumber(request.options.temperature) || 
            request.options.temperature < 0 || 
            request.options.temperature > 2) {
          errors.push('options.temperature must be a number between 0 and 2');
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate action draft
 */
export function validateActionDraft(action: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isObject(action)) {
    return { valid: false, errors: ['Action must be an object'] };
  }

  if (!isNonEmptyString(action.id)) {
    errors.push('Action id is required');
  }

  if (!isNonEmptyString(action.type)) {
    errors.push('Action type is required');
  }

  if (!isObject(action.payload)) {
    errors.push('Action payload must be an object');
  }

  if (!isBoolean(action.requiresConfirmation)) {
    errors.push('Action requiresConfirmation must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate memory item
 */
export function validateMemoryItem(item: unknown): ValidationResult {
  const errors: string[] = [];

  if (!isObject(item)) {
    return { valid: false, errors: ['Memory item must be an object'] };
  }

  if (!isNonEmptyString(item.text)) {
    errors.push('Memory text is required');
  }

  const validTypes = ['conversation', 'fact', 'preference', 'insight', 'context', 'summary'];
  if (!isString(item.type) || !validTypes.includes(item.type)) {
    errors.push(`Memory type must be one of: ${validTypes.join(', ')}`);
  }

  if (item.importance !== undefined) {
    if (!isNumber(item.importance) || item.importance < 0 || item.importance > 1) {
      errors.push('Memory importance must be a number between 0 and 1');
    }
  }

  if (item.ttl !== undefined && (!isNumber(item.ttl) || item.ttl < 0)) {
    errors.push('Memory ttl must be a positive number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// SANITIZERS
// ============================================================================

/**
 * Sanitize string input
 */
export function sanitizeString(value: unknown, maxLength: number = 10000): string {
  if (!isString(value)) return '';
  return value.trim().slice(0, maxLength);
}

/**
 * Sanitize object keys
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  allowedKeys: string[]
): Partial<T> {
  const result: Partial<T> = {};
  for (const key of allowedKeys) {
    if (key in obj) {
      (result as any)[key] = obj[key];
    }
  }
  return result;
}

export default {
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  isNonEmptyString,
  validateAssistantRequest,
  validateActionDraft,
  validateMemoryItem,
  sanitizeString,
  sanitizeObject,
};

