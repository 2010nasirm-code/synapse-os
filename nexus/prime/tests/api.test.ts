/**
 * ============================================================================
 * NEXUS PRIME - API TESTS
 * ============================================================================
 * 
 * Tests for NEXUS PRIME API handlers.
 * 
 * @module nexus/prime/tests/api
 */

import { handleNexusPrimeRequest } from '../api/nexusPrime';
import { handleRunAgentRequest } from '../api/runAgent';
import { handleApplyActionRequest } from '../api/applyAction';
import { initializeAgents } from '../agents';

// ============================================================================
// SETUP
// ============================================================================

beforeAll(() => {
  initializeAgents();
});

// ============================================================================
// NEXUS PRIME API TESTS
// ============================================================================

describe('NEXUS PRIME API', () => {
  test('should handle valid request', async () => {
    const response = await handleNexusPrimeRequest({
      prompt: 'Hello, NEXUS',
      userId: 'test-user',
    });

    expect(response.success).toBe(true);
    expect(response.answer).toBeDefined();
    expect(response.requestId).toBeDefined();
  });

  test('should reject empty prompt', async () => {
    const response = await handleNexusPrimeRequest({
      prompt: '',
      userId: 'test-user',
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain('Invalid');
  });

  test('should include provenance', async () => {
    const response = await handleNexusPrimeRequest({
      prompt: 'analyze my data',
      userId: 'test-user',
    });

    expect(response.success).toBe(true);
    expect(response.provenance).toBeDefined();
    expect(Array.isArray(response.provenance)).toBe(true);
  });

  test('should respect rate limits', async () => {
    // Make many requests quickly
    const promises = Array(100).fill(null).map(() =>
      handleNexusPrimeRequest({
        prompt: 'test',
        userId: 'rate-limit-test-user',
      })
    );

    const responses = await Promise.all(promises);
    
    // Some should be rate limited
    const rateLimited = responses.filter(r => !r.success && r.error?.includes('Rate limit'));
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// RUN AGENT API TESTS
// ============================================================================

describe('Run Agent API', () => {
  test('should run specific agent', async () => {
    const response = await handleRunAgentRequest({
      agentId: 'insight',
      prompt: 'analyze trends',
      userId: 'test-user',
    });

    expect(response.success).toBe(true);
    expect(response.result?.agentId).toBe('insight');
  });

  test('should fail for unknown agent', async () => {
    const response = await handleRunAgentRequest({
      agentId: 'nonexistent' as any,
      prompt: 'test',
      userId: 'test-user',
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain('not found');
  });

  test('should include processing time', async () => {
    const response = await handleRunAgentRequest({
      agentId: 'ui',
      prompt: 'go to dashboard',
      userId: 'test-user',
    });

    expect(response.processingTime).toBeGreaterThan(0);
  });
});

// ============================================================================
// APPLY ACTION API TESTS
// ============================================================================

describe('Apply Action API', () => {
  test('should require confirmation for dangerous actions', async () => {
    const response = await handleApplyActionRequest({
      action: {
        id: 'test-action',
        type: 'delete',
        title: 'Delete Item',
        description: 'Delete test item',
        payload: { id: 'item-123' },
        source: 'test',
        requiresConfirmation: true,
        safetyLevel: 'high',
        createdAt: Date.now(),
      },
      userId: 'test-user',
    });

    expect(response.success).toBe(true);
    expect(response.needsConfirmation).toBe(true);
    expect(response.confirmationToken).toBeDefined();
  });

  test('should auto-apply safe actions', async () => {
    const response = await handleApplyActionRequest({
      action: {
        id: 'test-nav',
        type: 'navigate',
        title: 'Navigate',
        description: 'Go to dashboard',
        payload: { path: '/dashboard' },
        source: 'test',
        requiresConfirmation: false,
        safetyLevel: 'low',
        createdAt: Date.now(),
      },
      userId: 'test-user',
    });

    expect(response.success).toBe(true);
    expect(response.needsConfirmation).toBeFalsy();
  });

  test('should confirm with valid token', async () => {
    // First, request confirmation
    const request = await handleApplyActionRequest({
      action: {
        id: 'test-create',
        type: 'create',
        title: 'Create Item',
        description: 'Create test item',
        payload: { type: 'tracker', data: {} },
        source: 'test',
        requiresConfirmation: true,
        safetyLevel: 'medium',
        createdAt: Date.now(),
      },
      userId: 'test-user',
    });

    expect(request.confirmationToken).toBeDefined();

    // Then confirm
    const confirm = await handleApplyActionRequest({
      confirmationToken: request.confirmationToken,
      userId: 'test-user',
    });

    expect(confirm.success).toBe(true);
    expect(confirm.action).toBeDefined();
  });

  test('should reject invalid token', async () => {
    const response = await handleApplyActionRequest({
      confirmationToken: 'invalid-token',
      userId: 'test-user',
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain('Invalid');
  });

  test('should reject without action or token', async () => {
    const response = await handleApplyActionRequest({
      userId: 'test-user',
    });

    expect(response.success).toBe(false);
    expect(response.error).toContain('No action');
  });
});

// ============================================================================
// RESPONSE FORMAT TESTS
// ============================================================================

describe('API Response Format', () => {
  test('NEXUS PRIME response has required fields', async () => {
    const response = await handleNexusPrimeRequest({
      prompt: 'test',
      userId: 'test-user',
    });

    expect(response).toMatchObject({
      success: expect.any(Boolean),
      requestId: expect.any(String),
      answer: expect.any(String),
      insights: expect.any(Array),
      actionDrafts: expect.any(Array),
      agentsUsed: expect.any(Array),
      provenance: expect.any(Array),
      confidence: expect.any(Number),
      processingTime: expect.any(Number),
    });
  });

  test('Run Agent response has required fields', async () => {
    const response = await handleRunAgentRequest({
      agentId: 'orchestrator',
      prompt: 'test',
      userId: 'test-user',
    });

    expect(response).toMatchObject({
      success: expect.any(Boolean),
      processingTime: expect.any(Number),
    });
  });

  test('Apply Action response has required fields', async () => {
    const response = await handleApplyActionRequest({
      action: {
        id: 'test',
        type: 'log',
        title: 'Log',
        description: 'Test log',
        payload: { message: 'test' },
        source: 'test',
        requiresConfirmation: false,
        safetyLevel: 'low',
        createdAt: Date.now(),
      },
      userId: 'test-user',
    });

    expect(response).toMatchObject({
      success: expect.any(Boolean),
      provenance: expect.any(Object),
    });
  });
});

