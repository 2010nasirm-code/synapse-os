"use client";

import { useState, useEffect } from "react";
import { Workflow, Plus, Trash2, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase/client";

interface Automation {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  action_type: string;
  is_active: boolean;
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchAutomations();
  }, []);

  async function fetchAutomations() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("automations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setAutomations(data || []);
    setLoading(false);
  }

  async function addAutomation() {
    if (!newName.trim()) return;
    setAdding(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("automations").insert({
      user_id: user.id,
      name: newName,
      description: "Custom automation",
      trigger_type: "item_created",
      action_type: "generate_suggestion",
      is_active: true,
    });

    if (!error) {
      setNewName("");
      setShowForm(false);
      fetchAutomations();
    }
    setAdding(false);
  }

  async function toggleAutomation(id: string, is_active: boolean) {
    await supabase.from("automations").update({ is_active: !is_active }).eq("id", id);
    fetchAutomations();
  }

  async function deleteAutomation(id: string) {
    await supabase.from("automations").delete().eq("id", id);
    fetchAutomations();
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Automations</h1>
          <p className="text-muted-foreground">Automate your workflow with smart triggers.</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Automation
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="p-4 mb-6 rounded-xl border bg-card">
          <div className="flex gap-2">
            <Input
              placeholder="Automation name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAutomation()}
            />
            <Button onClick={addAutomation} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : automations.length === 0 ? (
        <div className="text-center py-12">
          <Workflow className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No automations yet</h3>
          <p className="text-muted-foreground mb-4">Create your first automation to streamline your workflow.</p>
          <Button onClick={() => setShowForm(true)}>Create Automation</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map((automation) => (
            <div key={automation.id} className="p-4 rounded-xl border bg-card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => toggleAutomation(automation.id, automation.is_active)}>
                  {automation.is_active ? (
                    <ToggleRight className="h-6 w-6 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
                <div>
                  <h3 className="font-semibold">{automation.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {automation.trigger_type} → {automation.action_type}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => deleteAutomation(automation.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


