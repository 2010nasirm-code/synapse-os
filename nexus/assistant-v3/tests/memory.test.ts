/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - MEMORY TESTS
 * ============================================================================
 * 
 * @module nexus/assistant-v3/tests/memory.test
 * @version 3.0.0
 */

import { MemoryStore, getMemoryStore } from '../memory/memoryStore';
import { generateEmbedding, cosineSimilarity } from '../memory/embeddings';
import { InMemoryVectorAdapter } from '../memory/vectorAdapter';
import { ConsentManager } from '../core/safety';

// ============================================================================
// MOCK SETUP
// ============================================================================

const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.info = jest.fn();
  console.debug = jest.fn();
});
afterAll(() => {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
});

// ============================================================================
// MEMORY STORE TESTS
// ============================================================================

describe('MemoryStore', () => {
  const testUserId = 'test-memory-user';

  beforeEach(() => {
    // Enable consent for tests
    ConsentManager.setConsent(testUserId, {
      memoryConsent: true,
      analyticsConsent: false,
      personalizationConsent: false,
    });
  });

  afterEach(async () => {
    const store = getMemoryStore(testUserId);
    await store.clear();
    ConsentManager.clearUserData(testUserId);
  });

  test('adds memory item', async () => {
    const store = getMemoryStore(testUserId);
    
    const memory = await store.add({
      text: 'Test memory',
      type: 'fact',
      importance: 0.8,
    });

    expect(memory.id).toBeDefined();
    expect(memory.text).toBe('Test memory');
    expect(memory.type).toBe('fact');
    expect(memory.owner).toBe(testUserId);
  });

  test('retrieves all memories', async () => {
    const store = getMemoryStore(testUserId);
    
    await store.add({ text: 'Memory 1', type: 'fact' });
    await store.add({ text: 'Memory 2', type: 'preference' });
    
    const all = await store.getAll();
    expect(all.length).toBe(2);
  });

  test('searches memories by similarity', async () => {
    const store = getMemoryStore(testUserId);
    
    await store.add({ text: 'I like cats', type: 'preference' });
    await store.add({ text: 'I prefer mornings', type: 'preference' });
    await store.add({ text: 'Python is my favorite language', type: 'preference' });
    
    const results = await store.search('cats', 3);
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item.text).toContain('cats');
    expect(results[0].score).toBeGreaterThan(0);
  });

  test('deletes memory', async () => {
    const store = getMemoryStore(testUserId);
    
    const memory = await store.add({ text: 'To delete', type: 'fact' });
    const deleted = await store.delete(memory.id);
    
    expect(deleted).toBe(true);
    
    const retrieved = await store.get(memory.id);
    expect(retrieved).toBeNull();
  });

  test('clears all memories', async () => {
    const store = getMemoryStore(testUserId);
    
    await store.add({ text: 'Memory 1', type: 'fact' });
    await store.add({ text: 'Memory 2', type: 'fact' });
    
    await store.clear();
    
    const all = await store.getAll();
    expect(all.length).toBe(0);
  });

  test('respects consent settings', async () => {
    const store = getMemoryStore(testUserId);
    
    // Disable consent
    ConsentManager.setConsent(testUserId, { memoryConsent: false });
    
    await expect(store.add({ text: 'Test', type: 'fact' }))
      .rejects.toThrow('Memory storage not consented');
    
    const all = await store.getAll();
    expect(all.length).toBe(0);
  });

  test('gets memories by type', async () => {
    const store = getMemoryStore(testUserId);
    
    await store.add({ text: 'Fact 1', type: 'fact' });
    await store.add({ text: 'Preference 1', type: 'preference' });
    await store.add({ text: 'Fact 2', type: 'fact' });
    
    const facts = await store.getByType('fact');
    expect(facts.length).toBe(2);
    expect(facts.every(m => m.type === 'fact')).toBe(true);
  });

  test('returns stats', async () => {
    const store = getMemoryStore(testUserId);
    
    await store.add({ text: 'Fact 1', type: 'fact', importance: 0.8 });
    await store.add({ text: 'Preference 1', type: 'preference', importance: 0.6 });
    
    const stats = await store.getStats();
    
    expect(stats.total).toBe(2);
    expect(stats.byType.fact).toBe(1);
    expect(stats.byType.preference).toBe(1);
    expect(stats.averageImportance).toBe(0.7);
  });
});

// ============================================================================
// EMBEDDINGS TESTS
// ============================================================================

describe('Embeddings', () => {
  test('generates embedding for text', async () => {
    const embedding = await generateEmbedding('Hello world');
    
    expect(Array.isArray(embedding)).toBe(true);
    expect(embedding.length).toBeGreaterThan(0);
    expect(embedding.every(n => typeof n === 'number')).toBe(true);
  });

  test('similar texts have similar embeddings', async () => {
    const emb1 = await generateEmbedding('I love cats');
    const emb2 = await generateEmbedding('I adore cats');
    const emb3 = await generateEmbedding('Python programming language');
    
    const sim12 = cosineSimilarity(emb1, emb2);
    const sim13 = cosineSimilarity(emb1, emb3);
    
    // Similar sentences should have higher similarity
    expect(sim12).toBeGreaterThan(sim13);
  });

  test('cosine similarity is between -1 and 1', async () => {
    const emb1 = await generateEmbedding('Test text');
    const emb2 = await generateEmbedding('Another text');
    
    const sim = cosineSimilarity(emb1, emb2);
    
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// VECTOR ADAPTER TESTS
// ============================================================================

describe('InMemoryVectorAdapter', () => {
  let adapter: InMemoryVectorAdapter;

  beforeEach(() => {
    adapter = new InMemoryVectorAdapter();
  });

  test('inserts and searches vectors', async () => {
    await adapter.insert({
      id: 'vec1',
      embedding: [1, 0, 0],
      metadata: { text: 'Test 1' },
    });
    
    await adapter.insert({
      id: 'vec2',
      embedding: [0, 1, 0],
      metadata: { text: 'Test 2' },
    });
    
    const results = await adapter.search([1, 0, 0], 2);
    
    expect(results.length).toBe(2);
    expect(results[0].id).toBe('vec1');
    expect(results[0].score).toBe(1); // Exact match
  });

  test('deletes vector', async () => {
    await adapter.insert({
      id: 'vec1',
      embedding: [1, 0, 0],
    });
    
    const deleted = await adapter.delete('vec1');
    expect(deleted).toBe(true);
    
    const count = await adapter.count();
    expect(count).toBe(0);
  });

  test('clears all vectors', async () => {
    await adapter.insert({ id: 'vec1', embedding: [1, 0] });
    await adapter.insert({ id: 'vec2', embedding: [0, 1] });
    
    await adapter.clear();
    
    const count = await adapter.count();
    expect(count).toBe(0);
  });

  test('counts vectors', async () => {
    await adapter.insert({ id: 'vec1', embedding: [1, 0] });
    await adapter.insert({ id: 'vec2', embedding: [0, 1] });
    
    const count = await adapter.count();
    expect(count).toBe(2);
  });
});

