"use client";

import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  ListTodo, 
  Sparkles, 
  Workflow, 
  TrendingUp,
  Plus,
  ArrowRight,
  Database,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    items: 0,
    suggestions: 0,
    automations: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchStats();
    
    // Real-time subscription
    const channel = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suggestions' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'automations' }, fetchStats)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  async function fetchStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [items, suggestions, automations] = await Promise.all([
      supabase.from("items").select("id, status").eq("user_id", user.id),
      supabase.from("suggestions").select("id").eq("user_id", user.id),
      supabase.from("automations").select("id").eq("user_id", user.id),
    ]);

    setStats({
      items: items.data?.length || 0,
      suggestions: suggestions.data?.length || 0,
      automations: automations.data?.length || 0,
      completed: items.data?.filter(i => i.status === "completed").length || 0,
    });
    setLoading(false);
  }

  async function generateSampleData() {
    setGenerating(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Sample items
    const sampleItems = [
      { name: "Complete project proposal", priority: "high", status: "in_progress", category: "Work" },
      { name: "Review team feedback", priority: "medium", status: "pending", category: "Work" },
      { name: "Update documentation", priority: "low", status: "pending", category: "Development" },
      { name: "Fix login bug", priority: "high", status: "completed", category: "Development" },
      { name: "Schedule dentist", priority: "medium", status: "pending", category: "Personal" },
      { name: "Prepare presentation", priority: "high", status: "in_progress", category: "Work" },
      { name: "Research competitors", priority: "medium", status: "pending", category: "Research" },
      { name: "Gym workout", priority: "low", status: "completed", category: "Health" },
      { name: "Code review PR #234", priority: "medium", status: "completed", category: "Development" },
      { name: "Plan team event", priority: "low", status: "pending", category: "Work" },
    ];

    for (const item of sampleItems) {
      await supabase.from("items").insert({ ...item, user_id: user.id });
    }

    // Sample automations
    const sampleAutomations = [
      { name: "Daily Task Reminder", trigger_type: "schedule", action_type: "generate_suggestion", is_active: true },
      { name: "High Priority Alert", trigger_type: "item_created", action_type: "webhook", is_active: true },
      { name: "Completion Tracker", trigger_type: "item_completed", action_type: "generate_report", is_active: false },
    ];

    for (const auto of sampleAutomations) {
      await supabase.from("automations").insert({ ...auto, user_id: user.id });
    }

    fetchStats();
    setGenerating(false);
  }

  const cards = [
    { title: "Total Items", value: stats.items, icon: ListTodo, color: "text-blue-500", href: "/tracker" },
    { title: "Completed", value: stats.completed, icon: TrendingUp, color: "text-green-500", href: "/tracker" },
    { title: "Suggestions", value: stats.suggestions, icon: Sparkles, color: "text-yellow-500", href: "/suggestions" },
    { title: "Automations", value: stats.automations, icon: Workflow, color: "text-purple-500", href: "/automations" },
  ];

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
        </div>
        <Button variant="outline" onClick={fetchStats} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <div className="p-6 rounded-xl border bg-card hover:border-primary/50 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-4">
                <card.icon className={`h-8 w-8 ${card.color}`} />
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold mb-1">
                {loading ? "-" : card.value}
              </div>
              <div className="text-sm text-muted-foreground">{card.title}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/tracker">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </Link>
          <Link href="/suggestions">
            <Button variant="outline" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Get Suggestions
            </Button>
          </Link>
          <Link href="/automations">
            <Button variant="outline" className="gap-2">
              <Workflow className="h-4 w-4" />
              Create Automation
            </Button>
          </Link>
          <Button variant="outline" className="gap-2" onClick={generateSampleData} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
            {generating ? "Generating..." : "Add Sample Data"}
          </Button>
        </div>
      </div>

      {/* Getting Started */}
      {stats.items === 0 && !loading && (
        <div className="p-8 rounded-xl border-2 border-dashed text-center">
          <LayoutDashboard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Get Started</h3>
          <p className="text-muted-foreground mb-4">
            Add your first item or generate sample data to explore all features.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/tracker">
              <Button>Add Your First Item</Button>
            </Link>
            <Button variant="outline" onClick={generateSampleData} disabled={generating}>
              Generate Sample Data
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
