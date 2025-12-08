"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, Loader2, PieChart, Activity } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalItems: 0,
    completed: 0,
    pending: 0,
    inProgress: 0,
    completionRate: 0,
    suggestionsApplied: 0,
    automationsActive: 0,
    byPriority: { high: 0, medium: 0, low: 0 },
    byCategory: {} as Record<string, number>,
    recentActivity: [] as { date: string; completed: number }[],
  });
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchAnalytics();
    
    // Real-time updates
    const channel = supabase.channel('analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, fetchAnalytics)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  async function fetchAnalytics() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [items, suggestions, automations] = await Promise.all([
      supabase.from("items").select("*").eq("user_id", user.id),
      supabase.from("suggestions").select("status").eq("user_id", user.id),
      supabase.from("automations").select("is_active").eq("user_id", user.id),
    ]);

    const itemsData = items.data || [];
    const completed = itemsData.filter(i => i.status === "completed").length;
    const pending = itemsData.filter(i => i.status === "pending").length;
    const inProgress = itemsData.filter(i => i.status === "in_progress").length;

    // By priority
    const byPriority = {
      high: itemsData.filter(i => i.priority === "high").length,
      medium: itemsData.filter(i => i.priority === "medium").length,
      low: itemsData.filter(i => i.priority === "low").length,
    };

    // By category
    const byCategory: Record<string, number> = {};
    itemsData.forEach(i => {
      const cat = i.category || "Uncategorized";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    // Recent activity (last 7 days)
    const recentActivity = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayCompleted = itemsData.filter(item => 
        item.status === "completed" && 
        item.updated_at?.startsWith(dateStr)
      ).length;
      recentActivity.push({ date: dateStr, completed: dayCompleted });
    }

    setStats({
      totalItems: itemsData.length,
      completed,
      pending,
      inProgress,
      completionRate: itemsData.length > 0 ? Math.round((completed / itemsData.length) * 100) : 0,
      suggestionsApplied: (suggestions.data || []).filter(s => s.status === "applied").length,
      automationsActive: (automations.data || []).filter(a => a.is_active).length,
      byPriority,
      byCategory,
      recentActivity,
    });
    setLoading(false);
  }

  const statCards = [
    { label: "Total Items", value: stats.totalItems, color: "text-blue-500", bg: "bg-blue-500" },
    { label: "Completed", value: stats.completed, color: "text-green-500", bg: "bg-green-500" },
    { label: "In Progress", value: stats.inProgress, color: "text-yellow-500", bg: "bg-yellow-500" },
    { label: "Pending", value: stats.pending, color: "text-red-500", bg: "bg-red-500" },
  ];

  const maxActivity = Math.max(...stats.recentActivity.map(a => a.completed), 1);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-muted-foreground">Track your productivity and progress.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="p-6 rounded-xl border bg-card">
            <div className={`text-3xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Completion Progress */}
        <div className="p-6 rounded-xl border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Completion Rate</h3>
          </div>
          <div className="text-4xl font-bold text-primary mb-4">{stats.completionRate}%</div>
          <div className="h-4 rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>{stats.completed} completed</span>
            <span>{stats.totalItems} total</span>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="p-6 rounded-xl border bg-card">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">By Priority</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="flex-1">High</span>
              <span className="font-semibold">{stats.byPriority.high}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="flex-1">Medium</span>
              <span className="font-semibold">{stats.byPriority.medium}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="flex-1">Low</span>
              <span className="font-semibold">{stats.byPriority.low}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <div className="p-6 rounded-xl border bg-card mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">7-Day Activity</h3>
        </div>
        <div className="flex items-end gap-2 h-32">
          {stats.recentActivity.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div 
                className="w-full bg-primary/20 rounded-t transition-all hover:bg-primary/40"
                style={{ 
                  height: `${(day.completed / maxActivity) * 100}%`,
                  minHeight: day.completed > 0 ? '8px' : '2px'
                }}
              />
              <span className="text-xs text-muted-foreground">
                {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      {Object.keys(stats.byCategory).length > 0 && (
        <div className="p-6 rounded-xl border bg-card mb-8">
          <h3 className="font-semibold mb-4">By Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(stats.byCategory).map(([cat, count]) => (
              <div key={cat} className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="font-semibold">{count}</div>
                <div className="text-sm text-muted-foreground">{cat}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      <div className="p-6 rounded-xl border bg-card">
        <h3 className="font-semibold mb-4">Insights</h3>
        <div className="space-y-3">
          {stats.completionRate >= 70 ? (
            <div className="flex items-center gap-2 text-green-500">
              <TrendingUp className="h-5 w-5" />
              <span>Excellent! You're crushing your tasks.</span>
            </div>
          ) : stats.completionRate >= 40 ? (
            <div className="flex items-center gap-2 text-yellow-500">
              <BarChart3 className="h-5 w-5" />
              <span>Good progress! Keep the momentum going.</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-500">
              <TrendingDown className="h-5 w-5" />
              <span>Consider breaking tasks into smaller pieces.</span>
            </div>
          )}
          {stats.automationsActive > 0 && (
            <div className="flex items-center gap-2 text-purple-500">
              <Activity className="h-5 w-5" />
              <span>{stats.automationsActive} automations helping you stay productive.</span>
            </div>
          )}
          {stats.suggestionsApplied > 0 && (
            <div className="flex items-center gap-2 text-blue-500">
              <TrendingUp className="h-5 w-5" />
              <span>You've applied {stats.suggestionsApplied} AI suggestions!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
