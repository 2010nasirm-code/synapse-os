"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Command, Settings, LayoutDashboard, ListTodo, 
  Sparkles, Workflow, BarChart3, Network, Bot, Shield,
  Moon, Sun, Palette, Zap, Plus, Trash2, Play, Pause,
  RefreshCw, Download, Upload, LogOut, User, Bell,
  FileText, Calendar, Clock, Star, Archive, Filter
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: string;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    { id: 'nav-dashboard', title: 'Go to Dashboard', icon: <LayoutDashboard size={18} />, action: () => router.push('/dashboard'), category: 'Navigation', shortcut: 'G D' },
    { id: 'nav-nexus', title: 'Go to Nexus', icon: <Zap size={18} />, action: () => router.push('/nexus'), category: 'Navigation', shortcut: 'G N' },
    { id: 'nav-tracker', title: 'Go to Tracker', icon: <ListTodo size={18} />, action: () => router.push('/tracker'), category: 'Navigation', shortcut: 'G T' },
    { id: 'nav-suggestions', title: 'Go to Suggestions', icon: <Sparkles size={18} />, action: () => router.push('/suggestions'), category: 'Navigation', shortcut: 'G S' },
    { id: 'nav-automations', title: 'Go to Automations', icon: <Workflow size={18} />, action: () => router.push('/automations'), category: 'Navigation', shortcut: 'G A' },
    { id: 'nav-analytics', title: 'Go to Analytics', icon: <BarChart3 size={18} />, action: () => router.push('/analytics'), category: 'Navigation', shortcut: 'G Y' },
    { id: 'nav-knowledge', title: 'Go to Knowledge Graph', icon: <Network size={18} />, action: () => router.push('/knowledge'), category: 'Navigation', shortcut: 'G K' },
    { id: 'nav-agents', title: 'Go to Agents', icon: <Bot size={18} />, action: () => router.push('/agents'), category: 'Navigation', shortcut: 'G G' },
    { id: 'nav-settings', title: 'Go to Settings', icon: <Settings size={18} />, action: () => router.push('/settings'), category: 'Navigation', shortcut: 'G ,' },
    
    // Actions
    { id: 'action-new-item', title: 'Create New Item', icon: <Plus size={18} />, action: () => { window.dispatchEvent(new CustomEvent('nexus:create-item')); }, category: 'Actions', shortcut: 'N' },
    { id: 'action-new-automation', title: 'Create Automation', icon: <Workflow size={18} />, action: () => { window.dispatchEvent(new CustomEvent('nexus:create-automation')); }, category: 'Actions' },
    { id: 'action-generate-suggestion', title: 'Generate Suggestions', icon: <Sparkles size={18} />, action: () => { window.dispatchEvent(new CustomEvent('nexus:generate-suggestions')); }, category: 'Actions', shortcut: 'S' },
    { id: 'action-refresh', title: 'Refresh Data', icon: <RefreshCw size={18} />, action: () => { window.dispatchEvent(new CustomEvent('nexus:refresh')); }, category: 'Actions', shortcut: 'R' },
    
    // Theme
    { id: 'theme-dark', title: 'Dark Mode', icon: <Moon size={18} />, action: () => { document.documentElement.classList.add('dark'); document.documentElement.classList.remove('light'); }, category: 'Theme' },
    { id: 'theme-light', title: 'Light Mode', icon: <Sun size={18} />, action: () => { document.documentElement.classList.add('light'); document.documentElement.classList.remove('dark'); }, category: 'Theme' },
    { id: 'theme-customize', title: 'Customize Theme', icon: <Palette size={18} />, action: () => { window.dispatchEvent(new CustomEvent('nexus:open-theme-panel')); }, category: 'Theme' },
    
    // Quick Actions
    { id: 'quick-export', title: 'Export Data', icon: <Download size={18} />, action: () => { window.dispatchEvent(new CustomEvent('nexus:export')); }, category: 'Quick Actions' },
    { id: 'quick-import', title: 'Import Data', icon: <Upload size={18} />, action: () => { window.dispatchEvent(new CustomEvent('nexus:import')); }, category: 'Quick Actions' },
    { id: 'quick-notifications', title: 'View Notifications', icon: <Bell size={18} />, action: () => { window.dispatchEvent(new CustomEvent('nexus:notifications')); }, category: 'Quick Actions' },
    { id: 'quick-profile', title: 'View Profile', icon: <User size={18} />, action: () => router.push('/profile'), category: 'Quick Actions' },
    { id: 'quick-logout', title: 'Sign Out', icon: <LogOut size={18} />, action: () => { window.dispatchEvent(new CustomEvent('nexus:logout')); }, category: 'Quick Actions' },
  ], [router]);

  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    const lower = search.toLowerCase();
    return commands.filter(cmd => 
      cmd.title.toLowerCase().includes(lower) ||
      cmd.category.toLowerCase().includes(lower) ||
      cmd.keywords?.some(k => k.toLowerCase().includes(lower))
    );
  }, [commands, search]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  let flatIndex = -1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50"
          >
            <div className="bg-zinc-900/95 border border-zinc-700/50 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-700/50">
                <Search className="text-zinc-400" size={20} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent text-white placeholder:text-zinc-500 outline-none text-lg"
                  autoFocus
                />
                <div className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">
                  <Command size={12} />
                  <span>K</span>
                </div>
              </div>
              
              {/* Commands List */}
              <div className="max-h-[400px] overflow-y-auto py-2">
                {Object.entries(groupedCommands).map(([category, items]) => (
                  <div key={category}>
                    <div className="px-4 py-2 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      {category}
                    </div>
                    {items.map((cmd) => {
                      flatIndex++;
                      const index = flatIndex;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => {
                            cmd.action();
                            onClose();
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                            index === selectedIndex 
                              ? "bg-indigo-500/20 text-white" 
                              : "text-zinc-300 hover:bg-zinc-800/50"
                          )}
                        >
                          <span className={cn(
                            "p-1.5 rounded-lg",
                            index === selectedIndex ? "bg-indigo-500/30" : "bg-zinc-800"
                          )}>
                            {cmd.icon}
                          </span>
                          <div className="flex-1">
                            <div className="font-medium">{cmd.title}</div>
                            {cmd.description && (
                              <div className="text-sm text-zinc-500">{cmd.description}</div>
                            )}
                          </div>
                          {cmd.shortcut && (
                            <div className="flex items-center gap-1">
                              {cmd.shortcut.split(' ').map((key, i) => (
                                <span key={i} className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400">
                                  {key}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
                
                {filteredCommands.length === 0 && (
                  <div className="px-4 py-8 text-center text-zinc-500">
                    No commands found for "{search}"
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="px-4 py-2 border-t border-zinc-700/50 flex items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="px-1 bg-zinc-800 rounded">↑↓</span> Navigate
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-1 bg-zinc-800 rounded">↵</span> Select
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-1 bg-zinc-800 rounded">Esc</span> Close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}


