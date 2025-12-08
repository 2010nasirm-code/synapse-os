/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - SAFETY MODULE
 * ============================================================================
 * 
 * Content filtering, consent checks, and crisis detection.
 * 
 * @module nexus/assistant-v3/core/safety
 * @version 3.0.0
 */

import {
  AIRequest,
  ActionDraft,
  CrisisCheck,
  CRISIS_RESOURCES,
  ConsentStatus,
} from './types';

// ============================================================================
// BLOCKED CONTENT PATTERNS
// ============================================================================

const BLOCKED_PATTERNS = {
  // Self-harm related
  selfHarm: [
    /\b(kill|hurt|harm)\s*(myself|me)\b/i,
    /\bsuicid(e|al)\b/i,
    /\bself[- ]?harm\b/i,
    /\bwant\s+to\s+die\b/i,
    /\bend\s+(my|it)\s*(life|all)\b/i,
    /\bcut(ting)?\s+myself\b/i,
  ],
  
  // Violence
  violence: [
    /\b(how\s+to\s+)?(make|build|create)\s+(a\s+)?(bomb|weapon|explosive)\b/i,
    /\b(hurt|kill|attack)\s+(someone|people|others)\b/i,
    /\bmass\s+(shooting|violence|murder)\b/i,
  ],
  
  // Inappropriate for minors
  inappropriate: [
    /\b(drugs?|cocaine|heroin|meth)\s+(use|buy|sell|make)\b/i,
    /\balcohol\s+(buy|purchase|get)\s+(for\s+)?(minor|teen|kid|child)\b/i,
    /\bpornograph(y|ic)\b/i,
  ],
  
  // Personal data extraction
  personalData: [
    /\b(social\s+security|ssn)\s*(number)?\b/i,
    /\bcredit\s+card\s+(number|info)\b/i,
    /\bpassword\s+is\b/i,
    /\bpin\s+(code|number)\s+is\b/i,
  ],
};

// ============================================================================
// SAFETY CHECKER
// ============================================================================

export class SafetyChecker {
  /**
   * Check content for safety issues
   */
  static checkContent(text: string): {
    safe: boolean;
    issues: string[];
    crisisCheck: CrisisCheck;
  } {
    const issues: string[] = [];
    let crisisDetected = false;
    let crisisType: CrisisCheck['type'];

    // Check self-harm patterns
    for (const pattern of BLOCKED_PATTERNS.selfHarm) {
      if (pattern.test(text)) {
        crisisDetected = true;
        crisisType = 'self_harm';
        issues.push('Self-harm related content detected');
        break;
      }
    }

    // Check violence patterns
    for (const pattern of BLOCKED_PATTERNS.violence) {
      if (pattern.test(text)) {
        issues.push('Violence-related content detected');
        if (!crisisType) crisisType = 'violence';
      }
    }

    // Check inappropriate patterns
    for (const pattern of BLOCKED_PATTERNS.inappropriate) {
      if (pattern.test(text)) {
        issues.push('Age-inappropriate content detected');
      }
    }

    // Check personal data patterns
    for (const pattern of BLOCKED_PATTERNS.personalData) {
      if (pattern.test(text)) {
        issues.push('Personal data detected - will not be stored');
      }
    }

    return {
      safe: issues.length === 0,
      issues,
      crisisCheck: {
        detected: crisisDetected,
        type: crisisType,
        resources: crisisDetected ? CRISIS_RESOURCES : undefined,
      },
    };
  }

  /**
   * Sanitize content before processing
   */
  static sanitize(text: string): string {
    // Remove potential injection patterns
    let sanitized = text
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();

    // Limit length
    if (sanitized.length > 10000) {
      sanitized = sanitized.slice(0, 10000) + '...';
    }

    return sanitized;
  }

  /**
   * Check if action is safe to execute
   */
  static checkAction(action: ActionDraft): {
    safe: boolean;
    requiresConfirmation: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
    let requiresConfirmation = action.requiresConfirmation;

    // Actions that always require confirmation
    const highRiskActions = [
      'delete_tracker',
      'delete_item',
      'patch_code',
    ];

    if (highRiskActions.includes(action.type)) {
      requiresConfirmation = true;
      warnings.push('This action will modify or delete data');
    }

    // Check payload for sensitive content
    const payloadStr = JSON.stringify(action.payload);
    const contentCheck = this.checkContent(payloadStr);
    
    if (!contentCheck.safe) {
      warnings.push(...contentCheck.issues);
    }

    return {
      safe: contentCheck.safe,
      requiresConfirmation,
      warnings,
    };
  }

  /**
   * Check if request should be processed
   */
  static validateRequest(request: AIRequest): {
    valid: boolean;
    reason?: string;
    crisisCheck?: CrisisCheck;
  } {
    // Check query content
    const contentCheck = this.checkContent(request.query);

    // If crisis detected, we still process but with special handling
    if (contentCheck.crisisCheck.detected) {
      return {
        valid: true, // Allow request but will respond with crisis resources
        crisisCheck: contentCheck.crisisCheck,
      };
    }

    // Block violent/inappropriate content
    if (contentCheck.issues.some(i => 
      i.includes('Violence') || i.includes('Age-inappropriate')
    )) {
      return {
        valid: false,
        reason: 'This request cannot be processed due to safety concerns.',
      };
    }

    return { valid: true };
  }

  /**
   * Get crisis response
   */
  static getCrisisResponse(): string {
    return `I noticed you might be going through a difficult time. I want you to know that help is available.

**If you're in crisis, please reach out:**

📞 **988 Suicide & Crisis Lifeline**: Call or text 988 (US)
💬 **Crisis Text Line**: Text HOME to 741741
🌐 **International Resources**: https://www.iasp.info/resources/Crisis_Centres/

These services are free, confidential, and available 24/7. You don't have to face this alone.

I'm here to help with other questions whenever you're ready. 💙`;
  }
}

// ============================================================================
// CONSENT MANAGER
// ============================================================================

const consentCache = new Map<string, ConsentStatus>();

export class ConsentManager {
  /**
   * Get consent status for user
   */
  static getConsent(userId: string): ConsentStatus {
    // Check cache
    if (consentCache.has(userId)) {
      return consentCache.get(userId)!;
    }

    // Check localStorage (browser) or return default
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`nexus-consent-${userId}`);
      if (stored) {
        try {
          const consent = JSON.parse(stored);
          consentCache.set(userId, consent);
          return consent;
        } catch (e) {}
      }
    }

    // Default: no consent
    return {
      userId,
      memoryConsent: false,
      analyticsConsent: false,
      personalizationConsent: false,
      updatedAt: Date.now(),
    };
  }

  /**
   * Update consent status
   */
  static setConsent(userId: string, consent: Partial<ConsentStatus>): void {
    const current = this.getConsent(userId);
    const updated: ConsentStatus = {
      ...current,
      ...consent,
      updatedAt: Date.now(),
    };

    consentCache.set(userId, updated);

    // Persist
    if (typeof window !== 'undefined') {
      localStorage.setItem(`nexus-consent-${userId}`, JSON.stringify(updated));
    }
  }

  /**
   * Check if memory storage is allowed
   */
  static canStoreMemory(userId: string): boolean {
    const consent = this.getConsent(userId);
    return consent.memoryConsent;
  }

  /**
   * Check if personalization is allowed
   */
  static canPersonalize(userId: string): boolean {
    const consent = this.getConsent(userId);
    return consent.personalizationConsent;
  }

  /**
   * Clear all user data (GDPR-style)
   */
  static clearUserData(userId: string): void {
    consentCache.delete(userId);
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`nexus-consent-${userId}`);
    }
  }
}

// ============================================================================
// CONTENT FILTER
// ============================================================================

export class ContentFilter {
  /**
   * Filter search results for safety
   */
  static filterSearchResults(results: any[]): any[] {
    return results.filter(result => {
      const text = `${result.title || ''} ${result.snippet || ''}`;
      const check = SafetyChecker.checkContent(text);
      return check.safe;
    });
  }

  /**
   * Sanitize response before sending
   */
  static sanitizeResponse(response: string): string {
    // Remove any accidentally included sensitive patterns
    let sanitized = response;

    // Remove potential credentials
    sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email redacted]');
    sanitized = sanitized.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone redacted]');
    sanitized = sanitized.replace(/\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, '[SSN redacted]');
    sanitized = sanitized.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[card redacted]');

    return sanitized;
  }
}

export default SafetyChecker;

