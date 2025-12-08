/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - PROVENANCE TRACKING
 * ============================================================================
 * 
 * Tracks agent execution chains and maintains audit logs.
 * 
 * @module nexus/assistant-v3/core/provenance
 * @version 3.0.0
 */

import { Provenance } from './types';

// ============================================================================
// PROVENANCE STORE
// ============================================================================

interface ProvenanceEntry {
  requestId: string;
  chain: Provenance[];
  createdAt: number;
}

// In-memory store (would be replaced with persistent storage in production)
const provenanceStore: ProvenanceEntry[] = [];
const MAX_ENTRIES = 1000;

// ============================================================================
// PROVENANCE BUILDER
// ============================================================================

export class ProvenanceBuilder {
  private chain: Provenance[] = [];
  private requestId: string;

  constructor(requestId: string) {
    this.requestId = requestId;
  }

  /**
   * Add a provenance entry
   */
  add(
    agent: string,
    inputs: string[],
    options?: {
      confidence?: number;
      operation?: string;
      durationMs?: number;
    }
  ): this {
    this.chain.push({
      agent,
      inputs: this.sanitizeInputs(inputs),
      confidence: options?.confidence,
      operation: options?.operation,
      durationMs: options?.durationMs,
      timestamp: new Date().toISOString(),
    });
    return this;
  }

  /**
   * Sanitize inputs for logging (remove sensitive data)
   */
  private sanitizeInputs(inputs: string[]): string[] {
    return inputs.map(input => {
      // Truncate long inputs
      if (input.length > 200) {
        return input.slice(0, 200) + '...';
      }
      // Redact potential sensitive data
      return input
        .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]')
        .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]')
        .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[card]');
    });
  }

  /**
   * Get the chain
   */
  getChain(): Provenance[] {
    return [...this.chain];
  }

  /**
   * Save to store
   */
  save(): void {
    // Remove oldest entries if at capacity
    while (provenanceStore.length >= MAX_ENTRIES) {
      provenanceStore.shift();
    }

    provenanceStore.push({
      requestId: this.requestId,
      chain: this.chain,
      createdAt: Date.now(),
    });
  }
}

// ============================================================================
// PROVENANCE MANAGER
// ============================================================================

export class ProvenanceManager {
  /**
   * Create a new provenance builder
   */
  static create(requestId: string): ProvenanceBuilder {
    return new ProvenanceBuilder(requestId);
  }

  /**
   * Get provenance for a request
   */
  static get(requestId: string): Provenance[] | undefined {
    const entry = provenanceStore.find(e => e.requestId === requestId);
    return entry?.chain;
  }

  /**
   * Get recent provenance entries
   */
  static getRecent(limit: number = 50): ProvenanceEntry[] {
    return provenanceStore.slice(-limit).reverse();
  }

  /**
   * Search provenance by agent
   */
  static searchByAgent(agent: string, limit: number = 20): ProvenanceEntry[] {
    return provenanceStore
      .filter(e => e.chain.some(p => p.agent === agent))
      .slice(-limit)
      .reverse();
  }

  /**
   * Get statistics
   */
  static getStats(): {
    totalEntries: number;
    agentUsage: Record<string, number>;
    averageChainLength: number;
  } {
    const agentUsage: Record<string, number> = {};
    let totalChainLength = 0;

    for (const entry of provenanceStore) {
      totalChainLength += entry.chain.length;
      for (const prov of entry.chain) {
        agentUsage[prov.agent] = (agentUsage[prov.agent] || 0) + 1;
      }
    }

    return {
      totalEntries: provenanceStore.length,
      agentUsage,
      averageChainLength: provenanceStore.length > 0 
        ? totalChainLength / provenanceStore.length 
        : 0,
    };
  }

  /**
   * Clear old entries
   */
  static cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    const initialLength = provenanceStore.length;
    
    let i = 0;
    while (i < provenanceStore.length) {
      if (provenanceStore[i].createdAt < cutoff) {
        provenanceStore.splice(i, 1);
      } else {
        i++;
      }
    }

    return initialLength - provenanceStore.length;
  }

  /**
   * Export for debugging (admin only)
   */
  static export(): string {
    return JSON.stringify(provenanceStore, null, 2);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create simple provenance entry
 */
export function createProvenance(
  agent: string,
  inputs: string[],
  confidence?: number
): Provenance {
  return {
    agent,
    inputs,
    confidence,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Merge multiple provenance chains
 */
export function mergeProvenance(...chains: Provenance[][]): Provenance[] {
  const merged: Provenance[] = [];
  
  for (const chain of chains) {
    for (const prov of chain) {
      // Avoid duplicates based on agent + timestamp
      const exists = merged.some(
        p => p.agent === prov.agent && p.timestamp === prov.timestamp
      );
      if (!exists) {
        merged.push(prov);
      }
    }
  }

  // Sort by timestamp
  return merged.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

export default ProvenanceManager;

