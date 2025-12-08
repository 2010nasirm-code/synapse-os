"use client";

import { useState, useEffect } from "react";
import { Sparkles, Check, X, Loader2, RefreshCw, Brain, Zap, Bell, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: string;
  impact: string;
  status: string;
  created_at: string;
}

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchSuggestions();
    
    // Real-time subscription
    const channel = supabase.channel('suggestions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suggestions' }, fetchSuggestions)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  async function fetchSuggestions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("suggestions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setSuggestions(data || []);
    setLoading(false);
  }

  async function generateSuggestions() {
    setGenerating(true);
    setAnalysis("Analyzing your data...");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get items for analysis
    const { data: items } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", user.id);

    if (!items || items.length === 0) {
      setAnalysis("Add some items to the Tracker first to get AI suggestions!");
      setGenerating(false);
      return;
    }

    // Analyze data
    const pending = items.filter(i => i.status === "pending");
    const highPriority = items.filter(i => i.priority === "high" && i.status !== "completed");
    const completed = items.filter(i => i.status === "completed");
    const overdue = items.filter(i => i.due_date && new Date(i.due_date) < new Date() && i.status !== "completed");

    const suggestions: { title: string; description: string; type: string; impact: string }[] = [];

    // Generate contextual suggestions
    if (highPriority.length >= 2) {
      suggestions.push({
        title: "Focus on high-priority items first",
        description: `You have ${highPriority.length} high-priority items pending. Consider tackling "${highPriority[0].name}" first to maximize impact.`,
        type: "optimization",
        impact: "high"
      });
    }

    if (completed.length >= 3) {
      suggestions.push({
        title: "Great progress! Keep the momentum 🔥",
        description: `You've completed ${completed.length} items. You're on a roll! Consider tackling another task while you're in the zone.`,
        type: "insight",
        impact: "medium"
      });
    }

    if (pending.length > 5) {
      suggestions.push({
        title: "Break down your backlog",
        description: `You have ${pending.length} pending items. Consider prioritizing or breaking larger tasks into smaller, manageable pieces.`,
        type: "optimization",
        impact: "medium"
      });
    }

    if (overdue.length > 0) {
      suggestions.push({
        title: "Review overdue items",
        description: `${overdue.length} items are past their due date. Consider rescheduling or completing them soon.`,
        type: "reminder",
        impact: "high"
      });
    }

    // Category-based suggestion
    const categories: Record<string, number> = {};
    items.forEach(i => {
      if (i.category) categories[i.category] = (categories[i.category] || 0) + 1;
    });
    const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
    if (topCategory && topCategory[1] >= 3) {
      suggestions.push({
        title: `Create automation for ${topCategory[0]}`,
        description: `You have ${topCategory[1]} items in ${topCategory[0]}. Setting up an automation could save you time on recurring tasks.`,
        type: "automation",
        impact: "high"
      });
    }

    // Default suggestion if no specific ones
    if (suggestions.length === 0) {
      suggestions.push({
        title: "Keep up the good work!",
        description: "Your tasks look well-organized. Consider adding due dates to track deadlines better.",
        type: "insight",
        impact: "low"
      });
    }

    // Save suggestions to database
    for (const sugg of suggestions) {
      await supabase.from("suggestions").insert({
        user_id: user.id,
        ...sugg,
        status: "pending"
      });
    }

    setAnalysis(`Analyzed ${items.length} items and generated ${suggestions.length} suggestions based on your patterns.`);
    fetchSuggestions();
    setGenerating(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("suggestions").update({ status }).eq("id", id);
    fetchSuggestions();
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "bg-red-500/10 text-red-500";
      case "medium": return "bg-yellow-500/10 text-yellow-500";
      default: return "bg-green-500/10 text-green-500";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "optimization": return <Zap className="h-4 w-4" />;
      case "reminder": return <Bell className="h-4 w-4" />;
      case "automation": return <Workflow className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const pendingSuggestions = suggestions.filter(s => s.status === "pending");
  const appliedSuggestions = suggestions.filter(s => s.status === "applied");

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Smart Suggestions</h1>
          <p className="text-muted-foreground">AI-powered recommendations based on your data.</p>
        </div>
        <Button onClick={generateSuggestions} disabled={generating} className="gap-2">
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {generating ? "Analyzing..." : "Generate Suggestions"}
        </Button>
      </div>

      {/* Analysis Banner */}
      {analysis && (
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 mb-6 flex items-center gap-3">
          <Brain className="h-5 w-5 text-primary" />
          <p className="text-sm">{analysis}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : pendingSuggestions.length === 0 && appliedSuggestions.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No suggestions yet</h3>
          <p className="text-muted-foreground mb-4">Add items to the Tracker, then generate suggestions.</p>
          <Button onClick={generateSuggestions} disabled={generating}>
            Generate Suggestions
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Suggestions */}
          {pendingSuggestions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Pending ({pendingSuggestions.length})</h2>
              <div className="grid gap-4">
                {pendingSuggestions.map((suggestion) => (
                  <div key={suggestion.id} className="p-6 rounded-xl border bg-card hover:border-primary/30 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          {getTypeIcon(suggestion.type)}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${getImpactColor(suggestion.impact)}`}>
                          {suggestion.impact} impact
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                          {suggestion.type}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(suggestion.id, "dismissed")}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => updateStatus(suggestion.id, "applied")}>
                          <Check className="h-4 w-4 mr-1" />
                          Apply
                        </Button>
                      </div>
                    </div>
                    <h3 className="font-semibold mb-2">{suggestion.title}</h3>
                    <p className="text-muted-foreground text-sm">{suggestion.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Applied Suggestions */}
          {appliedSuggestions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Applied ({appliedSuggestions.length})</h2>
              <div className="grid gap-2">
                {appliedSuggestions.slice(0, 5).map((suggestion) => (
                  <div key={suggestion.id} className="p-4 rounded-lg border bg-muted/30 opacity-60">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm line-through">{suggestion.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
