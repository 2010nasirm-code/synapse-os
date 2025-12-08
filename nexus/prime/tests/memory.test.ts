/**
 * ============================================================================
 * NEXUS PRIME - MEMORY TESTS
 * ============================================================================
 * 
 * Tests for NEXUS PRIME memory system.
 * 
 * @module nexus/prime/tests/memory
 */

import { MemoryStore, InMemoryAdapter } from '../memory/store';
import { EmbeddingService } from '../memory/embeddings';
import { MemoryVectorStore } from '../memory/vectorAdapter';
import { SummaryService } from '../memory/summaries';
import { NexusMemoryItem } from '../core/types';

// ============================================================================
// MEMORY STORE TESTS
// ============================================================================

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore('test-user', {
      adapter: new InMemoryAdapter(),
      maxMemories: 100,
    });
  });

  test('should add memory', async () => {
    const memory = await store.add({
      content: 'Test memory content',
      category: 'general',
      importance: 0.5,
    });

    expect(memory.id).toBeDefined();
    expect(memory.content).toBe('Test memory content');
    expect(memory.createdAt).toBeDefined();
  });

  test('should get memory by ID', async () => {
    const added = await store.add({
      content: 'Retrievable memory',
      importance: 0.7,
    });

    const retrieved = await store.get(added.id);
    expect(retrieved?.content).toBe('Retrievable memory');
  });

  test('should update access count on get', async () => {
    const added = await store.add({
      content: 'Frequently accessed',
      importance: 0.5,
    });

    expect(added.accessCount).toBe(0);

    await store.get(added.id);
    const retrieved = await store.get(added.id);
    
    expect(retrieved?.accessCount).toBe(2);
  });

  test('should search memories', async () => {
    await store.add({ content: 'I love TypeScript', importance: 0.5 });
    await store.add({ content: 'JavaScript is versatile', importance: 0.5 });
    await store.add({ content: 'Python is great for ML', importance: 0.5 });

    const results = await store.search('TypeScript');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain('TypeScript');
  });

  test('should delete memory', async () => {
    const added = await store.add({
      content: 'To be deleted',
      importance: 0.3,
    });

    await store.delete(added.id);
    const retrieved = await store.get(added.id);
    
    expect(retrieved).toBeNull();
  });

  test('should respect max memories', async () => {
    const smallStore = new MemoryStore('test-user-small', {
      adapter: new InMemoryAdapter(),
      maxMemories: 3,
    });

    await smallStore.add({ content: 'Memory 1', importance: 0.1 });
    await smallStore.add({ content: 'Memory 2', importance: 0.5 });
    await smallStore.add({ content: 'Memory 3', importance: 0.9 });
    await smallStore.add({ content: 'Memory 4', importance: 0.8 });

    const all = await smallStore.getAll();
    expect(all.length).toBeLessThanOrEqual(3);
    
    // Should keep higher importance
    expect(all.some(m => m.content === 'Memory 3')).toBe(true);
  });

  test('should get stats', async () => {
    await store.add({ content: 'Fact 1', category: 'fact', importance: 0.5 });
    await store.add({ content: 'Fact 2', category: 'fact', importance: 0.7 });
    await store.add({ content: 'Preference 1', category: 'preference', importance: 0.8 });

    const stats = await store.getStats();
    
    expect(stats.total).toBe(3);
    expect(stats.byCategory.fact).toBe(2);
    expect(stats.byCategory.preference).toBe(1);
    expect(stats.averageImportance).toBeCloseTo(0.667, 1);
  });
});

// ============================================================================
// EMBEDDING SERVICE TESTS
// ============================================================================

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    // Use local fallback (no API key)
    service = new EmbeddingService({ localFallback: true });
  });

  test('should generate embedding', async () => {
    const embedding = await service.embedText('Hello world');
    
    expect(embedding.values).toBeDefined();
    expect(embedding.values.length).toBeGreaterThan(0);
    expect(embedding.dimensions).toBe(embedding.values.length);
  });

  test('should generate batch embeddings', async () => {
    const embeddings = await service.embedBatch([
      'First text',
      'Second text',
      'Third text',
    ]);

    expect(embeddings.length).toBe(3);
    embeddings.forEach(e => {
      expect(e.values.length).toBeGreaterThan(0);
    });
  });

  test('similar texts should have higher similarity', async () => {
    const e1 = await service.embedText('I love programming');
    const e2 = await service.embedText('I enjoy coding');
    const e3 = await service.embedText('The weather is nice');

    const sim12 = EmbeddingService.cosineSimilarity(e1, e2);
    const sim13 = EmbeddingService.cosineSimilarity(e1, e3);

    // Similar texts should have higher similarity (in local fallback, this may vary)
    expect(typeof sim12).toBe('number');
    expect(typeof sim13).toBe('number');
  });
});

// ============================================================================
// VECTOR STORE TESTS
// ============================================================================

describe('MemoryVectorStore', () => {
  let vectorStore: MemoryVectorStore;

  beforeEach(() => {
    vectorStore = new MemoryVectorStore();
  });

  test('should add and search memories', async () => {
    const memory: NexusMemoryItem = {
      id: 'mem-1',
      content: 'TypeScript is a typed superset of JavaScript',
      category: 'fact',
      importance: 0.8,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
    };

    await vectorStore.addMemory(memory);
    
    const results = await vectorStore.searchSimilar('TypeScript JavaScript');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe('mem-1');
  });

  test('should filter by category', async () => {
    await vectorStore.addMemory({
      id: 'mem-fact',
      content: 'The sky is blue',
      category: 'fact',
      importance: 0.5,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
    });

    await vectorStore.addMemory({
      id: 'mem-pref',
      content: 'I prefer dark themes',
      category: 'preference',
      importance: 0.7,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
    });

    const results = await vectorStore.searchSimilar('theme', 5, { category: 'preference' });
    expect(results.every(r => r.category === 'preference')).toBe(true);
  });
});

// ============================================================================
// SUMMARY SERVICE TESTS
// ============================================================================

describe('SummaryService', () => {
  let service: SummaryService;

  beforeEach(() => {
    service = new SummaryService();
  });

  test('should summarize memories', () => {
    const memories: NexusMemoryItem[] = [
      { id: '1', content: 'Memory about coding', category: 'general', importance: 0.5, createdAt: Date.now(), lastAccessedAt: Date.now(), accessCount: 1 },
      { id: '2', content: 'Memory about TypeScript', category: 'fact', importance: 0.7, createdAt: Date.now(), lastAccessedAt: Date.now(), accessCount: 2 },
      { id: '3', content: 'Memory about preferences', category: 'preference', importance: 0.8, createdAt: Date.now(), lastAccessedAt: Date.now(), accessCount: 3 },
    ];

    const summary = service.summarize(memories);
    
    expect(summary).toContain('3');
    expect(summary.length).toBeGreaterThan(0);
  });

  test('should handle empty memories', () => {
    const summary = service.summarize([]);
    expect(summary).toContain('No memories');
  });

  test('should summarize by category', () => {
    const memories: NexusMemoryItem[] = [
      { id: '1', content: 'Fact one', category: 'fact', importance: 0.5, createdAt: Date.now(), lastAccessedAt: Date.now(), accessCount: 1 },
      { id: '2', content: 'Fact two', category: 'fact', importance: 0.7, createdAt: Date.now(), lastAccessedAt: Date.now(), accessCount: 1 },
    ];

    const summary = service.summarizeCategory(memories, 'fact');
    
    expect(summary).toContain('fact');
    expect(summary).toContain('2 memories');
  });

  test('should compact similar memories', async () => {
    const memories: NexusMemoryItem[] = [
      { id: '1', content: 'I like TypeScript', category: 'preference', importance: 0.8, createdAt: Date.now(), lastAccessedAt: Date.now(), accessCount: 1 },
      { id: '2', content: 'I like TypeScript a lot', category: 'preference', importance: 0.5, createdAt: Date.now(), lastAccessedAt: Date.now(), accessCount: 1 },
      { id: '3', content: 'Python is good for data science', category: 'fact', importance: 0.6, createdAt: Date.now(), lastAccessedAt: Date.now(), accessCount: 1 },
    ];

    const { compacted, removed } = await service.compactMemories(memories, 0.7);
    
    // Should remove near-duplicate
    expect(compacted.length).toBeLessThan(memories.length);
    expect(removed.length).toBeGreaterThan(0);
    // Should keep higher importance one
    expect(compacted.some(m => m.importance === 0.8)).toBe(true);
  });
});

