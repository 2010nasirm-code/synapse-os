"use client";

/**
 * Nexus Memory Page
 * View and manage stored memories
 */

import React, { useState, useEffect } from "react";
import {
  Brain,
  Search,
  Trash2,
  Plus,
  Clock,
  Tag,
  Filter,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";

interface MemoryItem {
  id: string;
  type: string;
  content: string;
  metadata: {
    tags?: string[];
    source?: string;
  };
  createdAt: string;
  accessCount: number;
}

export default function NexusMemoryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemory, setNewMemory] = useState({ content: "", type: "fact" });
  const [userId, setUserId] = useState<string>("");
  const supabase = getSupabaseClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (userId) {
      fetchMemories();
    }
  }, [userId]);

  const fetchMemories = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/nexus/memory`);
      const data = await response.json();
      setMemories(data.recent || []);
    } catch (error) {
      console.error("Failed to fetch memories:", error);
    } finally {
      setLoading(false);
    }
  };

  const addMemory = async () => {
    if (!newMemory.content.trim() || !userId) return;

    try {
      const response = await fetch("/api/nexus/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newMemory.content,
          type: newMemory.type,
        }),
      });

      if (response.ok) {
        fetchMemories();
        setNewMemory({ content: "", type: "fact" });
        setShowAddModal(false);
      }
    } catch (error) {
      console.error("Failed to add memory:", error);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    if (!confirm("Are you sure you want to delete this memory?") || !userId) return;

    try {
      const response = await fetch("/api/nexus/memory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memoryId }),
      });

      if (response.ok) {
        setMemories(memories.filter((m) => m.id !== memoryId));
      }
    } catch (error) {
      console.error("Failed to delete memory:", error);
    }
  };

  const filteredMemories = memories.filter((m) => {
    const matchesSearch = m.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || m.type === filterType;
    return matchesSearch && matchesType;
  });

  const memoryTypes = ["all", "fact", "preference", "context", "conversation", "insight"];

  const typeColors: Record<string, string> = {
    fact: "bg-blue-500/10 text-blue-500",
    preference: "bg-green-500/10 text-green-500",
    context: "bg-yellow-500/10 text-yellow-500",
    conversation: "bg-purple-500/10 text-purple-500",
    insight: "bg-pink-500/10 text-pink-500",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Memory</h1>
              <p className="text-muted-foreground">
                {memories.length} memories stored
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchMemories}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Memory
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search memories..."
                  className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Type Filter */}
              <div className="flex gap-2 flex-wrap">
                {memoryTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-3 py-1.5 text-sm rounded-lg capitalize transition-colors ${
                      filterType === type
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Memory List */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading memories...
          </div>
        ) : filteredMemories.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {searchQuery || filterType !== "all"
                  ? "No memories match your search"
                  : "No memories stored yet. Start by asking Nexus questions!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredMemories.map((memory) => (
              <Card key={memory.id} className="group">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full capitalize ${
                            typeColors[memory.type] || "bg-gray-500/10 text-gray-500"
                          }`}
                        >
                          {memory.type}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(memory.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{memory.content}</p>
                      {memory.metadata?.tags && memory.metadata.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {memory.metadata.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs bg-secondary rounded-full flex items-center gap-1"
                            >
                              <Tag className="h-3 w-3" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteMemory(memory.id)}
                      className="p-2 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Memory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative w-full max-w-md bg-background border border-border rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Add Memory</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground">Type</label>
                <select
                  value={newMemory.type}
                  onChange={(e) => setNewMemory({ ...newMemory, type: e.target.value })}
                  className="w-full mt-1 p-2 bg-secondary rounded-lg"
                >
                  <option value="fact">Fact</option>
                  <option value="preference">Preference</option>
                  <option value="context">Context</option>
                  <option value="insight">Insight</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Content</label>
                <textarea
                  value={newMemory.content}
                  onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
                  placeholder="What should Nexus remember?"
                  rows={4}
                  className="w-full mt-1 p-3 bg-secondary rounded-lg resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button onClick={addMemory}>Save Memory</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

