"use client";

import { useState, useEffect } from "react";
import { 
  Shield, 
  Users, 
  Crown, 
  UserCheck, 
  User, 
  Loader2,
  Trash2,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase/client";

type UserRole = "user" | "moderator" | "admin" | "owner";

interface AppUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

const roleConfig = {
  owner: { label: "Owner", icon: Crown, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  admin: { label: "Admin", icon: Shield, color: "text-red-500", bg: "bg-red-500/10" },
  moderator: { label: "Moderator", icon: UserCheck, color: "text-blue-500", bg: "bg-blue-500/10" },
  user: { label: "User", icon: User, color: "text-gray-500", bg: "bg-gray-500/10" },
};

export default function AdminPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get current user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile) {
      setCurrentUser({
        id: profile.id,
        email: profile.email || user.email || "",
        full_name: profile.full_name || "",
        role: profile.role || "user",
        created_at: profile.created_at,
      });
    }

    // Get all users (only if admin/owner)
    if (profile?.role === "admin" || profile?.role === "owner") {
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      setUsers(allProfiles?.map(p => ({
        id: p.id,
        email: p.email || "",
        full_name: p.full_name || "",
        role: p.role || "user",
        created_at: p.created_at,
      })) || []);
    }

    setLoading(false);
  }

  async function updateRole(userId: string, newRole: UserRole) {
    if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "owner")) {
      return;
    }

    // Owners can't be changed by admins
    const targetUser = users.find(u => u.id === userId);
    if (targetUser?.role === "owner" && currentUser.role !== "owner") {
      return;
    }

    setUpdating(userId);
    
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (!error) {
      fetchUsers();
    }
    setUpdating(null);
  }

  const canManageUser = (targetRole: UserRole) => {
    if (!currentUser) return false;
    if (currentUser.role === "owner") return true;
    if (currentUser.role === "admin" && targetRole !== "owner") return true;
    return false;
  };

  const getRoleIcon = (role: UserRole) => {
    const config = roleConfig[role];
    return <config.icon className={`h-4 w-4 ${config.color}`} />;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not admin/owner
  if (!currentUser || (currentUser.role !== "admin" && currentUser.role !== "owner")) {
    return (
      <div className="p-6">
        <div className="max-w-md mx-auto text-center py-12">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You need admin or owner privileges to access this page.
          </p>
          <p className="text-sm text-muted-foreground">
            Your current role: <span className="font-medium">{currentUser?.role || "user"}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-muted-foreground">Manage users and their roles.</p>
      </div>

      {/* Your Role */}
      <div className="p-4 rounded-xl border bg-card mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getRoleIcon(currentUser.role)}
          <div>
            <p className="font-medium">{currentUser.full_name || currentUser.email}</p>
            <p className="text-sm text-muted-foreground">Your role: {roleConfig[currentUser.role].label}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${roleConfig[currentUser.role].bg} ${roleConfig[currentUser.role].color}`}>
          {roleConfig[currentUser.role].label}
        </div>
      </div>

      {/* Role Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {(Object.entries(roleConfig) as [UserRole, typeof roleConfig.owner][]).map(([role, config]) => (
          <div key={role} className={`p-3 rounded-lg ${config.bg} flex items-center gap-2`}>
            <config.icon className={`h-5 w-5 ${config.color}`} />
            <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
          </div>
        ))}
      </div>

      {/* Users List */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-4 border-b bg-muted/50">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="font-semibold">All Users ({users.length})</h2>
          </div>
        </div>
        
        <div className="divide-y">
          {users.map((user) => (
            <div key={user.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${roleConfig[user.role].bg}`}>
                  {getRoleIcon(user.role)}
                </div>
                <div>
                  <p className="font-medium">{user.full_name || "No name"}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {canManageUser(user.role) && user.id !== currentUser.id ? (
                  <div className="relative">
                    <select
                      value={user.role}
                      onChange={(e) => updateRole(user.id, e.target.value as UserRole)}
                      disabled={updating === user.id}
                      className="appearance-none px-3 py-1.5 pr-8 rounded-lg border bg-background text-sm cursor-pointer"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                      {currentUser.role === "owner" && <option value="owner">Owner</option>}
                    </select>
                    <ChevronDown className="h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground" />
                  </div>
                ) : (
                  <span className={`px-3 py-1 rounded-full text-sm ${roleConfig[user.role].bg} ${roleConfig[user.role].color}`}>
                    {roleConfig[user.role].label}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


