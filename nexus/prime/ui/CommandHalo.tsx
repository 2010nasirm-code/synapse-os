'use client';

/**
 * ============================================================================
 * NEXUS PRIME - COMMAND HALO
 * ============================================================================
 * 
 * Global command launcher (Cmd/Ctrl + K):
 * - Quick command input
 * - AI request shortcut
 * - Recent commands
 * 
 * @module nexus/prime/ui/CommandHalo
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface QuickCommand {
  id: string;
  label: string;
  description: string;
  action: () => void;
  keywords?: string[];
}

interface CommandHaloProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (query: string) => Promise<void>;
  quickCommands?: QuickCommand[];
  recentQueries?: string[];
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function CommandHalo({
  isOpen,
  onClose,
  onSubmit,
  quickCommands = [],
  recentQueries = [],
  className = '',
}: CommandHaloProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter commands based on query
  const filteredCommands = quickCommands.filter(cmd => {
    const searchText = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(searchText) ||
      cmd.description.toLowerCase().includes(searchText) ||
      cmd.keywords?.some(k => k.toLowerCase().includes(searchText))
    );
  });

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!isOpen) {
          // This would be handled by parent
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      await onSubmit(query);
      setQuery('');
      onClose();
    } catch (error) {
      console.error('Command failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [query, onSubmit, onClose]);

  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
        if (filteredCommands.length > 0 && selectedIndex < filteredCommands.length) {
          filteredCommands[selectedIndex].action();
          onClose();
        } else {
          handleSubmit();
        }
        break;
      case 'Escape':
        onClose();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Command Dialog */}
      <div className={`relative w-full max-w-lg bg-background border rounded-xl shadow-2xl ${className}`}>
        {/* Input */}
        <div className="flex items-center gap-3 p-4 border-b">
          <div className="text-muted-foreground">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyPress}
            placeholder="Ask NEXUS PRIME anything..."
            className="flex-1 bg-transparent outline-none text-lg placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          {isLoading && (
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* Quick Commands */}
        {filteredCommands.length > 0 && (
          <div className="py-2">
            <div className="px-4 py-1 text-xs font-medium text-muted-foreground">
              Quick Commands
            </div>
            {filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                className={`w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-accent/50 ${
                  index === selectedIndex ? 'bg-accent' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm">
                  ⚡
                </div>
                <div>
                  <div className="text-sm font-medium">{cmd.label}</div>
                  <div className="text-xs text-muted-foreground">{cmd.description}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Recent Queries */}
        {recentQueries.length > 0 && query === '' && (
          <div className="py-2 border-t">
            <div className="px-4 py-1 text-xs font-medium text-muted-foreground">
              Recent
            </div>
            {recentQueries.slice(0, 5).map((q, index) => (
              <button
                key={index}
                onClick={() => setQuery(q)}
                className="w-full px-4 py-2 flex items-center gap-3 text-left hover:bg-accent/50"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm opacity-50">
                  ↺
                </div>
                <div className="text-sm truncate">{q}</div>
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">↵</kbd>
              to send
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px]">esc</kbd>
              to close
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            NEXUS PRIME Online
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HOOK FOR COMMAND HALO
// ============================================================================

export function useCommandHalo() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  };
}

export default CommandHalo;

