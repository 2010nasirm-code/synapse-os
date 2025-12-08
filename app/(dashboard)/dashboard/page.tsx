"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  RefreshCw,
  Zap,
  Brain,
  Activity,
  Command,
  Grid,
  LayoutGrid,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/supabase/client";
import { DraggableGrid } from "@/components/dashboard/draggable-grid";
import { NexusMode } from "@/components/nexus/nexus-mode";
import { useNexus } from "@/hooks/use-nexus-features";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    items: 0,
    suggestions: 0,
    automations: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'widgets'>('cards');
  const [isNexusModeOpen, setIsNexusModeOpen] = useState(false);
  const [nexusData, setNexusData] = useState<any>(null);
  const supabase = getSupabaseClient();
  
  const { systemHealth, adaptiveComplexity, predictiveFlow } = useNexus();

  useEffect(() => {
    fetchStats();
    fetchNexusData();
    
    // Real-time subscription
    const channel = supabase.channel('dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => { fetchStats(); fetchNexusData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suggestions' }, () => { fetchStats(); fetchNexusData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'automations' }, () => { fetchStats(); fetchNexusData(); })
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

  async function fetchNexusData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [items, automations, suggestions] = await Promise.all([
      supabase.from("items").select("*").eq("user_id", user.id),
      supabase.from("automations").select("*").eq("user_id", user.id),
      supabase.from("suggestions").select("*").eq("user_id", user.id),
    ]);

    setNexusData({
      items: items.data || [],
      automations: automations.data || [],
      suggestions: suggestions.data || [],
    });
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
      await supabase.from("items").insert({ ...item, user_id: user.id } as any);
    }

    // Sample automations
    const sampleAutomations = [
      { name: "Daily Task Reminder", trigger_type: "schedule", action_type: "generate_suggestion", is_active: true },
      { name: "High Priority Alert", trigger_type: "item_created", action_type: "webhook", is_active: true },
      { name: "Completion Tracker", trigger_type: "item_completed", action_type: "generate_report", is_active: false },
    ];

    for (const auto of sampleAutomations) {
      await supabase.from("automations").insert({ ...auto, user_id: user.id } as any);
    }

    fetchStats();
    fetchNexusData();
    setGenerating(false);
  }

  const cards = [
    { title: "Total Items", value: stats.items, icon: ListTodo, color: "text-blue-500", bg: "bg-blue-500/10", href: "/tracker" },
    { title: "Completed", value: stats.completed, icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10", href: "/tracker" },
    { title: "Suggestions", value: stats.suggestions, icon: Sparkles, color: "text-yellow-500", bg: "bg-yellow-500/10", href: "/suggestions" },
    { title: "Automations", value: stats.automations, icon: Workflow, color: "text-purple-500", bg: "bg-purple-500/10", href: "/automations" },
  ];

  const predictions = predictiveFlow.predictions.slice(0, 3);

  return (
    <>
      <div className="p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-bold mb-2"
            >
              Dashboard
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-muted-foreground"
            >
              Welcome back! Here&apos;s your overview.
            </motion.p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('cards')}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === 'cards' ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('widgets')}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === 'widgets' ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            {adaptiveComplexity.isFeatureAvailable('nexus-mode') && (
              <Button 
                variant="outline" 
                onClick={() => setIsNexusModeOpen(true)} 
                className="gap-2"
              >
                <Maximize2 className="h-4 w-4" />
                Nexus Mode
              </Button>
            )}
            <Button variant="outline" onClick={fetchStats} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* System Status Bar */}
        {systemHealth.health && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mb-6 p-3 rounded-lg flex items-center justify-between",
              systemHealth.health.status === 'healthy' && "bg-green-500/10 border border-green-500/20",
              systemHealth.health.status === 'degraded' && "bg-yellow-500/10 border border-yellow-500/20",
              systemHealth.health.status === 'critical' && "bg-red-500/10 border border-red-500/20"
            )}
          >
            <div className="flex items-center gap-3">
              <Activity className={cn(
                "h-5 w-5",
                systemHealth.health.status === 'healthy' && "text-green-500",
                systemHealth.health.status === 'degraded' && "text-yellow-500",
                systemHealth.health.status === 'critical' && "text-red-500"
              )} />
              <span className="text-sm">
                System Health: <strong>{systemHealth.health.score}%</strong>
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Level: {adaptiveComplexity.profile?.level}</span>
              <span>•</span>
              <span>{adaptiveComplexity.profile?.actionsCount} actions</span>
            </div>
          </motion.div>
        )}

        {viewMode === 'cards' ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {cards.map((card, i) => (
                <Link key={card.title} href={card.href}>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className="p-6 rounded-xl border bg-card hover:border-primary/50 transition-all cursor-pointer card-hover"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("p-2 rounded-lg", card.bg)}>
                        <card.icon className={cn("h-6 w-6", card.color)} />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-3xl font-bold mb-1">
                      {loading ? <span className="text-muted-foreground">-</span> : card.value}
                    </div>
                    <div className="text-sm text-muted-foreground">{card.title}</div>
                  </motion.div>
                </Link>
              ))}
            </div>

            {/* Predictions Section */}
            {predictions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mb-8 p-4 rounded-xl border bg-card/50"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">Predicted Next Actions</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {predictions.map((pred, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-500 text-sm flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                      {pred.action}
                      <span className="text-xs opacity-70">({Math.round(pred.confidence)}%)</span>
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Quick Actions */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-8"
            >
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
                <Link href="/nexus">
                  <Button variant="outline" className="gap-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
                    <Zap className="h-4 w-4 text-indigo-500" />
                    Open Nexus
                  </Button>
                </Link>
                <Button variant="outline" className="gap-2" onClick={generateSampleData} disabled={generating}>
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                  {generating ? "Generating..." : "Add Sample Data"}
                </Button>
              </div>
            </motion.div>

            {/* Keyboard Shortcut Hint */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mb-8 p-4 rounded-xl border bg-muted/30 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Command className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Press <kbd className="px-2 py-0.5 rounded bg-background border text-xs">Ctrl</kbd> + <kbd className="px-2 py-0.5 rounded bg-background border text-xs">K</kbd> to open Command Palette
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {adaptiveComplexity.availableFeatures.length} features available
              </span>
            </motion.div>

            {/* Getting Started */}
            {stats.items === 0 && !loading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 rounded-xl border-2 border-dashed text-center"
              >
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
              </motion.div>
            )}
          </>
        ) : (
          /* Draggable Widgets View */
          <DraggableGrid />
        )}
      </div>

      {/* Nexus Mode Overlay */}
      {nexusData && (
        <NexusMode 
          isActive={isNexusModeOpen} 
          onToggle={() => setIsNexusModeOpen(false)} 
          data={nexusData}
        />
      )}
    </>
  );
}
