/**
 * @module errors
 * @description Custom error classes and error handling utilities
 * 
 * Provides a hierarchy of typed errors for better error handling
 * and debugging throughout the Nexus system.
 * 
 * @example
 * ```typescript
 * throw new NexusError('Something went wrong', 'INTERNAL_ERROR');
 * throw new ValidationError('Invalid input', [{ field: 'email', message: 'Invalid format' }]);
 * ```
 * 
 * @version 1.0.0
 */

import { logger } from "./logger";
import { eventBus } from "../core/events";

// ============================================
// ERROR CODES
// ============================================

export const ErrorCodes = {
  // General errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  
  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED: "MISSING_REQUIRED",
  
  // Agent errors
  AGENT_NOT_FOUND: "AGENT_NOT_FOUND",
  AGENT_DISABLED: "AGENT_DISABLED",
  AGENT_EXECUTION_FAILED: "AGENT_EXECUTION_FAILED",
  AGENT_TIMEOUT: "AGENT_TIMEOUT",
  
  // Memory errors
  MEMORY_FULL: "MEMORY_FULL",
  MEMORY_NOT_FOUND: "MEMORY_NOT_FOUND",
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  QUOTA_EXCEEDED: "QUOTA_EXCEEDED",
  
  // External services
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  API_ERROR: "API_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// ============================================
// BASE ERROR CLASS
// ============================================

/**
 * Base error class for all Nexus errors
 */
export class NexusError extends Error {
  public readonly code: ErrorCode;
  public readonly timestamp: string;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    details?: Record<string, any>,
    isOperational = true
  ) {
    super(message);
    this.name = "NexusError";
    this.code = code;
    this.timestamp = new Date().toISOString();
    this.details = details;
    this.isOperational = isOperational;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);

    // Log error
    logger.error("error", `${code}: ${message}`, details);
    
    // Emit error event
    eventBus.emit("system:error", { error: message, stack: this.stack });
  }

  /**
   * Convert to JSON for API responses
   */
  toJSON() {
    return {
      error: true,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp,
      details: this.details,
    };
  }
}

// ============================================
// SPECIFIC ERROR CLASSES
// ============================================

/**
 * Validation error with field-level details
 */
export class ValidationError extends NexusError {
  public readonly fields: Array<{ field: string; message: string }>;

  constructor(message: string, fields: Array<{ field: string; message: string }>) {
    super(message, ErrorCodes.VALIDATION_ERROR, { fields });
    this.name = "ValidationError";
    this.fields = fields;
  }
}

/**
 * Resource not found error
 */
export class NotFoundError extends NexusError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} not found: ${id}` : `${resource} not found`,
      ErrorCodes.NOT_FOUND,
      { resource, id }
    );
    this.name = "NotFoundError";
  }
}

/**
 * Agent execution error
 */
export class AgentError extends NexusError {
  public readonly agentId: string;

  constructor(agentId: string, message: string, code: ErrorCode = ErrorCodes.AGENT_EXECUTION_FAILED) {
    super(message, code, { agentId });
    this.name = "AgentError";
    this.agentId = agentId;
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends NexusError {
  public readonly retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message, ErrorCodes.RATE_LIMIT_EXCEEDED, { retryAfter });
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

/**
 * External service error
 */
export class ExternalServiceError extends NexusError {
  public readonly service: string;
  public readonly statusCode?: number;

  constructor(service: string, message: string, statusCode?: number) {
    super(message, ErrorCodes.EXTERNAL_SERVICE_ERROR, { service, statusCode });
    this.name = "ExternalServiceError";
    this.service = service;
    this.statusCode = statusCode;
  }
}

// ============================================
// ERROR HANDLING UTILITIES
// ============================================

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: {
    fallback?: ReturnType<T>;
    onError?: (error: Error) => void;
    rethrow?: boolean;
  }
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error: any) {
      options?.onError?.(error);
      
      if (options?.rethrow) {
        throw error;
      }
      
      return options?.fallback;
    }
  }) as T;
}

/**
 * Convert unknown error to NexusError
 */
export function toNexusError(error: unknown): NexusError {
  if (error instanceof NexusError) {
    return error;
  }

  if (error instanceof Error) {
    return new NexusError(error.message, ErrorCodes.INTERNAL_ERROR, {
      originalError: error.name,
      stack: error.stack,
    });
  }

  return new NexusError(String(error), ErrorCodes.INTERNAL_ERROR);
}

/**
 * Check if error is operational (expected) vs programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof NexusError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: Error): {
  error: true;
  code: string;
  message: string;
  details?: any;
} {
  if (error instanceof NexusError) {
    return {
      error: true as const,
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  return {
    error: true as const,
    code: ErrorCodes.INTERNAL_ERROR,
    message: error.message || "An unexpected error occurred",
  };
}

export default {
  NexusError,
  ValidationError,
  NotFoundError,
  AgentError,
  RateLimitError,
  ExternalServiceError,
  ErrorCodes,
  withErrorHandling,
  toNexusError,
  isOperationalError,
  formatErrorResponse,
};

