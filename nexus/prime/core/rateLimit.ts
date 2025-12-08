/**
 * ============================================================================
 * NEXUS PRIME - RATE LIMITING
 * ============================================================================
 * 
 * Implements rate limiting for all NEXUS PRIME operations.
 * 
 * @module nexus/prime/core/rateLimit
 * @version 1.0.0
 */

import { RateLimitInfo, AgentType } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Default rate limit configuration
 */
const DEFAULT_CONFIG = {
  window: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'), // 1 minute
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '30'),
};

/**
 * Per-agent rate limits
 */
const AGENT_LIMITS: Record<AgentType, number> = {
  orchestrator: 60,
  insight: 30,
  builder: 20,
  repair: 10,
  ui: 100,
  automation: 20,
  memory: 50,
  evolution: 10,
};

/**
 * Global rate limit (across all agents)
 */
const GLOBAL_LIMIT = 100;

// ============================================================================
// RATE LIMITER CLASS
// ============================================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private static instance: RateLimiter;
  private limits = new Map<string, RateLimitEntry>();
  private window: number;
  private maxRequests: number;

  private constructor() {
    this.window = DEFAULT_CONFIG.window;
    this.maxRequests = DEFAULT_CONFIG.maxRequests;

    // Cleanup expired entries periodically
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), this.window);
    }
  }

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string, limit?: number): boolean {
    const maxLimit = limit || this.maxRequests;
    const entry = this.limits.get(key);
    const now = Date.now();

    if (!entry || now >= entry.resetAt) {
      // Reset or create new entry
      this.limits.set(key, {
        count: 1,
        resetAt: now + this.window,
      });
      return true;
    }

    if (entry.count >= maxLimit) {
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Get rate limit info for a key
   */
  getInfo(key: string, limit?: number): RateLimitInfo {
    const maxLimit = limit || this.maxRequests;
    const entry = this.limits.get(key);
    const now = Date.now();

    if (!entry || now >= entry.resetAt) {
      return {
        remaining: maxLimit,
        resetAt: now + this.window,
        limit: maxLimit,
        window: this.window,
      };
    }

    return {
      remaining: Math.max(0, maxLimit - entry.count),
      resetAt: entry.resetAt,
      limit: maxLimit,
      window: this.window,
    };
  }

  /**
   * Record a request (increment counter)
   */
  record(key: string): void {
    const entry = this.limits.get(key);
    const now = Date.now();

    if (!entry || now >= entry.resetAt) {
      this.limits.set(key, {
        count: 1,
        resetAt: now + this.window,
      });
    } else {
      entry.count++;
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.limits.delete(key);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits) {
      if (now >= entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

// ============================================================================
// RATE LIMIT HELPERS
// ============================================================================

/**
 * Check user rate limit
 */
export function checkUserRateLimit(userId: string): RateLimitInfo {
  const limiter = RateLimiter.getInstance();
  const key = `user:${userId}`;
  return limiter.getInfo(key);
}

/**
 * Check agent rate limit
 */
export function checkAgentRateLimit(agentId: AgentType): RateLimitInfo {
  const limiter = RateLimiter.getInstance();
  const key = `agent:${agentId}`;
  const limit = AGENT_LIMITS[agentId] || DEFAULT_CONFIG.maxRequests;
  return limiter.getInfo(key, limit);
}

/**
 * Check global rate limit
 */
export function checkGlobalRateLimit(): RateLimitInfo {
  const limiter = RateLimiter.getInstance();
  return limiter.getInfo('global', GLOBAL_LIMIT);
}

/**
 * Check if request is allowed (all limits)
 */
export function isRequestAllowed(userId: string, agentId?: AgentType): {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
} {
  const limiter = RateLimiter.getInstance();
  const now = Date.now();

  // Check global limit
  if (!limiter.isAllowed('global', GLOBAL_LIMIT)) {
    const info = limiter.getInfo('global', GLOBAL_LIMIT);
    return {
      allowed: false,
      reason: 'Global rate limit exceeded',
      retryAfter: info.resetAt - now,
    };
  }

  // Check user limit
  if (!limiter.isAllowed(`user:${userId}`)) {
    const info = limiter.getInfo(`user:${userId}`);
    return {
      allowed: false,
      reason: 'User rate limit exceeded',
      retryAfter: info.resetAt - now,
    };
  }

  // Check agent limit if specified
  if (agentId) {
    const limit = AGENT_LIMITS[agentId] || DEFAULT_CONFIG.maxRequests;
    if (!limiter.isAllowed(`agent:${agentId}`, limit)) {
      const info = limiter.getInfo(`agent:${agentId}`, limit);
      return {
        allowed: false,
        reason: `Agent ${agentId} rate limit exceeded`,
        retryAfter: info.resetAt - now,
      };
    }
  }

  return { allowed: true };
}

/**
 * Record a request for rate limiting
 */
export function recordRequest(userId: string, agentId?: AgentType): void {
  const limiter = RateLimiter.getInstance();
  
  limiter.record('global');
  limiter.record(`user:${userId}`);
  
  if (agentId) {
    limiter.record(`agent:${agentId}`);
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(userId: string): Record<string, string> {
  const info = checkUserRateLimit(userId);
  
  return {
    'X-RateLimit-Limit': String(info.limit),
    'X-RateLimit-Remaining': String(info.remaining),
    'X-RateLimit-Reset': String(Math.floor(info.resetAt / 1000)),
  };
}

export default RateLimiter;

