/**
 * Nexus Configuration
 * Central configuration management
 */

import type { NexusConfig, FeatureFlags, RateLimits } from "./types";

const defaultFeatures: FeatureFlags = {
  memoryEnabled: true,
  automationsEnabled: true,
  multiAgentEnabled: true,
  vectorSearchEnabled: true,
  offlineModeEnabled: false,
};

const defaultLimits: RateLimits = {
  queriesPerMinute: 60,
  tokensPerDay: 100000,
  memoryItemsPerUser: 10000,
  automationsPerUser: 50,
};

export const defaultConfig: NexusConfig = {
  version: "1.0.0",
  environment: (process.env.NODE_ENV as any) || "development",
  features: defaultFeatures,
  limits: defaultLimits,
  agents: [
    { id: "reasoning", enabled: true, priority: 1 },
    { id: "memory", enabled: true, priority: 2 },
    { id: "planning", enabled: true, priority: 3 },
    { id: "analytics", enabled: true, priority: 4 },
    { id: "insight", enabled: true, priority: 5 },
    { id: "automation", enabled: true, priority: 6 },
    { id: "search", enabled: true, priority: 7 },
    { id: "summarization", enabled: true, priority: 8 },
    { id: "creativity", enabled: true, priority: 9 },
    { id: "scheduling", enabled: true, priority: 10 },
    { id: "notification", enabled: true, priority: 11 },
    { id: "resource", enabled: true, priority: 12 },
    { id: "vector", enabled: true, priority: 13 },
    { id: "backup", enabled: true, priority: 14 },
    { id: "moderation", enabled: true, priority: 15 },
  ],
  skills: [
    { id: "reasoning", enabled: true },
    { id: "summarization", enabled: true },
    { id: "translation", enabled: true },
    { id: "codeAnalysis", enabled: true },
    { id: "dataVisualizer", enabled: true },
    { id: "taskPlanner", enabled: true },
    { id: "writingAssistant", enabled: true },
  ],
};

class ConfigManager {
  private config: NexusConfig;

  constructor() {
    this.config = { ...defaultConfig };
    this.loadFromEnv();
  }

  private loadFromEnv(): void {
    // Override from environment
    if (process.env.NEXUS_MEMORY_ENABLED === "false") {
      this.config.features.memoryEnabled = false;
    }
    if (process.env.NEXUS_QUERIES_PER_MINUTE) {
      this.config.limits.queriesPerMinute = parseInt(process.env.NEXUS_QUERIES_PER_MINUTE);
    }
  }

  get(): NexusConfig {
    return this.config;
  }

  getFeatures(): FeatureFlags {
    return this.config.features;
  }

  getLimits(): RateLimits {
    return this.config.limits;
  }

  isAgentEnabled(agentId: string): boolean {
    const agent = this.config.agents.find(a => a.id === agentId);
    return agent?.enabled ?? false;
  }

  isSkillEnabled(skillId: string): boolean {
    const skill = this.config.skills.find(s => s.id === skillId);
    return skill?.enabled ?? false;
  }

  update(partial: Partial<NexusConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  enableAgent(agentId: string): void {
    const agent = this.config.agents.find(a => a.id === agentId);
    if (agent) agent.enabled = true;
  }

  disableAgent(agentId: string): void {
    const agent = this.config.agents.find(a => a.id === agentId);
    if (agent) agent.enabled = false;
  }
}

export const configManager = new ConfigManager();
export const getConfig = () => configManager.get();


