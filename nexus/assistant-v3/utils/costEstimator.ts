/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - COST ESTIMATOR
 * ============================================================================
 * 
 * Estimates API costs for LLM and embedding calls.
 * 
 * @module nexus/assistant-v3/utils/costEstimator
 * @version 3.0.0
 */

// ============================================================================
// PRICING (per 1K tokens, approximate)
// ============================================================================

interface ModelPricing {
  input: number;
  output: number;
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'text-embedding-3-small': { input: 0.00002, output: 0 },
  'text-embedding-3-large': { input: 0.00013, output: 0 },
};

const DEFAULT_MODEL = 'gpt-4o-mini';

// ============================================================================
// COST ESTIMATION
// ============================================================================

export interface CostEstimateInput {
  inputTokens: number;
  outputTokens: number;
  model?: string;
  embeddingTokens?: number;
  embeddingModel?: string;
}

export interface CostEstimate {
  inputCost: number;
  outputCost: number;
  embeddingCost: number;
  totalCost: number;
  model: string;
  breakdown: string;
}

/**
 * Estimate cost for an API call
 */
export function estimateCost(input: CostEstimateInput): CostEstimate {
  const model = input.model || DEFAULT_MODEL;
  const pricing = MODEL_PRICING[model] || MODEL_PRICING[DEFAULT_MODEL];

  const inputCost = (input.inputTokens / 1000) * pricing.input;
  const outputCost = (input.outputTokens / 1000) * pricing.output;

  let embeddingCost = 0;
  if (input.embeddingTokens) {
    const embModel = input.embeddingModel || 'text-embedding-3-small';
    const embPricing = MODEL_PRICING[embModel] || MODEL_PRICING['text-embedding-3-small'];
    embeddingCost = (input.embeddingTokens / 1000) * embPricing.input;
  }

  const totalCost = inputCost + outputCost + embeddingCost;

  return {
    inputCost,
    outputCost,
    embeddingCost,
    totalCost,
    model,
    breakdown: `Input: $${inputCost.toFixed(6)}, Output: $${outputCost.toFixed(6)}, Embedding: $${embeddingCost.toFixed(6)}`,
  };
}

/**
 * Estimate tokens from text (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

// ============================================================================
// COST TRACKING
// ============================================================================

interface CostRecord {
  timestamp: number;
  cost: CostEstimate;
  requestId?: string;
}

const costHistory: CostRecord[] = [];
const MAX_HISTORY = 1000;

/**
 * Record a cost
 */
export function recordCost(cost: CostEstimate, requestId?: string): void {
  costHistory.push({
    timestamp: Date.now(),
    cost,
    requestId,
  });

  if (costHistory.length > MAX_HISTORY) {
    costHistory.shift();
  }
}

/**
 * Get total costs for a time period
 */
export function getTotalCosts(since?: number): {
  total: number;
  byModel: Record<string, number>;
  count: number;
} {
  const filtered = since 
    ? costHistory.filter(r => r.timestamp >= since)
    : costHistory;

  const byModel: Record<string, number> = {};
  let total = 0;

  for (const record of filtered) {
    total += record.cost.totalCost;
    byModel[record.cost.model] = (byModel[record.cost.model] || 0) + record.cost.totalCost;
  }

  return {
    total,
    byModel,
    count: filtered.length,
  };
}

/**
 * Get cost history
 */
export function getCostHistory(limit: number = 100): CostRecord[] {
  return costHistory.slice(-limit).reverse();
}

/**
 * Clear cost history
 */
export function clearCostHistory(): void {
  costHistory.length = 0;
}

// ============================================================================
// BUDGET MANAGEMENT
// ============================================================================

let dailyBudget: number | null = null;
let monthlyBudget: number | null = null;

/**
 * Set budget limits
 */
export function setBudget(options: {
  daily?: number;
  monthly?: number;
}): void {
  if (options.daily !== undefined) dailyBudget = options.daily;
  if (options.monthly !== undefined) monthlyBudget = options.monthly;
}

/**
 * Check if within budget
 */
export function checkBudget(): {
  withinDaily: boolean;
  withinMonthly: boolean;
  dailyUsed: number;
  monthlyUsed: number;
  dailyLimit: number | null;
  monthlyLimit: number | null;
} {
  const now = Date.now();
  const dayStart = new Date().setHours(0, 0, 0, 0);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

  const dailyTotal = getTotalCosts(dayStart).total;
  const monthlyTotal = getTotalCosts(monthStart).total;

  return {
    withinDaily: dailyBudget === null || dailyTotal < dailyBudget,
    withinMonthly: monthlyBudget === null || monthlyTotal < monthlyBudget,
    dailyUsed: dailyTotal,
    monthlyUsed: monthlyTotal,
    dailyLimit: dailyBudget,
    monthlyLimit: monthlyBudget,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  estimateCost,
  estimateTokens,
  recordCost,
  getTotalCosts,
  getCostHistory,
  clearCostHistory,
  setBudget,
  checkBudget,
};

