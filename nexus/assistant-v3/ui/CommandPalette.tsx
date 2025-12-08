'use client';

/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - COMMAND PALETTE
 * ============================================================================
 * 
 * Global command palette (Ctrl/Cmd+K).
 * 
 * @component CommandPalette
 * @version 3.0.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Plus,
  Zap,
  BarChart,
  Settings,
  HelpCircle,
  Command,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  category: string;
  action: () => void | Promise<void>;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAsk?: (query: string) => void;
  className?: string;
}

// ============================================================================
// DEFAULT COMMANDS
// ============================================================================

const defaultCommands: CommandItem[] = [
  {
    id: 'ask-assistant',
    title: 'Ask Assistant',
    description: 'Chat with Nexus AI',
    icon: <MessageSquare className="h-4 w-4" />,
    category: 'Assistant',
    keywords: ['chat', 'help', 'question', 'ai'],
    action: () => {},
  },
  {
    id: 'create-tracker',
    title: 'Create Tracker',
    description: 'Start tracking a new habit or metric',
    icon: <Plus className="h-4 w-4" />,
    category: 'Create',
    keywords: ['new', 'add', 'habit', 'track'],
    action: () => {},
  },
  {
    id: 'create-automation',
    title: 'Create Automation',
    description: 'Set up automatic workflows',
    icon: <Zap className="h-4 w-4" />,
    category: 'Create',
    keywords: ['new', 'add', 'trigger', 'workflow'],
    action: () => {},
  },
  {
    id: 'view-analytics',
    title: 'View Analytics',
    description: 'See insights and trends',
    icon: <BarChart className="h-4 w-4" />,
    category: 'Navigate',
    keywords: ['stats', 'data', 'insights', 'charts'],
    action: () => {},
  },
  {
    id: 'open-settings',
    title: 'Open Settings',
    description: 'Configure your preferences',
    icon: <Settings className="h-4 w-4" />,
    category: 'Navigate',
    keywords: ['preferences', 'config', 'options'],
    action: () => {},
  },
  {
    id: 'get-help',
    title: 'Get Help',
    description: 'Learn how to use the app',
    icon: <HelpCircle className="h-4 w-4" />,
    category: 'Help',
    keywords: ['guide', 'tutorial', 'learn', 'documentation'],
    action: () => {},
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function CommandPalette({
  isOpen,
  onClose,
  onAsk,
  className,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter commands
  const filteredCommands = defaultCommands.filter(cmd => {
    if (!query) return true;
    const searchLower = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(searchLower) ||
      cmd.description?.toLowerCase().includes(searchLower) ||
      cmd.keywords?.some(k => k.includes(searchLower))
    );
  });

  // Group by category
  const grouped = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
          executeCommand(filteredCommands[selectedIndex]);
        } else if (query.trim() && onAsk) {
          // Send as question to assistant
          onAsk(query.trim());
          onClose();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredCommands, selectedIndex, query, onAsk, onClose]);

  // Execute command
  const executeCommand = async (cmd: CommandItem) => {
    setIsLoading(true);
    try {
      await cmd.action();
    } finally {
      setIsLoading(false);
      onClose();
    }
  };

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'fixed top-[20%] left-1/2 -translate-x-1/2 z-50',
              'w-full max-w-xl',
              'bg-card rounded-2xl shadow-2xl border border-border overflow-hidden',
              className
            )}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or question..."
                className={cn(
                  'flex-1 bg-transparent',
                  'text-foreground placeholder:text-muted-foreground',
                  'focus:outline-none'
                )}
              />
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 rounded bg-muted text-xs text-muted-foreground">
                <Command className="h-3 w-3" />K
              </kbd>
            </div>

            {/* Commands */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p className="text-sm">No commands found</p>
                  <p className="text-xs mt-1">
                    Press Enter to ask the assistant
                  </p>
                </div>
              ) : (
                Object.entries(grouped).map(([category, commands]) => (
                  <div key={category} className="mb-2">
                    <p className="px-2 py-1 text-xs text-muted-foreground font-medium">
                      {category}
                    </p>
                    {commands.map((cmd, idx) => {
                      const globalIdx = filteredCommands.indexOf(cmd);
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => executeCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
                            'transition-colors',
                            selectedIndex === globalIdx
                              ? 'bg-purple-500/10 text-foreground'
                              : 'hover:bg-muted text-foreground'
                          )}
                        >
                          <div className={cn(
                            'p-2 rounded-lg',
                            selectedIndex === globalIdx
                              ? 'bg-purple-500 text-white'
                              : 'bg-muted'
                          )}>
                            {cmd.icon}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium">{cmd.title}</p>
                            {cmd.description && (
                              <p className="text-xs text-muted-foreground">
                                {cmd.description}
                              </p>
                            )}
                          </div>
                          {selectedIndex === globalIdx && (
                            <ArrowRight className="h-4 w-4 text-purple-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-muted">Esc</kbd>
                  Close
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CommandPalette;

