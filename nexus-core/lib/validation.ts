/**
 * @module validation
 * @description Input validation and sanitization utilities
 * 
 * Provides type-safe validation for all inputs with detailed error messages.
 * 
 * @example
 * ```typescript
 * const result = validate(input, schema);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 * 
 * @version 1.0.0
 */

// ============================================
// TYPES
// ============================================

export type ValidationType = 
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object"
  | "email"
  | "url"
  | "uuid"
  | "date";

export interface ValidationRule {
  type: ValidationType;
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  items?: ValidationSchema; // For arrays
  properties?: Record<string, ValidationSchema>; // For objects
  custom?: (value: any) => boolean | string;
}

export type ValidationSchema = ValidationRule | ValidationType;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  sanitized?: any;
}

export interface ValidationError {
  path: string;
  message: string;
  value?: any;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate input against schema
 */
export function validate(
  input: any,
  schema: ValidationSchema,
  path = ""
): ValidationResult {
  const errors: ValidationError[] = [];
  let sanitized = input;

  const rule: ValidationRule = typeof schema === "string" 
    ? { type: schema } 
    : schema;

  // Required check
  if (input === undefined || input === null) {
    if (rule.required) {
      errors.push({ path: path || "root", message: "Value is required" });
    }
    return { valid: errors.length === 0, errors, sanitized };
  }

  // Type validation
  const typeResult = validateType(input, rule.type, path);
  if (!typeResult.valid) {
    errors.push(...typeResult.errors);
    return { valid: false, errors };
  }

  // Additional validations based on type
  switch (rule.type) {
    case "string":
      sanitized = String(input).trim();
      if (rule.min !== undefined && sanitized.length < rule.min) {
        errors.push({ path, message: `Minimum length is ${rule.min}`, value: sanitized });
      }
      if (rule.max !== undefined && sanitized.length > rule.max) {
        errors.push({ path, message: `Maximum length is ${rule.max}`, value: sanitized });
      }
      if (rule.pattern && !rule.pattern.test(sanitized)) {
        errors.push({ path, message: "Value does not match pattern", value: sanitized });
      }
      break;

    case "number":
      sanitized = Number(input);
      if (rule.min !== undefined && sanitized < rule.min) {
        errors.push({ path, message: `Minimum value is ${rule.min}`, value: sanitized });
      }
      if (rule.max !== undefined && sanitized > rule.max) {
        errors.push({ path, message: `Maximum value is ${rule.max}`, value: sanitized });
      }
      break;

    case "array":
      if (rule.min !== undefined && input.length < rule.min) {
        errors.push({ path, message: `Minimum length is ${rule.min}` });
      }
      if (rule.max !== undefined && input.length > rule.max) {
        errors.push({ path, message: `Maximum length is ${rule.max}` });
      }
      if (rule.items) {
        sanitized = input.map((item: any, i: number) => {
          const itemResult = validate(item, rule.items!, `${path}[${i}]`);
          errors.push(...itemResult.errors);
          return itemResult.sanitized;
        });
      }
      break;

    case "object":
      if (rule.properties) {
        sanitized = {};
        for (const [key, propSchema] of Object.entries(rule.properties)) {
          const propResult = validate(input[key], propSchema, `${path}.${key}`);
          errors.push(...propResult.errors);
          if (propResult.sanitized !== undefined) {
            sanitized[key] = propResult.sanitized;
          }
        }
      }
      break;
  }

  // Enum validation
  if (rule.enum && !rule.enum.includes(sanitized)) {
    errors.push({ path, message: `Value must be one of: ${rule.enum.join(", ")}`, value: sanitized });
  }

  // Custom validation
  if (rule.custom) {
    const customResult = rule.custom(sanitized);
    if (customResult !== true) {
      errors.push({ path, message: typeof customResult === "string" ? customResult : "Custom validation failed" });
    }
  }

  return { valid: errors.length === 0, errors, sanitized };
}

/**
 * Validate type
 */
function validateType(value: any, type: ValidationType, path: string): ValidationResult {
  const errors: ValidationError[] = [];

  switch (type) {
    case "string":
      if (typeof value !== "string") {
        errors.push({ path, message: "Expected string", value });
      }
      break;

    case "number":
      if (typeof value !== "number" || isNaN(value)) {
        errors.push({ path, message: "Expected number", value });
      }
      break;

    case "boolean":
      if (typeof value !== "boolean") {
        errors.push({ path, message: "Expected boolean", value });
      }
      break;

    case "array":
      if (!Array.isArray(value)) {
        errors.push({ path, message: "Expected array", value });
      }
      break;

    case "object":
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        errors.push({ path, message: "Expected object", value });
      }
      break;

    case "email":
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof value !== "string" || !emailRegex.test(value)) {
        errors.push({ path, message: "Invalid email format", value });
      }
      break;

    case "url":
      try {
        new URL(value);
      } catch {
        errors.push({ path, message: "Invalid URL format", value });
      }
      break;

    case "uuid":
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (typeof value !== "string" || !uuidRegex.test(value)) {
        errors.push({ path, message: "Invalid UUID format", value });
      }
      break;

    case "date":
      if (isNaN(Date.parse(value))) {
        errors.push({ path, message: "Invalid date format", value });
      }
      break;
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// SANITIZATION
// ============================================

/**
 * Sanitize string to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (typeof obj === "object" && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[sanitizeString(key)] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}

// ============================================
// COMMON SCHEMAS
// ============================================

export const CommonSchemas = {
  userId: { type: "string" as const, required: true, min: 1, max: 100 },
  email: { type: "email" as const, required: true },
  query: { type: "string" as const, required: true, min: 1, max: 10000 },
  pagination: {
    type: "object" as const,
    properties: {
      page: { type: "number" as const, min: 1 },
      limit: { type: "number" as const, min: 1, max: 100 },
    },
  },
};

export default {
  validate,
  sanitizeString,
  sanitizeObject,
  CommonSchemas,
};

