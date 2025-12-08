/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - CONSENT UTILITIES
 * ============================================================================
 * 
 * Consent management helpers and UI hooks.
 * 
 * @module nexus/assistant-v3/utils/consent
 * @version 3.0.0
 */

import { ConsentStatus } from '../core/types';

// ============================================================================
// CONSENT STORAGE KEY
// ============================================================================

const CONSENT_STORAGE_KEY = 'nexus-assistant-consent';

// ============================================================================
// CONSENT HELPERS
// ============================================================================

/**
 * Get consent status from storage
 */
export function getStoredConsent(userId: string): ConsentStatus | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(`${CONSENT_STORAGE_KEY}-${userId}`);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Store consent status
 */
export function storeConsent(consent: ConsentStatus): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(
      `${CONSENT_STORAGE_KEY}-${consent.userId}`,
      JSON.stringify(consent)
    );
  } catch (error) {
    console.error('[Consent] Failed to store consent:', error);
  }
}

/**
 * Clear consent status
 */
export function clearConsent(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${CONSENT_STORAGE_KEY}-${userId}`);
}

// ============================================================================
// CONSENT PROMPTS
// ============================================================================

export interface ConsentPrompt {
  id: string;
  title: string;
  description: string;
  required: boolean;
  defaultValue: boolean;
}

export const CONSENT_PROMPTS: ConsentPrompt[] = [
  {
    id: 'memoryConsent',
    title: 'Memory & Learning',
    description: 'Allow the assistant to remember our conversations to provide better, more personalized help. Your data is stored securely and you can delete it anytime.',
    required: false,
    defaultValue: false,
  },
  {
    id: 'analyticsConsent',
    title: 'Usage Analytics',
    description: 'Help improve the assistant by sharing anonymous usage data. No personal information is collected.',
    required: false,
    defaultValue: false,
  },
  {
    id: 'personalizationConsent',
    title: 'Personalization',
    description: 'Allow the assistant to adapt its responses based on your preferences and usage patterns.',
    required: false,
    defaultValue: false,
  },
];

// ============================================================================
// CONSENT VALIDATION
// ============================================================================

/**
 * Check if consent is valid (not expired, etc.)
 */
export function isConsentValid(consent: ConsentStatus | null): boolean {
  if (!consent) return false;

  // Check if consent was updated recently (within 1 year)
  const oneYear = 365 * 24 * 60 * 60 * 1000;
  if (Date.now() - consent.updatedAt > oneYear) {
    return false;
  }

  return true;
}

/**
 * Get consent summary
 */
export function getConsentSummary(consent: ConsentStatus | null): string {
  if (!consent) return 'No consent given';

  const enabled: string[] = [];
  if (consent.memoryConsent) enabled.push('Memory');
  if (consent.analyticsConsent) enabled.push('Analytics');
  if (consent.personalizationConsent) enabled.push('Personalization');

  if (enabled.length === 0) return 'No features enabled';
  return `Enabled: ${enabled.join(', ')}`;
}

// ============================================================================
// CONSENT BUILDER
// ============================================================================

export class ConsentBuilder {
  private consent: ConsentStatus;

  constructor(userId: string) {
    this.consent = {
      userId,
      memoryConsent: false,
      analyticsConsent: false,
      personalizationConsent: false,
      updatedAt: Date.now(),
    };
  }

  setMemory(value: boolean): this {
    this.consent.memoryConsent = value;
    return this;
  }

  setAnalytics(value: boolean): this {
    this.consent.analyticsConsent = value;
    return this;
  }

  setPersonalization(value: boolean): this {
    this.consent.personalizationConsent = value;
    return this;
  }

  setAll(value: boolean): this {
    this.consent.memoryConsent = value;
    this.consent.analyticsConsent = value;
    this.consent.personalizationConsent = value;
    return this;
  }

  build(): ConsentStatus {
    this.consent.updatedAt = Date.now();
    return { ...this.consent };
  }

  buildAndStore(): ConsentStatus {
    const consent = this.build();
    storeConsent(consent);
    return consent;
  }
}

// ============================================================================
// SENSITIVE CONTENT DETECTION
// ============================================================================

/**
 * Check if text contains potentially sensitive content
 * that requires explicit consent before storing
 */
export function containsSensitiveContent(text: string): {
  sensitive: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  const lower = text.toLowerCase();

  // Health-related
  if (/\b(health|medical|doctor|diagnosis|symptom|medicine|prescription)\b/.test(lower)) {
    reasons.push('health-related');
  }

  // Financial
  if (/\b(salary|income|debt|bank|credit|loan|investment)\b/.test(lower)) {
    reasons.push('financial');
  }

  // Personal identifiers
  if (/\b(address|phone|email|ssn|passport|license)\b/.test(lower)) {
    reasons.push('personal-identifiers');
  }

  // Relationships
  if (/\b(relationship|divorce|breakup|therapy|counseling)\b/.test(lower)) {
    reasons.push('personal-relationships');
  }

  return {
    sensitive: reasons.length > 0,
    reasons,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  getStoredConsent,
  storeConsent,
  clearConsent,
  CONSENT_PROMPTS,
  isConsentValid,
  getConsentSummary,
  ConsentBuilder,
  containsSensitiveContent,
};

