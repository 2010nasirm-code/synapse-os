'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Brain,
  Zap,
  Database,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Bell,
  User,
  Sparkles,
  Layers,
  Activity,
  Command,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NexusInput } from '../components/NexusInput';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/nexus', icon: Activity },
  { name: 'Query', href: '/nexus/query', icon: Brain },
  { name: 'Memory', href: '/nexus/memory', icon: Database },
  { name: 'Agents', href: '/nexus/agents', icon: Sparkles },
  { name: 'Modules', href: '/nexus/modules', icon: Layers },
  { name: 'Analytics', href: '/nexus/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/nexus/settings', icon: Settings },
];

interface NexusLayoutProps {
  children: React.ReactNode;
}

export function NexusLayout({ children }: NexusLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen border-r border-zinc-800/50',
          'bg-zinc-900/50 backdrop-blur-xl transition-all duration-300',
          sidebarCollapsed ? 'w-[72px]' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800/50">
          {!sidebarCollapsed && (
            <Link href="/nexus" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">Nexus</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-400'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <span className="font-medium text-sm">{item.name}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Command */}
        {!sidebarCollapsed && (
          <div className="absolute bottom-4 left-4 right-4">
            <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800/50 text-zinc-400 text-sm hover:bg-zinc-800 transition-colors">
              <Command className="w-4 h-4" />
              <span>Command</span>
              <span className="ml-auto text-xs bg-zinc-700 px-1.5 py-0.5 rounded">⌘K</span>
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div
        className={cn(
          'transition-all duration-300',
          sidebarCollapsed ? 'ml-[72px]' : 'ml-64'
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 h-16 border-b border-zinc-800/50 bg-zinc-900/50 backdrop-blur-xl">
          <div className="h-full px-6 flex items-center justify-between">
            {/* Search */}
            <div className="w-96">
              <NexusInput
                variant="search"
                placeholder="Search anything..."
              />
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
              </button>

              {/* User */}
              <button className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-zinc-800 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium">User</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}


