"use client";

/**
 * Nexus Dashboard Page
 * Main hub for Nexus AI interactions
 */

import React, { useState, useEffect } from "react";
import { 
  Brain, 
  Sparkles, 
  Zap, 
  History, 
  Search,
  MessageSquare,
  TrendingUp,
  Cloud,
  Loader2,
  Send
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CommandBar, useCommandBar } from "@/nexus-core/ui/components";
import { ResultViewer } from "@/nexus-core/ui/components/ResultViewer";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function NexusDashboard() {
  const commandBar = useCommandBar();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [stats, setStats] = useState({
    queries: 0,
    memories: 0,
    automations: 0,
  });
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [topTags, setTopTags] = useState<string[]>([]);
  const supabase = getSupabaseClient();

  // Get authenticated user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      }
    });
  }, []);

  // Fetch initial data
  useEffect(() => {
    if (userId) {
      fetchMemorySummary();
    }
  }, [userId]);

  const fetchMemorySummary = async () => {
    if (!userId) return;
    try {
      const response = await fetch(`/api/nexus/memory`);
      const data = await response.json();
      if (data.summary) {
        setStats(prev => ({
          ...prev,
          memories: data.summary.totalItems || 0,
        }));
        setTopTags(data.summary.topTags || []);
      }
    } catch (error) {
      console.error("Failed to fetch memory summary:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading || !userId) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/nexus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
        }),
      });

      const data = await response.json();
      setResult(data);
      setRecentQueries(prev => [query, ...prev.slice(0, 4)]);
      setStats(prev => ({ ...prev, queries: prev.queries + 1 }));
    } catch (error) {
      setResult({
        success: false,
        answer: "Failed to process query. Please try again.",
        agentsUsed: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Summarize my tasks",
    "What should I focus on today?",
    "Generate insights from my data",
    "Create a plan for this week",
    "What patterns do you see?",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
      {/* Command Bar */}
      {userId && (
        <CommandBar
          isOpen={commandBar.isOpen}
          onClose={commandBar.close}
          userId={userId}
        />
      )}

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                Nexus
              </h1>
              <p className="text-muted-foreground">Your AI Intelligence Hub</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={commandBar.open}
            className="gap-2"
          >
            <Search className="h-4 w-4" />
            Quick Search
            <kbd className="ml-2 px-1.5 py-0.5 bg-secondary rounded text-xs">⌘K</kbd>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-6xl mx-auto mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.queries}</p>
                <p className="text-sm text-muted-foreground">Queries Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Cloud className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.memories}</p>
                <p className="text-sm text-muted-foreground">Memories Stored</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-fuchsia-500/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-fuchsia-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.automations}</p>
                <p className="text-sm text-muted-foreground">Automations Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Query Area */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Query Input & Results */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                Ask Nexus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask anything... Get insights, create plans, analyze data..."
                    rows={3}
                    className="w-full p-4 bg-secondary rounded-xl resize-none outline-none focus:ring-2 focus:ring-violet-500/50"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(e);
                      }
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {quickPrompts.slice(0, 3).map((prompt, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setQuery(prompt)}
                        className="px-3 py-1 text-sm bg-secondary hover:bg-secondary/80 rounded-full transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                  <Button type="submit" disabled={loading || !query.trim()}>
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span className="ml-2">Send</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                Response
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResultViewer
                result={result}
                onSuggestionClick={(s) => setQuery(s)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Queries */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                Recent Queries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentQueries.length > 0 ? (
                <div className="space-y-2">
                  {recentQueries.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(q)}
                      className="w-full text-left p-2 text-sm bg-secondary hover:bg-secondary/80 rounded-lg truncate transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent queries
                </p>
              )}
            </CardContent>
          </Card>

          {/* Topic Cloud */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Cloud className="h-4 w-4" />
                Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {topTags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 text-xs bg-violet-500/10 text-violet-500 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Start asking questions to build your topic cloud
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(prompt)}
                  className="w-full text-left p-2 text-sm hover:bg-secondary rounded-lg transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

