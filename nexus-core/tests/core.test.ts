/**
 * @module tests/core
 * @description Unit tests for Nexus Core modules
 * 
 * Run with: npx jest nexus-core/tests/
 * 
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";

// ============================================
// EVENT BUS TESTS
// ============================================

describe("EventBus", () => {
  // Import dynamically to reset state between tests
  let eventBus: any;

  beforeEach(async () => {
    jest.resetModules();
    const events = await import("../core/events");
    eventBus = events.eventBus;
  });

  afterEach(() => {
    eventBus.clear();
  });

  it("should subscribe and emit events", async () => {
    const handler = jest.fn();
    eventBus.on("query:start", handler);
    
    await eventBus.emit("query:start", { requestId: "123", userId: "user1", query: "test" });
    
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ requestId: "123", userId: "user1", query: "test" });
  });

  it("should unsubscribe from events", async () => {
    const handler = jest.fn();
    const unsubscribe = eventBus.on("query:start", handler);
    
    unsubscribe();
    await eventBus.emit("query:start", { requestId: "123", userId: "user1", query: "test" });
    
    expect(handler).not.toHaveBeenCalled();
  });

  it("should handle once subscriptions", async () => {
    const handler = jest.fn();
    eventBus.once("query:start", handler);
    
    await eventBus.emit("query:start", { requestId: "1", userId: "u", query: "q" });
    await eventBus.emit("query:start", { requestId: "2", userId: "u", query: "q" });
    
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("should track event history", async () => {
    await eventBus.emit("query:start", { requestId: "1", userId: "u", query: "q" });
    await eventBus.emit("query:completed", { requestId: "1", duration: 100, success: true });
    
    const history = eventBus.getHistory();
    expect(history).toHaveLength(2);
    expect(history[0].name).toBe("query:start");
    expect(history[1].name).toBe("query:completed");
  });

  it("should filter history by event name", async () => {
    await eventBus.emit("query:start", { requestId: "1", userId: "u", query: "q" });
    await eventBus.emit("query:completed", { requestId: "1", duration: 100, success: true });
    
    const history = eventBus.getHistory({ event: "query:start" });
    expect(history).toHaveLength(1);
    expect(history[0].name).toBe("query:start");
  });
});

// ============================================
// MEMORY SYSTEM TESTS
// ============================================

describe("MemorySystem", () => {
  let memorySystem: any;

  beforeEach(async () => {
    jest.resetModules();
    const memory = await import("../core/memory");
    memorySystem = memory.memorySystem;
  });

  afterEach(async () => {
    await memorySystem.clearAll("test-user");
  });

  it("should add and retrieve memory", async () => {
    const memory = await memorySystem.add("test-user", "Test content", "fact");
    
    expect(memory).toHaveProperty("id");
    expect(memory.content).toBe("Test content");
    expect(memory.type).toBe("fact");
  });

  it("should query memories", async () => {
    await memorySystem.add("test-user", "Important fact about testing", "fact");
    await memorySystem.add("test-user", "User prefers dark mode", "preference");
    
    const results = await memorySystem.query({ userId: "test-user", type: "fact" });
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].type).toBe("fact");
  });

  it("should delete memory", async () => {
    const memory = await memorySystem.add("test-user", "Temporary", "fact");
    
    const deleted = await memorySystem.delete("test-user", memory.id);
    expect(deleted).toBe(true);
    
    const results = await memorySystem.query({ userId: "test-user" });
    expect(results.find((m: any) => m.id === memory.id)).toBeUndefined();
  });

  it("should get memory summary", async () => {
    await memorySystem.add("test-user", "Fact 1", "fact", { tags: ["test"] });
    await memorySystem.add("test-user", "Fact 2", "fact", { tags: ["test"] });
    await memorySystem.add("test-user", "Pref 1", "preference", { tags: ["settings"] });
    
    const summary = await memorySystem.getSummary("test-user");
    
    expect(summary.totalItems).toBe(3);
    expect(summary.byType.fact).toBe(2);
    expect(summary.byType.preference).toBe(1);
  });
});

// ============================================
// ROUTER TESTS
// ============================================

describe("Router", () => {
  let router: any;

  beforeEach(async () => {
    jest.resetModules();
    const routerModule = await import("../core/router");
    router = routerModule.router;
  });

  it("should route questions to reasoning agent", async () => {
    const agents = await router.route("What is the meaning of life?");
    expect(agents).toContain("reasoning");
  });

  it("should route memory queries to memory agent", async () => {
    const agents = await router.route("What did I tell you yesterday?");
    expect(agents).toContain("memory");
  });

  it("should route analysis queries to analytics agent", async () => {
    const agents = await router.route("Analyze my task completion data");
    expect(agents).toContain("analytics");
  });

  it("should analyze query intent", () => {
    const result = router.analyzeIntent("What is TypeScript?");
    
    expect(result.primaryIntent).toBe("question");
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});

// ============================================
// CACHE TESTS
// ============================================

describe("Cache", () => {
  let LRUCache: any;

  beforeEach(async () => {
    const cache = await import("../lib/cache");
    LRUCache = cache.LRUCache;
  });

  it("should store and retrieve values", () => {
    const cache = new LRUCache();
    cache.set("key", "value");
    
    expect(cache.get("key")).toBe("value");
  });

  it("should respect max size", () => {
    const cache = new LRUCache({ maxSize: 2 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  it("should expire entries based on TTL", async () => {
    const cache = new LRUCache({ ttl: 50 });
    cache.set("key", "value");
    
    expect(cache.get("key")).toBe("value");
    
    await new Promise((r) => setTimeout(r, 100));
    
    expect(cache.get("key")).toBeUndefined();
  });

  it("should track cache statistics", () => {
    const cache = new LRUCache();
    cache.set("a", 1);
    cache.get("a"); // hit
    cache.get("b"); // miss
    
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });
});

// ============================================
// VALIDATION TESTS
// ============================================

describe("Validation", () => {
  let validate: any;

  beforeEach(async () => {
    const validation = await import("../lib/validation");
    validate = validation.validate;
  });

  it("should validate strings", () => {
    const result = validate("test", { type: "string", min: 2, max: 10 });
    expect(result.valid).toBe(true);
  });

  it("should fail on invalid type", () => {
    const result = validate(123, { type: "string" });
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("Expected string");
  });

  it("should validate required fields", () => {
    const result = validate(undefined, { type: "string", required: true });
    expect(result.valid).toBe(false);
  });

  it("should validate email format", () => {
    const valid = validate("test@example.com", { type: "email" });
    const invalid = validate("not-an-email", { type: "email" });
    
    expect(valid.valid).toBe(true);
    expect(invalid.valid).toBe(false);
  });

  it("should validate objects with nested properties", () => {
    const schema = {
      type: "object" as const,
      properties: {
        name: { type: "string" as const, required: true },
        age: { type: "number" as const, min: 0 },
      },
    };
    
    const result = validate({ name: "John", age: 25 }, schema);
    expect(result.valid).toBe(true);
  });
});

// ============================================
// UTILS TESTS
// ============================================

describe("Utils", () => {
  let utils: any;

  beforeEach(async () => {
    utils = await import("../lib/utils");
  });

  it("should generate unique IDs", () => {
    const id1 = utils.generateId();
    const id2 = utils.generateId();
    
    expect(id1).not.toBe(id2);
  });

  it("should truncate strings", () => {
    expect(utils.truncate("Hello World", 5)).toBe("He...");
    expect(utils.truncate("Hi", 10)).toBe("Hi");
  });

  it("should slugify strings", () => {
    expect(utils.slugify("Hello World")).toBe("hello-world");
    expect(utils.slugify("Test & Example!")).toBe("test-example");
  });

  it("should deep clone objects", () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = utils.deepClone(original);
    
    cloned.b.c = 3;
    expect(original.b.c).toBe(2);
  });

  it("should group arrays", () => {
    const items = [
      { type: "a", value: 1 },
      { type: "b", value: 2 },
      { type: "a", value: 3 },
    ];
    
    const grouped = utils.groupBy(items, "type");
    expect(grouped.a).toHaveLength(2);
    expect(grouped.b).toHaveLength(1);
  });

  it("should retry failed operations", async () => {
    let attempts = 0;
    const fn = jest.fn(async () => {
      attempts++;
      if (attempts < 3) throw new Error("Fail");
      return "success";
    });
    
    const result = await utils.retry(fn, { attempts: 5, delay: 10 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

// ============================================
// TOOLS TESTS
// ============================================

describe("Tools", () => {
  let toolRegistry: any;

  beforeEach(async () => {
    jest.resetModules();
    const tools = await import("../tools");
    toolRegistry = tools.toolRegistry;
  });

  it("should list built-in tools", () => {
    const tools = toolRegistry.list();
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.find((t: any) => t.id === "json-parse")).toBeDefined();
  });

  it("should execute tools", async () => {
    const result = await toolRegistry.execute("json-parse", { input: '{"a":1}' });
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ a: 1 });
  });

  it("should handle tool errors", async () => {
    const result = await toolRegistry.execute("json-parse", { input: "invalid json" });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid JSON");
  });

  it("should track usage statistics", async () => {
    await toolRegistry.execute("datetime", { operation: "now" });
    await toolRegistry.execute("datetime", { operation: "now" });
    
    const stats = toolRegistry.getStats("datetime");
    expect(stats?.calls).toBe(2);
  });
});


