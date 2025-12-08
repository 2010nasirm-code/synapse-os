/**
 * Resource Agent
 * Manages resources, files, and external data sources
 */

import type { Agent, AgentInput, AgentOutput } from "../core/types";

const resourceAgent: Agent = {
  id: "resource",
  name: "Resource Agent",
  description: "Manages resources, files, and external data sources",
  capabilities: ["file-management", "resource-tracking", "data-sources", "assets"],
  priority: 12,
  enabled: true,

  async process(input: AgentInput): Promise<AgentOutput> {
    const { query, context } = input;

    try {
      const action = detectResourceAction(query);
      const result = await handleResourceAction(action, query, context);

      return {
        success: true,
        result,
        confidence: 0.8,
        explanation: `Resource ${action} completed`,
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

function detectResourceAction(query: string): string {
  const lower = query.toLowerCase();
  
  if (lower.includes("upload") || lower.includes("add file")) return "upload";
  if (lower.includes("list") || lower.includes("show") || lower.includes("files")) return "list";
  if (lower.includes("download") || lower.includes("export")) return "download";
  if (lower.includes("delete") || lower.includes("remove")) return "delete";
  
  return "info";
}

async function handleResourceAction(
  action: string,
  query: string,
  context: Record<string, any>
): Promise<any> {
  switch (action) {
    case "list":
      return listResources(context);
    case "upload":
      return uploadResource(query);
    case "download":
      return downloadResource(query);
    case "info":
    default:
      return getResourceInfo(context);
  }
}

function listResources(context: Record<string, any>): any {
  // Mock resource list
  const resources = [
    { id: "1", name: "Notes.md", type: "markdown", size: "2.3 KB" },
    { id: "2", name: "Data Export.json", type: "json", size: "45 KB" },
    { id: "3", name: "Backup.zip", type: "archive", size: "1.2 MB" },
  ];

  return {
    answer: `📁 **Your Resources**\n\n` +
      resources.map(r => `• ${r.name} (${r.size})`).join("\n"),
    resources,
  };
}

function uploadResource(query: string): any {
  return {
    answer: `📤 Ready to upload. Drag and drop a file or use the file picker.`,
    action: "open_file_picker",
    supportedTypes: ["json", "csv", "txt", "md", "png", "jpg"],
  };
}

function downloadResource(query: string): any {
  return {
    answer: `📥 Select what to export:\n\n` +
      `• All Items (JSON/CSV)\n` +
      `• Memory & History\n` +
      `• Automations\n` +
      `• Full Backup`,
    action: "select_export",
    formats: ["json", "csv", "zip"],
  };
}

function getResourceInfo(context: Record<string, any>): any {
  const items = context.items?.length || 0;
  const memories = 0; // Would get from memory system

  return {
    answer: `📊 **Resource Summary**\n\n` +
      `• Items: ${items}\n` +
      `• Memories: ${memories}\n` +
      `• Storage Used: ~${Math.round(items * 0.5)} KB`,
    stats: { items, memories, storageKB: items * 0.5 },
  };
}

export default resourceAgent;


