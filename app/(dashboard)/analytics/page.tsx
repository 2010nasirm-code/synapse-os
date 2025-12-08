"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
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
  });
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  async function fetchAnalytics() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [items, suggestions, automations] = await Promise.all([
      supabase.from("items").select("status").eq("user_id", user.id),
      supabase.from("suggestions").select("status").eq("user_id", user.id),
      supabase.from("automations").select("is_active").eq("user_id", user.id),
    ]);

    const itemsData = items.data || [];
    const completed = itemsData.filter(i => i.status === "completed").length;
    const pending = itemsData.filter(i => i.status === "pending").length;
    const inProgress = itemsData.filter(i => i.status === "in_progress").length;

    setStats({
      totalItems: itemsData.length,
      completed,
      pending,
      inProgress,
      completionRate: itemsData.length > 0 ? Math.round((completed / itemsData.length) * 100) : 0,
      suggestionsApplied: (suggestions.data || []).filter(s => s.status === "applied").length,
      automationsActive: (automations.data || []).filter(a => a.is_active).length,
    });
    setLoading(false);
  }

  const statCards = [
    { label: "Total Items", value: stats.totalItems, color: "text-blue-500" },
    { label: "Completed", value: stats.completed, color: "text-green-500" },
    { label: "In Progress", value: stats.inProgress, color: "text-yellow-500" },
    { label: "Pending", value: stats.pending, color: "text-red-500" },
    { label: "Completion Rate", value: `${stats.completionRate}%`, color: "text-purple-500" },
    { label: "Suggestions Applied", value: stats.suggestionsApplied, color: "text-pink-500" },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analytics</h1>
        <p className="text-muted-foreground">Track your productivity and progress.</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {statCards.map((stat) => (
              <div key={stat.label} className="p-6 rounded-xl border bg-card">
                <div className={`text-3xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Completion Progress */}
          <div className="p-6 rounded-xl border bg-card mb-8">
            <h3 className="font-semibold mb-4">Completion Progress</h3>
            <div className="h-4 rounded-full bg-muted overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-muted-foreground">
              <span>{stats.completed} completed</span>
              <span>{stats.totalItems} total</span>
            </div>
          </div>

          {/* Insights */}
          <div className="p-6 rounded-xl border bg-card">
            <h3 className="font-semibold mb-4">Insights</h3>
            <div className="space-y-3">
              {stats.completionRate >= 70 ? (
                <div className="flex items-center gap-2 text-green-500">
                  <TrendingUp className="h-5 w-5" />
                  <span>Great job! You're making excellent progress.</span>
                </div>
              ) : stats.completionRate >= 40 ? (
                <div className="flex items-center gap-2 text-yellow-500">
                  <BarChart3 className="h-5 w-5" />
                  <span>Keep going! You're on track.</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-500">
                  <TrendingDown className="h-5 w-5" />
                  <span>Consider focusing on completing pending items.</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

