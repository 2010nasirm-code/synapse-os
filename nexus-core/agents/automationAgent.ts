/**
 * Automation Agent
 * Manages automation rules and executes automated actions
 */

import type { Agent, AgentInput, AgentOutput, Automation } from "../core/types";

const automationAgent: Agent = {
  id: "automation",
  name: "Automation Agent",
  description: "Creates, manages, and executes automation rules",
  capabilities: ["automation", "triggers", "actions", "workflow"],
  priority: 6,
  enabled: true,

  async process(input: AgentInput): Promise<AgentOutput> {
    const { query, context } = input;
    const automations = context.automations || [];

    try {
      const action = detectAutomationAction(query);
      const result = await handleAutomationAction(action, query, automations, context);

      return {
        success: true,
        result,
        confidence: 0.85,
        explanation: `Automation ${action} completed`,
        suggestions: [
          "Create a new automation",
          "Review automation history",
          "Test an automation",
        ],
      };
    } catch (error: any) {
      return {
        success: false,
        result: null,
        confidence: 0,
        error: error.message,
      };
    }
  },
};

function detectAutomationAction(query: string): string {
  const lower = query.toLowerCase();
  
  if (lower.includes("create") || lower.includes("add") || lower.includes("new")) return "create";
  if (lower.includes("run") || lower.includes("execute") || lower.includes("trigger")) return "execute";
  if (lower.includes("list") || lower.includes("show") || lower.includes("what")) return "list";
  if (lower.includes("delete") || lower.includes("remove")) return "delete";
  if (lower.includes("edit") || lower.includes("update") || lower.includes("modify")) return "edit";
  
  return "suggest";
}

async function handleAutomationAction(
  action: string,
  query: string,
  automations: any[],
  context: Record<string, any>
): Promise<any> {
  switch (action) {
    case "create":
      return suggestAutomation(query, context);
    case "execute":
      return executeAutomation(query, automations);
    case "list":
      return listAutomations(automations);
    case "suggest":
      return suggestAutomation(query, context);
    default:
      return { answer: "Please specify what you'd like to do with automations." };
  }
}

function suggestAutomation(query: string, context: Record<string, any>): any {
  const suggestions = [
    {
      name: "Daily Summary",
      trigger: { type: "schedule", config: { time: "09:00", frequency: "daily" } },
      actions: [{ type: "skill", config: { skill: "summarization", target: "daily" } }],
      description: "Get a daily summary of your tasks each morning",
    },
    {
      name: "High Priority Alert",
      trigger: { type: "event", config: { event: "item_created", condition: { priority: "high" } } },
      actions: [{ type: "notification", config: { message: "New high priority item added!" } }],
      description: "Get notified when high priority items are created",
    },
    {
      name: "Weekly Analytics",
      trigger: { type: "schedule", config: { day: "sunday", time: "18:00" } },
      actions: [{ type: "agent", config: { agent: "analytics" } }],
      description: "Generate weekly analytics report every Sunday",
    },
    {
      name: "Auto-Insights",
      trigger: { type: "event", config: { event: "items_updated", threshold: 5 } },
      actions: [{ type: "agent", config: { agent: "insight" } }],
      description: "Generate insights when significant activity occurs",
    },
  ];

  return {
    answer: `⚡ **Automation Suggestions**\n\n` +
      suggestions.map((s, i) => 
        `${i + 1}. **${s.name}**\n   ${s.description}`
      ).join("\n\n"),
    suggestions,
    action: "create_automation",
  };
}

function executeAutomation(query: string, automations: any[]): any {
  const activeAutomations = automations.filter(a => a.enabled);
  
  if (activeAutomations.length === 0) {
    return {
      answer: "No active automations to run. Create one first!",
      executed: [],
    };
  }

  // Simulate execution
  const executed = activeAutomations.slice(0, 3).map(a => ({
    id: a.id,
    name: a.name,
    status: "executed",
    result: "Success",
  }));

  return {
    answer: `✅ Executed ${executed.length} automation(s):\n` +
      executed.map(e => `• ${e.name}: ${e.result}`).join("\n"),
    executed,
  };
}

function listAutomations(automations: any[]): any {
  if (automations.length === 0) {
    return {
      answer: "No automations found. Would you like me to suggest some?",
      automations: [],
    };
  }

  const active = automations.filter(a => a.enabled);
  const inactive = automations.filter(a => !a.enabled);

  let answer = `⚡ **Your Automations** (${automations.length} total)\n\n`;
  
  if (active.length > 0) {
    answer += `**Active (${active.length}):**\n`;
    active.forEach(a => {
      answer += `• ${a.name} - ${a.trigger_type}\n`;
    });
  }

  if (inactive.length > 0) {
    answer += `\n**Inactive (${inactive.length}):**\n`;
    inactive.forEach(a => {
      answer += `• ${a.name}\n`;
    });
  }

  return { answer, automations };
}

export default automationAgent;


