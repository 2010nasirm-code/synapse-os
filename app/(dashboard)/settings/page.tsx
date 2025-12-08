"use client";

import { useState } from "react";
import { Settings, Moon, Sun, Bell, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">Customize your Synapse OS experience.</p>
      </div>

      <div className="space-y-6">
        {/* Appearance */}
        <div className="p-6 rounded-xl border bg-card">
          <div className="flex items-center gap-3 mb-4">
            {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            <h3 className="font-semibold">Appearance</h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
              className="gap-2"
            >
              <Sun className="h-4 w-4" />
              Light
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
              className="gap-2"
            >
              <Moon className="h-4 w-4" />
              Dark
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              onClick={() => setTheme("system")}
            >
              System
            </Button>
          </div>
        </div>

        {/* Notifications */}
        <div className="p-6 rounded-xl border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5" />
              <div>
                <h3 className="font-semibold">Notifications</h3>
                <p className="text-sm text-muted-foreground">Receive alerts and updates</p>
              </div>
            </div>
            <Button
              variant={notifications ? "default" : "outline"}
              onClick={() => setNotifications(!notifications)}
            >
              {notifications ? "On" : "Off"}
            </Button>
          </div>
        </div>

        {/* Privacy */}
        <div className="p-6 rounded-xl border bg-card">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-5 w-5" />
            <h3 className="font-semibold">Privacy & Security</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Your data is stored securely and never shared with third parties.
          </p>
        </div>
      </div>
    </div>
  );
}

