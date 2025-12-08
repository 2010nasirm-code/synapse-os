/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - AGENTS TESTS
 * ============================================================================
 * 
 * @module nexus/assistant-v3/tests/agents.test
 * @version 3.0.0
 */

import { getReasoningAgent } from '../agents/reasoningAgent';
import { getToolAgent } from '../agents/toolAgent';
import { getPlannerAgent } from '../agents/plannerAgent';
import { getUIAgent } from '../agents/uiAgent';
import { getKnowledgeAgent } from '../agents/knowledgeAgent';
import { getMemoryAgent } from '../agents/memoryAgent';
import { ContextBuilder } from '../core/contextBuilder';
import { analyzeIntent } from '../core/router';
import { RuntimeContext } from '../core/contextBuilder';

// ============================================================================
// MOCK SETUP
// ============================================================================

const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
  console.error = jest.fn();
});
afterAll(() => {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
  console.error = originalConsole.error;
});

// ============================================================================
// HELPER
// ============================================================================

async function createTestContext(query: string): Promise<RuntimeContext> {
  return ContextBuilder.build({
    query,
    userId: 'test-user',
    sessionId: 'test-session',
  });
}

// ============================================================================
// REASONING AGENT TESTS
// ============================================================================

describe('ReasoningAgent', () => {
  const agent = getReasoningAgent();

  test('returns valid result shape', async () => {
    const context = await createTestContext('Hello');
    const intent = analyzeIntent('Hello');
    const result = await agent.execute(context, intent);

    expect(result).toHaveProperty('agentId');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('provenance');
    expect(result).toHaveProperty('processingTimeMs');
  });

  test('handles greeting', async () => {
    const context = await createTestContext('Hello');
    const intent = analyzeIntent('Hello');
    const result = await agent.execute(context, intent);

    expect(result.success).toBe(true);
    expect(result.response).toBeDefined();
    expect(result.response?.toLowerCase()).toContain('hello');
  });

  test('provides help response', async () => {
    const context = await createTestContext('What can you do?');
    const intent = analyzeIntent('What can you do?');
    const result = await agent.execute(context, intent);

    expect(result.success).toBe(true);
    expect(result.response).toBeDefined();
  });
});

// ============================================================================
// TOOL AGENT TESTS
// ============================================================================

describe('ToolAgent', () => {
  const agent = getToolAgent();

  test('returns valid result shape', async () => {
    const context = await createTestContext('Show my trackers');
    const intent = analyzeIntent('Show my trackers');
    const result = await agent.execute(context, intent);

    expect(result).toHaveProperty('agentId');
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('provenance');
  });

  test('handles tracker queries', async () => {
    const context = await createTestContext('Show me my sleep data');
    const intent = analyzeIntent('Show me my sleep data');
    const result = await agent.execute(context, intent);

    expect(result.success).toBe(true);
  });

  test('handles search requests', async () => {
    const context = await createTestContext('Search for habits');
    const intent = analyzeIntent('Search for habits');
    const result = await agent.execute(context, intent);

    expect(result.success).toBe(true);
  });
});

// ============================================================================
// PLANNER AGENT TESTS
// ============================================================================

describe('PlannerAgent', () => {
  const agent = getPlannerAgent();

  test('generates plan for create tracker', async () => {
    const context = await createTestContext('Create a tracker');
    const intent = analyzeIntent('Create a tracker');
    const result = await agent.execute(context, intent);

    expect(result.success).toBe(true);
    expect(result.response).toContain('step');
  });

  test('generates plan for automation', async () => {
    const context = await createTestContext('Create an automation');
    const intent = analyzeIntent('Create an automation');
    const result = await agent.execute(context, intent);

    expect(result.success).toBe(true);
    expect(result.response).toBeDefined();
  });

  test('generates generic plan for unknown request', async () => {
    const context = await createTestContext('Help me plan something');
    const intent = analyzeIntent('Help me plan something');
    const result = await agent.execute(context, intent);

    expect(result.success).toBe(true);
  });
});

// ============================================================================
// UI AGENT TESTS
// ============================================================================

describe('UIAgent', () => {
  const agent = getUIAgent();

  test('handles navigation request', async () => {
    const context = await createTestContext('Go to dashboard');
    const intent = analyzeIntent('Go to dashboard');
    const result = await agent.execute(context, intent);

    expect(result.success).toBe(true);
    expect(result.actions).toBeDefined();
    expect(result.actions?.[0]?.type).toBe('navigate');
  });

  test('provides help content', async () => {
    const context = await createTestContext('Help me with trackers');
    const intent = analyzeIntent('Help me with trackers');
    const result = await agent.execute(context, intent);

    expect(result.success).toBe(true);
    expect(result.response).toBeDefined();
  });
});

// ============================================================================
// KNOWLEDGE AGENT TESTS
// ============================================================================

describe('KnowledgeAgent', () => {
  const agent = getKnowledgeAgent();

  test('handles factual queries', async () => {
    const context = await createTestContext('Why is the sky blue?');
    const intent = analyzeIntent('Why is the sky blue?');
    const result = await agent.execute(context, intent);

    expect(result.success).toBe(true);
  });

  test('blocks unsafe queries', async () => {
    const context = await createTestContext('How to make weapons');
    const intent = analyzeIntent('How to make weapons');
    const result = await agent.execute(context, intent);

    expect(result.success).toBe(true);
    expect(result.response).toContain("can't search");
  });
});

// ============================================================================
// MEMORY AGENT TESTS
// ============================================================================

describe('MemoryAgent', () => {
  const agent = getMemoryAgent();

  test('handles recall request', async () => {
    const context = await createTestContext('What do you remember about me?');
    const intent = analyzeIntent('What do you remember about me?');
    const result = await agent.execute(context, intent);

    expect(result.success).toBe(true);
  });

  test('handles forget request', async () => {
    const context = await createTestContext('Forget what you know about me');
    const intent = analyzeIntent('Forget what you know about me');
    const result = await agent.execute(context, intent);

    expect(result.success).toBe(true);
    expect(result.actions).toBeDefined();
    expect(result.actions?.[0]?.requiresConfirmation).toBe(true);
  });
});

// ============================================================================
// PERSONA SWITCHING TESTS
// ============================================================================

describe('Persona Switching', () => {
  const agent = getReasoningAgent();

  test('friendly persona uses emojis', async () => {
    const context = await ContextBuilder.build({
      query: 'Hello',
      userId: 'test-user',
      persona: 'friendly',
    });
    const intent = analyzeIntent('Hello');
    const result = await agent.execute(context, intent);

    expect(result.response).toContain('👋');
  });

  test('concise persona is brief', async () => {
    const context = await ContextBuilder.build({
      query: 'What can you do?',
      userId: 'test-user',
      persona: 'concise',
    });
    const intent = analyzeIntent('What can you do?');
    const result = await agent.execute(context, intent);

    // Concise responses should be shorter
    expect(result.response!.length).toBeLessThan(200);
  });
});

