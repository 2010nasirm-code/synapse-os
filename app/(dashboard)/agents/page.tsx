"use client";

import { Bot, Sparkles, Zap, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AgentsPage() {
  const agents = [
    {
      name: "Suggestion Agent",
      description: "Analyzes your data and generates smart suggestions",
      icon: Sparkles,
      status: "active",
    },
    {
      name: "Automation Agent", 
      description: "Executes your automations and triggers",
      icon: Zap,
      status: "active",
    },
    {
      name: "Analytics Agent",
      description: "Tracks patterns and generates insights",
      icon: Brain,
      status: "active",
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Agents</h1>
        <p className="text-muted-foreground">Intelligent agents working for you.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <div key={agent.name} className="p-6 rounded-xl border bg-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <agent.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{agent.name}</h3>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                  {agent.status}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{agent.description}</p>
          </div>
        ))}
      </div>

      {/* Coming Soon */}
      <div className="mt-8 p-8 rounded-xl border-2 border-dashed text-center">
        <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">More Agents Coming Soon</h3>
        <p className="text-muted-foreground mb-4">
          Custom AI agents for your specific workflows.
        </p>
      </div>
    </div>
  );
}

