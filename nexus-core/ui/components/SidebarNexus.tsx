"use client";

/**
 * Nexus Sidebar Component
 * Navigation sidebar for Nexus pages
 */

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  LayoutDashboard,
  Settings,
  History,
  Database,
  Zap,
  Search,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href: "/nexus",
    icon: LayoutDashboard,
  },
  {
    label: "Memory",
    href: "/nexus/memory",
    icon: Database,
  },
  {
    label: "History",
    href: "/nexus/history",
    icon: History,
  },
  {
    label: "Automations",
    href: "/nexus/automations",
    icon: Zap,
  },
  {
    label: "Settings",
    href: "/nexus/settings",
    icon: Settings,
  },
];

interface SidebarNexusProps {
  className?: string;
}

export function SidebarNexus({ className }: SidebarNexusProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "w-64 border-r border-border bg-background/50 backdrop-blur-xl flex flex-col",
        className
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Link href="/nexus" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Nexus</h1>
            <p className="text-xs text-muted-foreground">Intelligence Hub</p>
          </div>
        </Link>
      </div>

      {/* Search trigger */}
      <div className="p-4">
        <button
          className="w-full flex items-center gap-3 px-3 py-2 bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-colors text-sm"
          onClick={() => {
            // Trigger command bar
            const event = new KeyboardEvent("keydown", {
              key: "k",
              ctrlKey: true,
            });
            window.dispatchEvent(event);
          }}
        >
          <Search className="h-4 w-4" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-xs px-1.5 py-0.5 bg-background rounded">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <Link
          href="/help"
          className="flex items-center gap-3 px-3 py-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
        >
          <HelpCircle className="h-5 w-5" />
          <span>Help & Docs</span>
        </Link>
        <div className="mt-4 px-3 text-xs text-muted-foreground">
          <p>Nexus OS v1.0.0</p>
        </div>
      </div>
    </aside>
  );
}

