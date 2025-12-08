"use client";

import { useState, useEffect } from "react";
import { Sparkles, Check, X, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";

interface Suggestion {
  id: string;
  title: string;
  description: string;
  type: string;
  impact: string;
  status: string;
}

export default function SuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchSuggestions();
  }, []);

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
    try {
      const response = await fetch("/api/ai/suggestions", { method: "POST" });
      if (response.ok) {
        fetchSuggestions();
      }
    } catch (error) {
      console.error("Failed to generate suggestions");
    }
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
    return <Sparkles className="h-4 w-4" />;
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Smart Suggestions</h1>
          <p className="text-muted-foreground">AI-powered recommendations for your workflow.</p>
        </div>
        <Button onClick={generateSuggestions} disabled={generating} className="gap-2">
          {generating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Generate Suggestions
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No suggestions yet</h3>
          <p className="text-muted-foreground mb-4">Add some items first, then generate suggestions.</p>
          <Button onClick={generateSuggestions} disabled={generating}>
            Generate Suggestions
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {suggestions.filter(s => s.status === "pending").map((suggestion) => (
            <div key={suggestion.id} className="p-6 rounded-xl border bg-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getTypeIcon(suggestion.type)}
                  <span className={`px-2 py-1 rounded-full text-xs ${getImpactColor(suggestion.impact)}`}>
                    {suggestion.impact} impact
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => updateStatus(suggestion.id, "dismissed")}>
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
      )}
    </div>
  );
}

