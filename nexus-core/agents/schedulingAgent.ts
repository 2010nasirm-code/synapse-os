/**
 * Scheduling Agent
 * Manages calendar, reminders, and time-based actions
 */

import type { Agent, AgentInput, AgentOutput } from "../core/types";

const schedulingAgent: Agent = {
  id: "scheduling",
  name: "Scheduling Agent",
  description: "Manages calendar, reminders, and time-based planning",
  capabilities: ["scheduling", "calendar", "reminders", "time-management"],
  priority: 10,
  enabled: true,

  async process(input: AgentInput): Promise<AgentOutput> {
    const { query, context } = input;

    try {
      const action = detectSchedulingAction(query);
      const result = await handleSchedulingAction(action, query, context);

      return {
        success: true,
        result,
        confidence: 0.8,
        explanation: `Scheduling ${action} completed`,
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

function detectSchedulingAction(query: string): string {
  const lower = query.toLowerCase();
  
  if (lower.includes("schedule") || lower.includes("book")) return "schedule";
  if (lower.includes("remind") || lower.includes("alert")) return "reminder";
  if (lower.includes("when") || lower.includes("time")) return "availability";
  if (lower.includes("calendar") || lower.includes("events")) return "calendar";
  
  return "suggest";
}

async function handleSchedulingAction(
  action: string,
  query: string,
  context: Record<string, any>
): Promise<any> {
  switch (action) {
    case "schedule":
      return createScheduleEntry(query);
    case "reminder":
      return createReminder(query);
    case "availability":
      return checkAvailability(query, context);
    case "calendar":
      return getCalendarOverview(context);
    default:
      return suggestScheduling(context);
  }
}

function createScheduleEntry(query: string): any {
  const timeMatch = query.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  const dateMatch = query.match(/(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2})/i);
  
  const time = timeMatch ? timeMatch[1] : "TBD";
  const date = dateMatch ? dateMatch[1] : "TBD";
  const event = query.replace(/schedule|book|for|at|on/gi, "").trim();

  return {
    answer: `📅 **Scheduled:** ${event}\n• Date: ${date}\n• Time: ${time}\n\nI'll remind you before the event.`,
    event: { title: event, date, time, status: "scheduled" },
  };
}

function createReminder(query: string): any {
  const timeMatch = query.match(/in (\d+)\s*(minute|hour|day|week)/i);
  let reminderTime = "soon";
  
  if (timeMatch) {
    reminderTime = `in ${timeMatch[1]} ${timeMatch[2]}(s)`;
  }

  const reminder = query.replace(/remind me|reminder|to|in \d+ \w+/gi, "").trim();

  return {
    answer: `⏰ **Reminder Set:** ${reminder}\n• When: ${reminderTime}`,
    reminder: { content: reminder, when: reminderTime, status: "active" },
  };
}

function checkAvailability(query: string, context: Record<string, any>): any {
  // Mock availability check
  const slots = [
    { time: "09:00 - 10:00", status: "available" },
    { time: "10:00 - 11:00", status: "busy" },
    { time: "11:00 - 12:00", status: "available" },
    { time: "14:00 - 15:00", status: "available" },
    { time: "15:00 - 16:00", status: "busy" },
  ];

  const available = slots.filter(s => s.status === "available");

  return {
    answer: `📊 **Availability Today**\n\n` +
      slots.map(s => `${s.status === "available" ? "✅" : "❌"} ${s.time}`).join("\n") +
      `\n\n${available.length} slots available`,
    slots,
  };
}

function getCalendarOverview(context: Record<string, any>): any {
  const items = context.items || [];
  const upcomingTasks = items
    .filter((i: any) => i.due_date && i.status !== "completed")
    .slice(0, 5);

  return {
    answer: `📅 **Calendar Overview**\n\n` +
      (upcomingTasks.length > 0
        ? "**Upcoming:**\n" + upcomingTasks.map((t: any) => `• ${t.name}`).join("\n")
        : "No upcoming events scheduled."),
    upcoming: upcomingTasks,
  };
}

function suggestScheduling(context: Record<string, any>): any {
  return {
    answer: `📅 **Scheduling Options**\n\n` +
      `• Schedule an event\n` +
      `• Set a reminder\n` +
      `• Check availability\n` +
      `• View calendar\n\n` +
      `What would you like to do?`,
    actions: ["schedule", "remind", "availability", "calendar"],
  };
}

export default schedulingAgent;


