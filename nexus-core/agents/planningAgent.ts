/**
 * Planning Agent
 * Creates plans, roadmaps, and step-by-step guides
 */

import type { Agent, AgentInput, AgentOutput } from "../core/types";

const planningAgent: Agent = {
  id: "planning",
  name: "Planning Agent",
  description: "Creates structured plans, roadmaps, and step-by-step guides",
  capabilities: ["planning", "goal-setting", "task-breakdown", "roadmap"],
  priority: 3,
  enabled: true,

  async process(input: AgentInput): Promise<AgentOutput> {
    const { query, context } = input;

    try {
      const planType = detectPlanType(query);
      const plan = await generatePlan(query, planType, context);

      return {
        success: true,
        result: plan,
        confidence: 0.8,
        explanation: `Generated ${planType} plan`,
        suggestions: [
          "Break down a step further",
          "Add timeline estimates",
          "Set reminders for steps",
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

function detectPlanType(query: string): string {
  const lower = query.toLowerCase();
  
  if (lower.includes("project") || lower.includes("build")) return "project";
  if (lower.includes("goal") || lower.includes("achieve")) return "goal";
  if (lower.includes("learn") || lower.includes("study")) return "learning";
  if (lower.includes("day") || lower.includes("week")) return "schedule";
  if (lower.includes("step") || lower.includes("how to")) return "howto";
  
  return "general";
}

async function generatePlan(
  query: string, 
  type: string, 
  context: Record<string, any>
): Promise<any> {
  // Extract the goal from the query
  const goal = query
    .replace(/plan|create|make|help me|i want to|how to/gi, "")
    .trim();

  const steps = generateSteps(goal, type);
  
  return {
    answer: `Here's a plan for: "${goal}"`,
    plan: {
      goal,
      type,
      steps,
      estimatedTime: estimateTime(steps),
      tips: generateTips(type),
    },
  };
}

function generateSteps(goal: string, type: string): Array<{
  step: number;
  title: string;
  description: string;
  duration?: string;
}> {
  // Generate contextual steps based on plan type
  const baseSteps = [
    { step: 1, title: "Define your objectives", description: `Clarify exactly what you want to achieve with: ${goal}` },
    { step: 2, title: "Gather resources", description: "Identify what you need to get started" },
    { step: 3, title: "Create a timeline", description: "Set realistic deadlines for each milestone" },
    { step: 4, title: "Take first action", description: "Start with the smallest possible step" },
    { step: 5, title: "Review and adjust", description: "Track progress and adapt as needed" },
  ];

  // Customize based on type
  switch (type) {
    case "project":
      return [
        { step: 1, title: "Define project scope", description: "Outline what's included and excluded", duration: "1-2 hours" },
        { step: 2, title: "Break into milestones", description: "Identify major deliverables", duration: "2-3 hours" },
        { step: 3, title: "Assign resources", description: "Determine who does what", duration: "1 hour" },
        { step: 4, title: "Create timeline", description: "Set deadlines for each milestone", duration: "1-2 hours" },
        { step: 5, title: "Execute and track", description: "Begin work and monitor progress", duration: "Ongoing" },
      ];
    
    case "learning":
      return [
        { step: 1, title: "Set learning goal", description: `Define what mastery looks like for: ${goal}`, duration: "30 mins" },
        { step: 2, title: "Find resources", description: "Books, courses, tutorials, mentors", duration: "1-2 hours" },
        { step: 3, title: "Create study schedule", description: "Block dedicated learning time", duration: "30 mins" },
        { step: 4, title: "Practice actively", description: "Apply what you learn immediately", duration: "Ongoing" },
        { step: 5, title: "Test yourself", description: "Regular review and self-assessment", duration: "Weekly" },
      ];

    default:
      return baseSteps;
  }
}

function estimateTime(steps: any[]): string {
  // Simple estimation based on step count
  const hours = steps.length * 2;
  if (hours < 8) return `${hours} hours`;
  if (hours < 40) return `${Math.ceil(hours / 8)} days`;
  return `${Math.ceil(hours / 40)} weeks`;
}

function generateTips(type: string): string[] {
  const tips: Record<string, string[]> = {
    project: [
      "Break large tasks into smaller, manageable pieces",
      "Set buffer time for unexpected challenges",
      "Communicate progress regularly",
    ],
    learning: [
      "Practice spaced repetition for better retention",
      "Teach others to solidify your understanding",
      "Connect new knowledge to what you already know",
    ],
    goal: [
      "Make your goals SMART (Specific, Measurable, Achievable, Relevant, Time-bound)",
      "Track progress visually",
      "Celebrate small wins along the way",
    ],
    general: [
      "Start before you feel ready",
      "Focus on progress, not perfection",
      "Review and adjust your plan regularly",
    ],
  };

  return tips[type] || tips.general;
}

export default planningAgent;

