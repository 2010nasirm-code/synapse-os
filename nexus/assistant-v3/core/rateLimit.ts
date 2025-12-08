/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - RATE LIMITING
 * ============================================================================
 * 
 * Rate limiting middleware for API endpoints.
 * 
 * @module nexus/assistant-v3/core/rateLimit
 * @version 3.0.0
 */

import { RateLimitConfig, RateLimitStatus } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '30', 10), // 30 requests
};

// ============================================================================
// STORAGE
// ============================================================================

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, entry] of entries) {
    if (now - entry.windowStart > DEFAULT_CONFIG.windowMs * 2) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Cleanup every minute

// ============================================================================
// RATE LIMITER
// ============================================================================

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if request is allowed
   */
  check(identifier: string): RateLimitStatus {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    // No previous requests
    if (!entry) {
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowMs,
      };
    }

    // Window expired, reset
    if (now - entry.windowStart >= this.config.windowMs) {
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetAt: now + this.config.windowMs,
      };
    }

    // Check if within limit
    const remaining = this.config.maxRequests - entry.count - 1;
    const resetAt = entry.windowStart + this.config.windowMs;

    if (remaining < 0) {
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        reason: `Rate limit exceeded. Try again in ${Math.ceil((resetAt - now) / 1000)} seconds.`,
      };
    }

    return {
      allowed: true,
      remaining,
      resetAt,
    };
  }

  /**
   * Record a request
   */
  record(identifier: string): void {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    if (!entry || now - entry.windowStart >= this.config.windowMs) {
      // New window
      rateLimitStore.set(identifier, {
        count: 1,
        windowStart: now,
      });
    } else {
      // Increment count
      entry.count++;
      rateLimitStore.set(identifier, entry);
    }
  }

  /**
   * Get rate limit headers
   */
  getHeaders(identifier: string): Record<string, string> {
    const status = this.check(identifier);
    return {
      'X-RateLimit-Limit': String(this.config.maxRequests),
      'X-RateLimit-Remaining': String(Math.max(0, status.remaining)),
      'X-RateLimit-Reset': String(status.resetAt),
    };
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    rateLimitStore.delete(identifier);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let instance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!instance) {
    instance = new RateLimiter();
  }
  return instance;
}

/**
 * Check rate limit for user
 */
export function checkRateLimit(userId: string): RateLimitStatus {
  return getRateLimiter().check(userId);
}

/**
 * Record request for user
 */
export function recordRequest(userId: string): void {
  getRateLimiter().record(userId);
}

/**
 * Middleware function
 */
export function rateLimitMiddleware(
  identifier: string
): { allowed: boolean; headers: Record<string, string>; error?: string } {
  const limiter = getRateLimiter();
  const status = limiter.check(identifier);

  if (status.allowed) {
    limiter.record(identifier);
  }

  return {
    allowed: status.allowed,
    headers: limiter.getHeaders(identifier),
    error: status.reason,
  };
}

export default RateLimiter;

