"use client";

import { useState, useEffect } from "react";
import { User, Mail, Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function fetchUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setName(user?.user_metadata?.full_name || "");
      setLoading(false);
    }
    fetchUser();
  }, [supabase]);

  async function updateProfile() {
    setSaving(true);
    await supabase.auth.updateUser({
      data: { full_name: name }
    });
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <p className="text-muted-foreground">Manage your account information.</p>
      </div>

      <div className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{name || "User"}</h2>
            <p className="text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Name */}
        <div className="p-6 rounded-xl border bg-card">
          <label className="block text-sm font-medium mb-2">Display Name</label>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
            <Button onClick={updateProfile} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>

        {/* Email */}
        <div className="p-6 rounded-xl border bg-card">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Email</span>
          </div>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>

        {/* Joined */}
        <div className="p-6 rounded-xl border bg-card">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">Member Since</span>
          </div>
          <p className="text-muted-foreground">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
          </p>
        </div>
      </div>
    </div>
  );
}


