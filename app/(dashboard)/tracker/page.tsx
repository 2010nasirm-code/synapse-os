"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Check, Clock, AlertCircle, Loader2, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase/client";

interface Item {
  id: string;
  name: string;
  description: string;
  priority: string;
  status: string;
  category: string;
  due_date: string;
  created_at: string;
}

export default function TrackerPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newCategory, setNewCategory] = useState("");
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchItems();
    
    // Real-time subscription
    const channel = supabase.channel('items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, fetchItems)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  async function fetchItems() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setItems(data || []);
    setLoading(false);
  }

  async function addItem() {
    if (!newItem.trim()) return;
    setAdding(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("items").insert({
      user_id: user.id,
      name: newItem,
      priority: newPriority,
      status: "pending",
      category: newCategory || null,
    });

    setNewItem("");
    setNewCategory("");
    setAdding(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("items").update({ status }).eq("id", id);
  }

  async function deleteItem(id: string) {
    await supabase.from("items").delete().eq("id", id);
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <Check className="h-4 w-4 text-green-500" />;
      case "in_progress": return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "border-l-red-500 bg-red-500/5";
      case "medium": return "border-l-yellow-500 bg-yellow-500/5";
      default: return "border-l-green-500 bg-green-500/5";
    }
  };

  const filteredItems = items
    .filter(item => {
      if (filter === "all") return true;
      if (filter === "pending") return item.status === "pending";
      if (filter === "in_progress") return item.status === "in_progress";
      if (filter === "completed") return item.status === "completed";
      if (filter === "high") return item.priority === "high";
      return true;
    })
    .filter(item => 
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase())
    );

  const stats = {
    total: items.length,
    pending: items.filter(i => i.status === "pending").length,
    completed: items.filter(i => i.status === "completed").length,
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Tracker</h1>
        <p className="text-muted-foreground">Manage your items and tasks.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl border bg-card text-center">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </div>
        <div className="p-4 rounded-xl border bg-card text-center">
          <div className="text-2xl font-bold text-yellow-500">{stats.pending}</div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </div>
        <div className="p-4 rounded-xl border bg-card text-center">
          <div className="text-2xl font-bold text-green-500">{stats.completed}</div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </div>
      </div>

      {/* Add Item Form */}
      <div className="p-4 rounded-xl border bg-card mb-6">
        <div className="flex flex-col md:flex-row gap-2">
          <Input
            placeholder="Add a new item..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            className="flex-1"
          />
          <Input
            placeholder="Category (optional)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="md:w-40"
          />
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            className="h-10 px-3 rounded-md border bg-background"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <Button onClick={addItem} disabled={adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "pending", "in_progress", "completed", "high"].map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f === "in_progress" ? "In Progress" : f}
            </Button>
          ))}
        </div>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {items.length === 0 ? "No items yet. Add your first one above!" : "No items match your filter."}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border border-l-4 ${getPriorityColor(item.priority)} flex items-center justify-between transition-all hover:shadow-md`}
            >
              <div className="flex items-center gap-3 flex-1">
                <button 
                  onClick={() => updateStatus(
                    item.id, 
                    item.status === "completed" ? "pending" : 
                    item.status === "pending" ? "in_progress" : "completed"
                  )}
                  className="hover:scale-110 transition-transform"
                >
                  {getStatusIcon(item.status)}
                </button>
                <div className="flex-1">
                  <span className={item.status === "completed" ? "line-through text-muted-foreground" : ""}>
                    {item.name}
                  </span>
                  {item.category && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {item.category}
                    </span>
                  )}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  item.priority === "high" ? "bg-red-500/10 text-red-500" :
                  item.priority === "medium" ? "bg-yellow-500/10 text-yellow-500" :
                  "bg-green-500/10 text-green-500"
                }`}>
                  {item.priority}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
