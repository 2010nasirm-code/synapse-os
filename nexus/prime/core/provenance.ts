/**
 * ============================================================================
 * NEXUS PRIME - PROVENANCE TRACKING
 * ============================================================================
 * 
 * Maintains audit trails for all AI operations.
 * 
 * @module nexus/prime/core/provenance
 * @version 1.0.0
 */

import { ProvenanceRecord, AgentType } from './types';
import { sanitizeOutput } from './safety';

// ============================================================================
// PROVENANCE STORE
// ============================================================================

/**
 * In-memory provenance store
 * TODO: Replace with persistent storage in production
 */
class ProvenanceStore {
  private static instance: ProvenanceStore;
  private records: Map<string, ProvenanceRecord> = new Map();
  private requestIndex: Map<string, string[]> = new Map(); // requestId -> recordIds
  private maxRecords = 10000;

  private constructor() {}

  static getInstance(): ProvenanceStore {
    if (!ProvenanceStore.instance) {
      ProvenanceStore.instance = new ProvenanceStore();
    }
    return ProvenanceStore.instance;
  }

  /**
   * Store a provenance record
   */
  store(record: ProvenanceRecord): void {
    this.records.set(record.id, record);

    // Index by request ID
    const requestRecords = this.requestIndex.get(record.requestId) || [];
    requestRecords.push(record.id);
    this.requestIndex.set(record.requestId, requestRecords);

    // Cleanup if too many records
    if (this.records.size > this.maxRecords) {
      this.cleanup();
    }
  }

  /**
   * Get a record by ID
   */
  get(id: string): ProvenanceRecord | undefined {
    return this.records.get(id);
  }

  /**
   * Get all records for a request
   */
  getByRequest(requestId: string): ProvenanceRecord[] {
    const recordIds = this.requestIndex.get(requestId) || [];
    return recordIds
      .map(id => this.records.get(id))
      .filter((r): r is ProvenanceRecord => r !== undefined);
  }

  /**
   * Get child records
   */
  getChildren(parentId: string): ProvenanceRecord[] {
    const parent = this.records.get(parentId);
    if (!parent?.childIds) return [];
    
    return parent.childIds
      .map(id => this.records.get(id))
      .filter((r): r is ProvenanceRecord => r !== undefined);
  }

  /**
   * Query records
   */
  query(options: {
    agentId?: AgentType;
    operation?: string;
    success?: boolean;
    since?: number;
    limit?: number;
  }): ProvenanceRecord[] {
    let results: ProvenanceRecord[] = Array.from(this.records.values());

    if (options.agentId) {
      results = results.filter(r => r.agentId === options.agentId);
    }

    if (options.operation) {
      results = results.filter(r => r.operation === options.operation);
    }

    if (options.success !== undefined) {
      results = results.filter(r => r.success === options.success);
    }

    if (options.since) {
      results = results.filter(r => r.timestamp >= options.since!);
    }

    // Sort by timestamp descending
    results.sort((a, b) => b.timestamp - a.timestamp);

    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Cleanup old records
   */
  private cleanup(): void {
    const records = Array.from(this.records.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp);

    // Keep only recent records
    const toKeep = records.slice(0, this.maxRecords / 2);
    const toRemove = records.slice(this.maxRecords / 2);

    for (const [id] of toRemove) {
      this.records.delete(id);
    }

    // Rebuild request index
    this.requestIndex.clear();
    for (const [id, record] of toKeep) {
      const requestRecords = this.requestIndex.get(record.requestId) || [];
      requestRecords.push(id);
      this.requestIndex.set(record.requestId, requestRecords);
    }
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.records.clear();
    this.requestIndex.clear();
  }
}

// ============================================================================
// PROVENANCE BUILDER
// ============================================================================

export class ProvenanceBuilder {
  private record: Partial<ProvenanceRecord>;
  private startTime: number;

  constructor(requestId: string, agentId: AgentType, operation: string) {
    this.startTime = Date.now();
    this.record = {
      id: `prov-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      requestId,
      agentId,
      operation,
      timestamp: this.startTime,
      success: false,
    };
  }

  /**
   * Set input summary
   */
  withInput(input: unknown): this {
    const sanitized = sanitizeOutput(input);
    this.record.inputSummary = typeof sanitized === 'string' 
      ? sanitized 
      : JSON.stringify(sanitized).slice(0, 500);
    return this;
  }

  /**
   * Set output summary
   */
  withOutput(output: unknown): this {
    const sanitized = sanitizeOutput(output);
    this.record.outputSummary = typeof sanitized === 'string'
      ? sanitized
      : JSON.stringify(sanitized).slice(0, 500);
    return this;
  }

  /**
   * Set parent record
   */
  withParent(parentId: string): this {
    this.record.parentId = parentId;
    return this;
  }

  /**
   * Mark as success
   */
  success(): this {
    this.record.success = true;
    return this;
  }

  /**
   * Mark as failure
   */
  failure(error: string): this {
    this.record.success = false;
    this.record.error = error;
    return this;
  }

  /**
   * Build and store the record
   */
  build(): ProvenanceRecord {
    this.record.durationMs = Date.now() - this.startTime;
    
    const record = this.record as ProvenanceRecord;
    ProvenanceStore.getInstance().store(record);
    
    // Update parent's child IDs
    if (record.parentId) {
      const parent = ProvenanceStore.getInstance().get(record.parentId);
      if (parent) {
        parent.childIds = parent.childIds || [];
        parent.childIds.push(record.id);
      }
    }

    return record;
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a new provenance builder
 */
export function createProvenance(
  requestId: string,
  agentId: AgentType,
  operation: string
): ProvenanceBuilder {
  return new ProvenanceBuilder(requestId, agentId, operation);
}

/**
 * Get provenance for a request
 */
export function getRequestProvenance(requestId: string): ProvenanceRecord[] {
  return ProvenanceStore.getInstance().getByRequest(requestId);
}

/**
 * Get provenance chain (with children)
 */
export function getProvenanceChain(recordId: string): ProvenanceRecord[] {
  const store = ProvenanceStore.getInstance();
  const root = store.get(recordId);
  
  if (!root) return [];

  const chain: ProvenanceRecord[] = [root];
  const children = store.getChildren(recordId);
  
  for (const child of children) {
    chain.push(...getProvenanceChain(child.id));
  }

  return chain;
}

/**
 * Query provenance records
 */
export function queryProvenance(options: {
  agentId?: AgentType;
  operation?: string;
  success?: boolean;
  since?: number;
  limit?: number;
}): ProvenanceRecord[] {
  return ProvenanceStore.getInstance().query(options);
}

/**
 * Get provenance summary for a request
 */
export function getProvenanceSummary(requestId: string): {
  totalOperations: number;
  successCount: number;
  failureCount: number;
  totalDuration: number;
  agentsInvolved: AgentType[];
} {
  const records = getRequestProvenance(requestId);
  
  const agentsSet = new Set<AgentType>();
  let successCount = 0;
  let failureCount = 0;
  let totalDuration = 0;

  for (const record of records) {
    agentsSet.add(record.agentId);
    if (record.success) {
      successCount++;
    } else {
      failureCount++;
    }
    totalDuration += record.durationMs;
  }

  return {
    totalOperations: records.length,
    successCount,
    failureCount,
    totalDuration,
    agentsInvolved: Array.from(agentsSet),
  };
}

export { ProvenanceStore };

