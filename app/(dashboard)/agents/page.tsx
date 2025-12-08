"use client";

import { useState, useEffect } from "react";
import { 
  Bot, 
  Plus, 
  Trash2, 
  Loader2, 
  Sparkles, 
  Zap, 
  Brain, 
  Bell,
  ToggleLeft,
  ToggleRight,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase/client";

interface Agent {
  id: string;
  name: string;
  description: string;
  type: string;
  is_active: boolean;
  config: Record<string, any>;
  created_at: string;
}

const agentTypes = [
  { 
    id: "suggestion", 
    name: "Suggestion Agent", 
    icon: Sparkles, 
    color: "text-yellow-500",
    description: "Analyzes data and generates smart suggestions"
  },
  { 
    id: "automation", 
    name: "Automation Agent", 
    icon: Zap, 
    color: "text-purple-500",
    description: "Executes automations and triggers actions"
  },
  { 
    id: "analytics", 
    name: "Analytics Agent", 
    icon: Brain, 
    color: "text-blue-500",
    description: "Tracks patterns and generates insights"
  },
  { 
    id: "reminder", 
    name: "Reminder Agent", 
    icon: Bell, 
    color: "text-red-500",
    description: "Sends notifications for due dates and tasks"
  },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: "", type: "suggestion", description: "" });
  const [creating, setCreating] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if agents table exists, if not use local state
    const { data, error } = await supabase
      .from("automations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Map automations to agents format
    const mappedAgents = (data || []).map(a => ({
      id: a.id,
      name: a.name,
      description: a.description || "",
      type: a.action_type === "generate_suggestion" ? "suggestion" : 
            a.action_type === "generate_report" ? "analytics" : "automation",
      is_active: a.is_active,
      config: a.action_config || {},
      created_at: a.created_at,
    }));

    setAgents(mappedAgents);
    setLoading(false);
  }

  async function createAgent() {
    if (!newAgent.name.trim()) return;
    setCreating(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const actionType = newAgent.type === "suggestion" ? "generate_suggestion" :
                       newAgent.type === "analytics" ? "generate_report" :
                       newAgent.type === "reminder" ? "webhook" : "update_item";

    await supabase.from("automations").insert({
      user_id: user.id,
      name: newAgent.name,
      description: newAgent.description || `${newAgent.type} agent`,
      trigger_type: "schedule",
      action_type: actionType,
      is_active: true,
    });

    setNewAgent({ name: "", type: "suggestion", description: "" });
    setShowCreate(false);
    setCreating(false);
    fetchAgents();
  }

  async function toggleAgent(id: string, isActive: boolean) {
    await supabase.from("automations").update({ is_active: !isActive }).eq("id", id);
    fetchAgents();
  }

  async function deleteAgent(id: string) {
    await supabase.from("automations").delete().eq("id", id);
    fetchAgents();
  }

  const getAgentIcon = (type: string) => {
    const agentType = agentTypes.find(t => t.id === type);
    if (!agentType) return Bot;
    return agentType.icon;
  };

  const getAgentColor = (type: string) => {
    const agentType = agentTypes.find(t => t.id === type);
    return agentType?.color || "text-gray-500";
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">AI Agents</h1>
          <p className="text-muted-foreground">Create and manage intelligent agents.</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Agent
        </Button>
      </div>

      {/* Create Agent Form */}
      {showCreate && (
        <div className="p-6 rounded-xl border bg-card mb-8">
          <h3 className="font-semibold mb-4">Create New Agent</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Agent Name</label>
              <Input
                placeholder="My Smart Agent"
                value={newAgent.name}
                onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Agent Type</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {agentTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setNewAgent({ ...newAgent, type: type.id })}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      newAgent.type === type.id 
                        ? "border-primary bg-primary/5" 
                        : "hover:border-primary/50"
                    }`}
                  >
                    <type.icon className={`h-6 w-6 mx-auto mb-2 ${type.color}`} />
                    <p className="text-sm font-medium">{type.name.replace(" Agent", "")}</p>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description (optional)</label>
              <Input
                placeholder="What this agent does..."
                value={newAgent.description}
                onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createAgent} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Agent
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Types Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {agentTypes.map((type) => (
          <div key={type.id} className="p-4 rounded-xl border bg-card">
            <type.icon className={`h-8 w-8 mb-3 ${type.color}`} />
            <h3 className="font-semibold text-sm">{type.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
          </div>
        ))}
      </div>

      {/* Your Agents */}
      <h2 className="text-xl font-semibold mb-4">Your Agents ({agents.length})</h2>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 rounded-xl border-2 border-dashed">
          <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
          <p className="text-muted-foreground mb-4">Create your first AI agent to automate tasks.</p>
          <Button onClick={() => setShowCreate(true)}>Create Agent</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => {
            const Icon = getAgentIcon(agent.type);
            return (
              <div key={agent.id} className="p-6 rounded-xl border bg-card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted`}>
                      <Icon className={`h-6 w-6 ${getAgentColor(agent.type)}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{agent.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{agent.type} Agent</p>
                    </div>
                  </div>
                  <button onClick={() => toggleAgent(agent.id, agent.is_active)}>
                    {agent.is_active ? (
                      <ToggleRight className="h-6 w-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {agent.description || "No description"}
                </p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    agent.is_active 
                      ? "bg-green-500/10 text-green-500" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {agent.is_active ? "Active" : "Inactive"}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => deleteAgent(agent.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
