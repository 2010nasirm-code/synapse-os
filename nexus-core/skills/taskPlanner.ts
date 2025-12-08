/**
 * Task Planner Skill
 * Creates structured task plans and breakdowns
 */

import type { Skill, SkillInput, SkillOutput } from "../core/types";

const taskPlannerSkill: Skill = {
  id: "taskPlanner",
  name: "Task Planner",
  description: "Creates structured task plans and breakdowns",
  category: "productivity",

  async execute(input: SkillInput): Promise<SkillOutput> {
    const { data, options } = input;
    const goal = typeof data === "string" ? data : data.goal || data.task;
    const depth = options?.depth || 2;

    try {
      const plan = createTaskPlan(goal, depth);
      return { success: true, result: plan };
    } catch (error: any) {
      return { success: false, result: null, error: error.message };
    }
  },
};

interface Task {
  id: string;
  title: string;
  description?: string;
  subtasks?: Task[];
  duration?: string;
  priority?: "high" | "medium" | "low";
}

function createTaskPlan(goal: string, depth: number): any {
  const mainTasks = generateMainTasks(goal);
  
  const plan: Task[] = mainTasks.map((task, i) => ({
    id: `task-${i + 1}`,
    title: task.title,
    description: task.description,
    duration: task.duration,
    priority: i === 0 ? "high" : i < 3 ? "medium" : "low",
    subtasks: depth > 1 ? generateSubtasks(task.title) : undefined,
  }));

  const totalDuration = plan.reduce((sum, t) => {
    const hours = parseDuration(t.duration || "1h");
    return sum + hours;
  }, 0);

  return {
    goal,
    plan,
    summary: {
      totalTasks: plan.length,
      totalSubtasks: plan.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0),
      estimatedDuration: formatDuration(totalDuration),
    },
  };
}

function generateMainTasks(goal: string): Array<{ title: string; description: string; duration: string }> {
  // Generic task breakdown based on common patterns
  const tasks = [
    {
      title: "Define requirements",
      description: `Clearly outline what needs to be achieved for: ${goal}`,
      duration: "1h",
    },
    {
      title: "Research and gather resources",
      description: "Collect necessary information and materials",
      duration: "2h",
    },
    {
      title: "Create initial plan",
      description: "Outline the approach and key milestones",
      duration: "1h",
    },
    {
      title: "Execute core work",
      description: "Implement the main components",
      duration: "4h",
    },
    {
      title: "Review and refine",
      description: "Check quality and make improvements",
      duration: "2h",
    },
    {
      title: "Finalize and deliver",
      description: "Complete final touches and deliver",
      duration: "1h",
    },
  ];

  return tasks;
}

function generateSubtasks(parentTask: string): Task[] {
  return [
    { id: "sub-1", title: `Break down ${parentTask}`, duration: "15m" },
    { id: "sub-2", title: `Identify blockers`, duration: "10m" },
    { id: "sub-3", title: `Complete main work`, duration: "30m" },
    { id: "sub-4", title: `Verify completion`, duration: "10m" },
  ];
}

function parseDuration(duration: string): number {
  const match = duration.match(/(\d+)(m|h|d)/);
  if (!match) return 1;
  
  const [, value, unit] = match;
  const hours = {
    m: parseInt(value) / 60,
    h: parseInt(value),
    d: parseInt(value) * 8,
  }[unit] || 1;

  return hours;
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} minutes`;
  if (hours < 8) return `${hours.toFixed(1)} hours`;
  return `${(hours / 8).toFixed(1)} days`;
}

export default taskPlannerSkill;


