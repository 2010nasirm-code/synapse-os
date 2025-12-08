/**
 * @module tests/agents
 * @description Integration tests for Nexus Agents
 * 
 * Run with: npx jest nexus-core/tests/agents.test.ts
 * 
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, jest } from "@jest/globals";

// ============================================
// REASONING AGENT TESTS
// ============================================

describe("ReasoningAgent", () => {
  let reasoningAgent: any;

  beforeEach(async () => {
    jest.resetModules();
    const agent = await import("../agents/reasoningAgent");
    reasoningAgent = agent.default;
  });

  it("should have correct metadata", () => {
    expect(reasoningAgent.id).toBe("reasoning");
    expect(reasoningAgent.capabilities).toContain("question-answering");
    expect(reasoningAgent.enabled).toBe(true);
  });

  it("should process questions", async () => {
    const result = await reasoningAgent.process({
      query: "What is TypeScript?",
      context: {},
    });

    expect(result.success).toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.result).toHaveProperty("answer");
  });

  it("should use memory context when available", async () => {
    const result = await reasoningAgent.process({
      query: "What did I ask before?",
      context: {},
      memory: [{ id: "1", content: "Previous conversation about coding" }],
    });

    expect(result.success).toBe(true);
    expect(result.result.answer).toBeDefined();
  });
});

// ============================================
// PLANNING AGENT TESTS
// ============================================

describe("PlanningAgent", () => {
  let planningAgent: any;

  beforeEach(async () => {
    jest.resetModules();
    const agent = await import("../agents/planningAgent");
    planningAgent = agent.default;
  });

  it("should create plans", async () => {
    const result = await planningAgent.process({
      query: "Plan a project to build a website",
      context: {},
    });

    expect(result.success).toBe(true);
    expect(result.result.plan).toBeDefined();
    expect(result.result.plan.steps).toBeInstanceOf(Array);
  });

  it("should create learning plans", async () => {
    const result = await planningAgent.process({
      query: "Create a plan to learn Python",
      context: {},
    });

    expect(result.success).toBe(true);
    expect(result.result.plan.type).toBe("learning");
  });

  it("should estimate time for plans", async () => {
    const result = await planningAgent.process({
      query: "Plan my week",
      context: {},
    });

    expect(result.result.plan.estimatedTime).toBeDefined();
  });
});

// ============================================
// ANALYTICS AGENT TESTS
// ============================================

describe("AnalyticsAgent", () => {
  let analyticsAgent: any;

  beforeEach(async () => {
    jest.resetModules();
    const agent = await import("../agents/analyticsAgent");
    analyticsAgent = agent.default;
  });

  it("should analyze items", async () => {
    const result = await analyticsAgent.process({
      query: "Analyze my tasks",
      context: {
        items: [
          { id: "1", status: "completed", priority: "high" },
          { id: "2", status: "pending", priority: "medium" },
          { id: "3", status: "completed", priority: "low" },
        ],
      },
    });

    expect(result.success).toBe(true);
    expect(result.result.analysis).toBeDefined();
    expect(result.result.analysis.totals.items).toBe(3);
    expect(result.result.analysis.totals.completed).toBe(2);
  });

  it("should detect patterns", async () => {
    const result = await analyticsAgent.process({
      query: "Find patterns",
      context: {
        items: Array(10).fill(null).map((_, i) => ({
          id: String(i),
          status: i < 8 ? "completed" : "pending",
          priority: "medium",
        })),
      },
    });

    expect(result.result.patterns).toBeInstanceOf(Array);
  });

  it("should generate insights", async () => {
    const result = await analyticsAgent.process({
      query: "Give me insights",
      context: {
        items: [
          { id: "1", status: "pending", priority: "high" },
          { id: "2", status: "pending", priority: "high" },
        ],
      },
    });

    expect(result.result.insights).toBeDefined();
  });
});

// ============================================
// SEARCH AGENT TESTS
// ============================================

describe("SearchAgent", () => {
  let searchAgent: any;

  beforeEach(async () => {
    jest.resetModules();
    const agent = await import("../agents/searchAgent");
    searchAgent = agent.default;
  });

  it("should search items", async () => {
    const result = await searchAgent.process({
      query: "Find project",
      context: {
        items: [
          { id: "1", name: "Project Alpha", description: "First project" },
          { id: "2", name: "Task Beta", description: "A task" },
          { id: "3", name: "Project Gamma", description: "Another project" },
        ],
      },
    });

    expect(result.success).toBe(true);
    expect(result.result.results.length).toBe(2);
  });

  it("should return relevance scores", async () => {
    const result = await searchAgent.process({
      query: "Find Alpha",
      context: {
        items: [
          { id: "1", name: "Project Alpha", description: "First project" },
        ],
      },
    });

    expect(result.result.results[0]).toHaveProperty("relevance");
  });
});

// ============================================
// SUMMARIZATION AGENT TESTS
// ============================================

describe("SummarizationAgent", () => {
  let summarizationAgent: any;

  beforeEach(async () => {
    jest.resetModules();
    const agent = await import("../agents/summarizationAgent");
    summarizationAgent = agent.default;
  });

  it("should summarize items", async () => {
    const result = await summarizationAgent.process({
      query: "Summarize my items",
      context: {
        items: [
          { id: "1", status: "completed" },
          { id: "2", status: "pending" },
          { id: "3", status: "in_progress" },
        ],
      },
    });

    expect(result.success).toBe(true);
    expect(result.result.summary).toBeDefined();
    expect(result.result.summary.total).toBe(3);
  });

  it("should create daily summaries", async () => {
    const result = await summarizationAgent.process({
      query: "Summarize today",
      context: { items: [] },
    });

    expect(result.result.summary.date).toBeDefined();
  });
});

// ============================================
// CREATIVITY AGENT TESTS
// ============================================

describe("CreativityAgent", () => {
  let creativityAgent: any;

  beforeEach(async () => {
    jest.resetModules();
    const agent = await import("../agents/creativityAgent");
    creativityAgent = agent.default;
  });

  it("should generate ideas", async () => {
    const result = await creativityAgent.process({
      query: "Give me ideas for a new app",
      context: {},
    });

    expect(result.success).toBe(true);
    expect(result.result.ideas).toBeInstanceOf(Array);
    expect(result.result.ideas.length).toBeGreaterThan(0);
  });

  it("should brainstorm topics", async () => {
    const result = await creativityAgent.process({
      query: "Brainstorm productivity improvements",
      context: {},
    });

    expect(result.result.ideas).toBeDefined();
  });

  it("should expand concepts", async () => {
    const result = await creativityAgent.process({
      query: "Expand on the idea of remote work",
      context: {},
    });

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    // The result should have either 'expansions' or 'answer' property
    expect(result.result).toHaveProperty("answer");
    // If it's an expansion type, it should have expansions
    if (result.result.expansions) {
      expect(Array.isArray(result.result.expansions)).toBe(true);
    }
  });
});

// ============================================
// AUTOMATION AGENT TESTS
// ============================================

describe("AutomationAgent", () => {
  let automationAgent: any;

  beforeEach(async () => {
    jest.resetModules();
    const agent = await import("../agents/automationAgent");
    automationAgent = agent.default;
  });

  it("should suggest automations", async () => {
    const result = await automationAgent.process({
      query: "What automations can I create?",
      context: { automations: [] },
    });

    expect(result.success).toBe(true);
    expect(result.result.suggestions).toBeInstanceOf(Array);
  });

  it("should list existing automations", async () => {
    const result = await automationAgent.process({
      query: "Show my automations",
      context: {
        automations: [
          { id: "1", name: "Daily Summary", enabled: true, trigger_type: "schedule" },
        ],
      },
    });

    expect(result.result.automations).toBeDefined();
  });
});

