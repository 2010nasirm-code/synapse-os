/**
 * Notification Agent
 * Manages notifications, alerts, and user communication
 */

import type { Agent, AgentInput, AgentOutput } from "../core/types";

interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "alert";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// In-memory notification store
const notifications: Map<string, Notification[]> = new Map();

const notificationAgent: Agent = {
  id: "notification",
  name: "Notification Agent",
  description: "Manages notifications, alerts, and user communication",
  capabilities: ["notifications", "alerts", "email", "push"],
  priority: 11,
  enabled: true,

  async process(input: AgentInput): Promise<AgentOutput> {
    const { query, context } = input;
    const userId = context.userId || "default";

    try {
      const action = detectNotificationAction(query);
      const result = await handleNotificationAction(action, userId, query);

      return {
        success: true,
        result,
        confidence: 0.9,
        explanation: `Notification ${action} completed`,
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

function detectNotificationAction(query: string): string {
  const lower = query.toLowerCase();
  
  if (lower.includes("send") || lower.includes("notify")) return "send";
  if (lower.includes("show") || lower.includes("list") || lower.includes("get")) return "list";
  if (lower.includes("clear") || lower.includes("dismiss")) return "clear";
  if (lower.includes("settings") || lower.includes("configure")) return "settings";
  
  return "list";
}

async function handleNotificationAction(
  action: string,
  userId: string,
  query: string
): Promise<any> {
  switch (action) {
    case "send":
      return sendNotification(userId, query);
    case "list":
      return listNotifications(userId);
    case "clear":
      return clearNotifications(userId);
    case "settings":
      return getNotificationSettings();
    default:
      return listNotifications(userId);
  }
}

function sendNotification(userId: string, query: string): any {
  const message = query.replace(/send|notify|notification|about/gi, "").trim();
  
  const notification: Notification = {
    id: `notif-${Date.now()}`,
    type: "info",
    title: "New Notification",
    message: message || "You have a new notification",
    read: false,
    createdAt: new Date().toISOString(),
  };

  const userNotifs = notifications.get(userId) || [];
  userNotifs.push(notification);
  notifications.set(userId, userNotifs);

  return {
    answer: `🔔 Notification sent: "${message}"`,
    notification,
  };
}

function listNotifications(userId: string): any {
  const userNotifs = notifications.get(userId) || [];
  const unread = userNotifs.filter(n => !n.read);

  if (userNotifs.length === 0) {
    return {
      answer: "📭 No notifications",
      notifications: [],
      unreadCount: 0,
    };
  }

  let answer = `🔔 **Notifications** (${unread.length} unread)\n\n`;
  
  userNotifs.slice(-5).reverse().forEach(n => {
    const icon = n.read ? "○" : "●";
    answer += `${icon} ${n.title}\n  ${n.message}\n\n`;
  });

  return {
    answer,
    notifications: userNotifs.slice(-10),
    unreadCount: unread.length,
  };
}

function clearNotifications(userId: string): any {
  const count = (notifications.get(userId) || []).length;
  notifications.set(userId, []);

  return {
    answer: `✅ Cleared ${count} notification(s)`,
    cleared: count,
  };
}

function getNotificationSettings(): any {
  return {
    answer: `⚙️ **Notification Settings**\n\n` +
      `• Push Notifications: Enabled\n` +
      `• Email Digest: Daily\n` +
      `• Sound: On\n` +
      `• Quiet Hours: 22:00 - 08:00`,
    settings: {
      push: true,
      email: "daily",
      sound: true,
      quietHours: { start: "22:00", end: "08:00" },
    },
  };
}

export default notificationAgent;


