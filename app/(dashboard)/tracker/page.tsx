"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Check, Clock, AlertCircle, Loader2 } from "lucide-react";
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
  created_at: string;
}

export default function TrackerPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [newItem, setNewItem] = useState("");
  const [adding, setAdding] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchItems();
  }, []);

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

    const { error } = await supabase.from("items").insert({
      user_id: user.id,
      name: newItem,
      priority: "medium",
      status: "pending",
    });

    if (!error) {
      setNewItem("");
      fetchItems();
    }
    setAdding(false);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("items").update({ status }).eq("id", id);
    fetchItems();
  }

  async function deleteItem(id: string) {
    await supabase.from("items").delete().eq("id", id);
    fetchItems();
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
      case "high": return "border-l-red-500";
      case "medium": return "border-l-yellow-500";
      default: return "border-l-green-500";
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tracker</h1>
        <p className="text-muted-foreground">Manage your items and tasks.</p>
      </div>

      {/* Add Item */}
      <div className="flex gap-2 mb-6">
        <Input
          placeholder="Add a new item..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addItem()}
        />
        <Button onClick={addItem} disabled={adding}>
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No items yet. Add your first one above!
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-lg border border-l-4 ${getPriorityColor(item.priority)} bg-card flex items-center justify-between`}
            >
              <div className="flex items-center gap-3">
                <button onClick={() => updateStatus(item.id, item.status === "completed" ? "pending" : "completed")}>
                  {getStatusIcon(item.status)}
                </button>
                <span className={item.status === "completed" ? "line-through text-muted-foreground" : ""}>
                  {item.name}
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

