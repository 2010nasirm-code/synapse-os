"use client";

/**
 * Nexus Settings Page
 * Configure Nexus behavior and agents
 */

import React, { useState, useEffect } from "react";
import {
  Settings,
  Brain,
  Shield,
  Database,
  Zap,
  ToggleLeft,
  Save,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Agent {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  capabilities: string[];
}

export default function NexusSettingsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    memoryEnabled: true,
    memoryRetention: 30,
    automationsEnabled: true,
    privacyMode: false,
    debugMode: false,
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/nexus/agent");
      const data = await response.json();
      setAgents(data.agents || []);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAgent = async (agentId: string) => {
    setAgents(agents.map(a => 
      a.id === agentId ? { ...a, enabled: !a.enabled } : a
    ));
  };

  const saveSettings = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Settings className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Nexus Settings</h1>
              <p className="text-muted-foreground">Configure your AI assistant</p>
            </div>
          </div>
          <Button onClick={saveSettings} disabled={saving}>
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              General
            </CardTitle>
            <CardDescription>Core Nexus settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Memory System</p>
                <p className="text-sm text-muted-foreground">
                  Enable long-term memory storage
                </p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, memoryEnabled: !settings.memoryEnabled })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.memoryEnabled ? "bg-primary" : "bg-secondary"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    settings.memoryEnabled ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Automations</p>
                <p className="text-sm text-muted-foreground">
                  Allow automated actions
                </p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, automationsEnabled: !settings.automationsEnabled })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.automationsEnabled ? "bg-primary" : "bg-secondary"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    settings.automationsEnabled ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Memory Retention</p>
                <p className="text-sm text-muted-foreground">
                  Days to keep memories
                </p>
              </div>
              <select
                value={settings.memoryRetention}
                onChange={(e) => setSettings({ ...settings, memoryRetention: parseInt(e.target.value) })}
                className="px-3 py-1.5 bg-secondary rounded-lg"
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={365}>1 year</option>
                <option value={0}>Forever</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy
            </CardTitle>
            <CardDescription>Control your data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Privacy Mode</p>
                <p className="text-sm text-muted-foreground">
                  Don&apos;t store any conversation data
                </p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, privacyMode: !settings.privacyMode })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.privacyMode ? "bg-primary" : "bg-secondary"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    settings.privacyMode ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            <div className="pt-4 border-t border-border space-y-2">
              <Button variant="outline" className="w-full justify-start">
                <Database className="h-4 w-4 mr-2" />
                Export All Data
              </Button>
              <Button variant="outline" className="w-full justify-start text-red-500 hover:text-red-500">
                <Database className="h-4 w-4 mr-2" />
                Delete All Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Agents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Agents
            </CardTitle>
            <CardDescription>Enable or disable AI agents</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading agents...</p>
            ) : (
              <div className="space-y-3">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {agent.description}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleAgent(agent.id)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        agent.enabled ? "bg-primary" : "bg-secondary"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          agent.enabled ? "translate-x-6" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Debug */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ToggleLeft className="h-5 w-5" />
              Developer
            </CardTitle>
            <CardDescription>Advanced settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Debug Mode</p>
                <p className="text-sm text-muted-foreground">
                  Show detailed processing info
                </p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, debugMode: !settings.debugMode })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.debugMode ? "bg-primary" : "bg-secondary"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    settings.debugMode ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


