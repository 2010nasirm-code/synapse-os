/**
 * ============================================================================
 * NEXUS PRIME - AGENT TESTS
 * ============================================================================
 * 
 * Tests for all NEXUS PRIME agents.
 * 
 * @module nexus/prime/tests/agents
 */

import { AIRequest, SystemContext } from '../core/types';
import { initializeAgents, getAgentInstance } from '../agents';
import { getRegistry } from '../core/registry';

// ============================================================================
// TEST SETUP
// ============================================================================

const createMockRequest = (prompt: string): AIRequest => ({
  id: `test-${Date.now()}`,
  prompt,
  metadata: { userId: 'test-user', source: 'test' },
});

const createMockContext = (): SystemContext => ({
  user: { id: 'test-user' },
  ui: { currentPage: 'dashboard', currentRoute: '/dashboard', theme: 'light' },
  data: {},
  memories: [],
  session: { id: 'test-session', startedAt: Date.now(), messageCount: 0 },
  features: {},
  safetyTier: 1,
  timestamp: Date.now(),
});

// ============================================================================
// AGENT INITIALIZATION TESTS
// ============================================================================

describe('Agent Initialization', () => {
  beforeAll(() => {
    initializeAgents();
  });

  test('should initialize all agents', () => {
    const registry = getRegistry();
    const ids = registry.getAllIds();
    
    expect(ids).toContain('orchestrator');
    expect(ids).toContain('insight');
    expect(ids).toContain('builder');
    expect(ids).toContain('repair');
    expect(ids).toContain('ui');
    expect(ids).toContain('automation');
    expect(ids).toContain('memory');
    expect(ids).toContain('evolution');
  });

  test('should not duplicate agents on re-initialization', () => {
    const registry = getRegistry();
    const countBefore = registry.getAllIds().length;
    
    initializeAgents();
    
    const countAfter = registry.getAllIds().length;
    expect(countAfter).toBe(countBefore);
  });
});

// ============================================================================
// ORCHESTRATOR AGENT TESTS
// ============================================================================

describe('OrchestratorAgent', () => {
  beforeAll(() => {
    initializeAgents();
  });

  test('should handle any request', () => {
    const agent = getAgentInstance('orchestrator');
    expect(agent).toBeDefined();
    expect(agent?.canHandle(createMockRequest('anything'))).toBe(true);
  });

  test('should return structured result', async () => {
    const agent = getAgentInstance('orchestrator');
    const result = await agent?.process(createMockRequest('hello'), createMockContext());
    
    expect(result).toBeDefined();
    expect(result?.agentId).toBe('orchestrator');
    expect(result?.answer).toBeDefined();
    expect(Array.isArray(result?.insights)).toBe(true);
    expect(Array.isArray(result?.actionDrafts)).toBe(true);
  });
});

// ============================================================================
// INSIGHT AGENT TESTS
// ============================================================================

describe('InsightAgent', () => {
  beforeAll(() => {
    initializeAgents();
  });

  test('should handle analysis requests', () => {
    const agent = getAgentInstance('insight');
    expect(agent?.canHandle(createMockRequest('analyze my data'))).toBe(true);
    expect(agent?.canHandle(createMockRequest('show trends'))).toBe(true);
    expect(agent?.canHandle(createMockRequest('find patterns'))).toBe(true);
  });

  test('should generate insights', async () => {
    const agent = getAgentInstance('insight');
    const result = await agent?.process(
      createMockRequest('analyze trends'),
      createMockContext()
    );
    
    expect(result?.success).toBe(true);
    expect(result?.insights.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// BUILDER AGENT TESTS
// ============================================================================

describe('BuilderAgent', () => {
  beforeAll(() => {
    initializeAgents();
  });

  test('should handle creation requests', () => {
    const agent = getAgentInstance('builder');
    expect(agent?.canHandle(createMockRequest('create a tracker'))).toBe(true);
    expect(agent?.canHandle(createMockRequest('build a dashboard'))).toBe(true);
    expect(agent?.canHandle(createMockRequest('make a new layout'))).toBe(true);
  });

  test('should return action drafts requiring confirmation', async () => {
    const agent = getAgentInstance('builder');
    const result = await agent?.process(
      createMockRequest('create a habit tracker'),
      createMockContext()
    );
    
    expect(result?.success).toBe(true);
    expect(result?.actionDrafts.length).toBeGreaterThan(0);
    expect(result?.actionDrafts[0].requiresConfirmation).toBe(true);
  });
});

// ============================================================================
// REPAIR AGENT TESTS
// ============================================================================

describe('RepairAgent', () => {
  beforeAll(() => {
    initializeAgents();
  });

  test('should handle error requests', () => {
    const agent = getAgentInstance('repair');
    expect(agent?.canHandle(createMockRequest('fix this error'))).toBe(true);
    expect(agent?.canHandle(createMockRequest('debug my code'))).toBe(true);
    expect(agent?.canHandle(createMockRequest('something is broken'))).toBe(true);
  });

  test('should create PR drafts not auto-apply', async () => {
    const agent = getAgentInstance('repair');
    const result = await agent?.process(
      createMockRequest('fix undefined error'),
      createMockContext()
    );
    
    expect(result?.success).toBe(true);
    // All patch actions should require confirmation
    for (const action of result?.actionDrafts || []) {
      if (action.type === 'patch') {
        expect(action.requiresConfirmation).toBe(true);
      }
    }
  });
});

// ============================================================================
// UI AGENT TESTS
// ============================================================================

describe('UIAgent', () => {
  beforeAll(() => {
    initializeAgents();
  });

  test('should handle navigation requests', () => {
    const agent = getAgentInstance('ui');
    expect(agent?.canHandle(createMockRequest('go to dashboard'))).toBe(true);
    expect(agent?.canHandle(createMockRequest('show me settings'))).toBe(true);
    expect(agent?.canHandle(createMockRequest('how do I add an item'))).toBe(true);
  });

  test('should return navigation actions', async () => {
    const agent = getAgentInstance('ui');
    const result = await agent?.process(
      createMockRequest('go to settings'),
      createMockContext()
    );
    
    expect(result?.success).toBe(true);
    expect(result?.actionDrafts.some(a => a.type === 'navigate')).toBe(true);
  });
});

// ============================================================================
// AUTOMATION AGENT TESTS
// ============================================================================

describe('AutomationAgent', () => {
  beforeAll(() => {
    initializeAgents();
  });

  test('should handle automation requests', () => {
    const agent = getAgentInstance('automation');
    expect(agent?.canHandle(createMockRequest('automate this task'))).toBe(true);
    expect(agent?.canHandle(createMockRequest('when X then Y'))).toBe(true);
    expect(agent?.canHandle(createMockRequest('remind me every day'))).toBe(true);
  });

  test('should create automation blueprints', async () => {
    const agent = getAgentInstance('automation');
    const result = await agent?.process(
      createMockRequest('remind me every morning at 9am'),
      createMockContext()
    );
    
    expect(result?.success).toBe(true);
    expect(result?.actionDrafts.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// MEMORY AGENT TESTS
// ============================================================================

describe('MemoryAgent', () => {
  beforeAll(() => {
    initializeAgents();
  });

  test('should handle memory requests', () => {
    const agent = getAgentInstance('memory');
    expect(agent?.canHandle(createMockRequest('remember this'))).toBe(true);
    expect(agent?.canHandle(createMockRequest('what did I tell you'))).toBe(true);
    expect(agent?.canHandle(createMockRequest('forget about X'))).toBe(true);
  });

  test('should store memories', async () => {
    const agent = getAgentInstance('memory');
    const result = await agent?.process(
      createMockRequest('remember that I prefer dark mode'),
      createMockContext()
    );
    
    expect(result?.success).toBe(true);
    expect(result?.actionDrafts.some(a => a.type === 'store')).toBe(true);
  });
});

// ============================================================================
// EVOLUTION AGENT TESTS
// ============================================================================

describe('EvolutionAgent', () => {
  beforeAll(() => {
    initializeAgents();
  });

  test('should handle improvement requests', () => {
    const agent = getAgentInstance('evolution');
    expect(agent?.canHandle(createMockRequest('improve my workflow'))).toBe(true);
    expect(agent?.canHandle(createMockRequest('suggest features'))).toBe(true);
    expect(agent?.canHandle(createMockRequest('optimize performance'))).toBe(true);
  });

  test('should suggest improvements', async () => {
    const agent = getAgentInstance('evolution');
    const result = await agent?.process(
      createMockRequest('analyze and suggest improvements'),
      createMockContext()
    );
    
    expect(result?.success).toBe(true);
    // Evolution agent always requires confirmation for changes
    for (const action of result?.actionDrafts || []) {
      expect(action.requiresConfirmation).toBe(true);
    }
  });
});

// ============================================================================
// AGENT RESULT SHAPE TESTS
// ============================================================================

describe('Agent Result Shape', () => {
  beforeAll(() => {
    initializeAgents();
  });

  const agentIds = ['orchestrator', 'insight', 'builder', 'repair', 'ui', 'automation', 'memory', 'evolution'];

  test.each(agentIds)('%s returns correct result shape', async (agentId) => {
    const agent = getAgentInstance(agentId);
    const result = await agent?.process(createMockRequest('test'), createMockContext());
    
    expect(result).toMatchObject({
      agentId: expect.any(String),
      success: expect.any(Boolean),
      answer: expect.any(String),
      insights: expect.any(Array),
      actionDrafts: expect.any(Array),
      provenance: expect.any(Object),
      confidence: expect.any(Number),
      processingTimeMs: expect.any(Number),
    });
  });
});

