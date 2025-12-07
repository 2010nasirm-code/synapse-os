/**
 * Sample Data Generator for Beta Testing
 * Creates realistic test data for all modules
 */

export interface SampleItem {
  name: string;
  description: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
  category: string;
  due_date?: string;
}

export interface SampleAutomation {
  name: string;
  description: string;
  trigger_type: "schedule" | "item_created" | "item_completed" | "date_based";
  trigger_config: Record<string, any>;
  action_type: "update_item" | "generate_suggestion" | "generate_report" | "webhook";
  action_config: Record<string, any>;
  is_active: boolean;
}

export interface SampleSuggestion {
  title: string;
  description: string;
  type: "optimization" | "reminder" | "insight" | "automation";
  impact: "low" | "medium" | "high";
  action_data: Record<string, any>;
}

// Sample items with realistic data
export const sampleItems: SampleItem[] = [
  {
    name: "Complete project proposal",
    description: "Draft and finalize the Q4 project proposal for client review",
    priority: "high",
    status: "in_progress",
    category: "Work",
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  },
  {
    name: "Review team performance",
    description: "Quarterly performance review for team members",
    priority: "medium",
    status: "pending",
    category: "Work",
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  },
  {
    name: "Update documentation",
    description: "Update API documentation with new endpoints",
    priority: "low",
    status: "pending",
    category: "Development",
  },
  {
    name: "Fix login bug",
    description: "Users reporting intermittent login failures",
    priority: "high",
    status: "completed",
    category: "Development",
  },
  {
    name: "Schedule dentist appointment",
    description: "Annual dental checkup",
    priority: "medium",
    status: "pending",
    category: "Personal",
    due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  },
  {
    name: "Prepare presentation slides",
    description: "Create slides for the board meeting",
    priority: "high",
    status: "in_progress",
    category: "Work",
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  },
  {
    name: "Research competitor products",
    description: "Analyze top 5 competitor offerings",
    priority: "medium",
    status: "pending",
    category: "Research",
  },
  {
    name: "Gym workout",
    description: "Weekly strength training session",
    priority: "low",
    status: "completed",
    category: "Health",
  },
  {
    name: "Code review for PR #234",
    description: "Review and approve new feature implementation",
    priority: "medium",
    status: "completed",
    category: "Development",
  },
  {
    name: "Plan team building event",
    description: "Organize Q4 team outing",
    priority: "low",
    status: "pending",
    category: "Work",
  },
  {
    name: "Setup CI/CD pipeline",
    description: "Configure automated testing and deployment",
    priority: "high",
    status: "in_progress",
    category: "Development",
  },
  {
    name: "Read industry report",
    description: "Review latest market trends report",
    priority: "low",
    status: "pending",
    category: "Research",
  },
];

// Sample automations
export const sampleAutomations: SampleAutomation[] = [
  {
    name: "Daily Task Reminder",
    description: "Send daily summary of pending high-priority tasks",
    trigger_type: "schedule",
    trigger_config: { frequency: "daily", time: "09:00" },
    action_type: "generate_report",
    action_config: { report_type: "daily_summary" },
    is_active: true,
  },
  {
    name: "New Item Notification",
    description: "Notify when high-priority item is created",
    trigger_type: "item_created",
    trigger_config: { priority: "high" },
    action_type: "webhook",
    action_config: { notify: true },
    is_active: true,
  },
  {
    name: "Completion Celebration",
    description: "Generate insight when item is completed",
    trigger_type: "item_completed",
    trigger_config: {},
    action_type: "generate_suggestion",
    action_config: { type: "celebration" },
    is_active: false,
  },
  {
    name: "Due Date Alert",
    description: "Alert when items are due in 2 days",
    trigger_type: "date_based",
    trigger_config: { days_before: 2 },
    action_type: "update_item",
    action_config: { mark_urgent: true },
    is_active: true,
  },
];

// Sample suggestions
export const sampleSuggestions: SampleSuggestion[] = [
  {
    title: "Prioritize high-impact tasks",
    description: "You have 3 high-priority items pending. Consider focusing on these first to maximize productivity.",
    type: "optimization",
    impact: "high",
    action_data: { action: "focus_high_priority" },
  },
  {
    title: "Schedule regular breaks",
    description: "Based on your activity patterns, taking short breaks every 90 minutes could improve focus.",
    type: "insight",
    impact: "medium",
    action_data: { action: "schedule_breaks" },
  },
  {
    title: "Create automation for recurring tasks",
    description: "You have several similar tasks. Setting up an automation could save 2 hours per week.",
    type: "automation",
    impact: "high",
    action_data: { action: "create_automation", template: "recurring_tasks" },
  },
  {
    title: "Review overdue items",
    description: "2 items are past their due date. Consider updating or rescheduling them.",
    type: "reminder",
    impact: "medium",
    action_data: { action: "review_overdue" },
  },
];

// Test user accounts
export const testAccounts = [
  {
    email: "beta.tester@synapseos.test",
    password: "BetaTest2024!",
    name: "Beta Tester",
    role: "tester",
  },
  {
    email: "admin@synapseos.test",
    password: "AdminTest2024!",
    name: "Admin User",
    role: "admin",
  },
  {
    email: "demo@synapseos.test",
    password: "DemoUser2024!",
    name: "Demo User",
    role: "demo",
  },
];

// Function to generate sample data for a user
export async function generateSampleData(
  supabase: any,
  userId: string,
  options: {
    items?: boolean;
    automations?: boolean;
    suggestions?: boolean;
  } = { items: true, automations: true, suggestions: true }
) {
  const results = {
    items: [] as any[],
    automations: [] as any[],
    suggestions: [] as any[],
    errors: [] as string[],
  };

  try {
    // Generate items
    if (options.items) {
      for (const item of sampleItems) {
        const { data, error } = await supabase
          .from("items")
          .insert({ ...item, user_id: userId })
          .select()
          .single();

        if (error) {
          results.errors.push(`Item error: ${error.message}`);
        } else {
          results.items.push(data);
        }
      }
    }

    // Generate automations
    if (options.automations) {
      for (const automation of sampleAutomations) {
        const { data, error } = await supabase
          .from("automations")
          .insert({ ...automation, user_id: userId })
          .select()
          .single();

        if (error) {
          results.errors.push(`Automation error: ${error.message}`);
        } else {
          results.automations.push(data);
        }
      }
    }

    // Generate suggestions
    if (options.suggestions) {
      for (const suggestion of sampleSuggestions) {
        const { data, error } = await supabase
          .from("suggestions")
          .insert({ ...suggestion, user_id: userId })
          .select()
          .single();

        if (error) {
          results.errors.push(`Suggestion error: ${error.message}`);
        } else {
          results.suggestions.push(data);
        }
      }
    }
  } catch (error: any) {
    results.errors.push(`General error: ${error.message}`);
  }

  return results;
}

// Function to clear all user data (for reset)
export async function clearUserData(supabase: any, userId: string) {
  const tables = ["items", "automations", "suggestions", "analytics_events"];
  const errors: string[] = [];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("user_id", userId);

    if (error) {
      errors.push(`Failed to clear ${table}: ${error.message}`);
    }
  }

  return { success: errors.length === 0, errors };
}

