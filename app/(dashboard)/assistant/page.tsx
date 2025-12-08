'use client';

/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - PAGE
 * ============================================================================
 * 
 * Main assistant chat page.
 * 
 * @page /assistant
 * @version 3.0.0
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles, Keyboard } from 'lucide-react';
import { NexusChat } from '@/nexus/assistant-v3/ui/NexusChat';
import { CommandPalette } from '@/nexus/assistant-v3/ui/CommandPalette';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export default function AssistantPage() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [userId, setUserId] = useState('anonymous');

  // Get user ID
  useEffect(() => {
    const storedId = localStorage.getItem('nexus-user-id');
    if (storedId) {
      setUserId(storedId);
    } else {
      const newId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('nexus-user-id', newId);
      setUserId(newId);
    }
  }, []);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-purple-500/25">
              <Bot className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent">
                Nexus Assistant
              </h1>
              <p className="text-muted-foreground">AI-powered help at your fingertips</p>
            </div>
          </div>

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <Keyboard className="h-4 w-4" />
            <kbd className="text-xs">Ctrl+K</kbd>
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Area */}
        <div className="lg:col-span-3">
          <Card className="h-[calc(100vh-200px)] overflow-hidden">
            <NexusChat userId={userId} />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Capabilities */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              Capabilities
            </h3>
            <div className="space-y-2">
              {[
                { icon: '💬', title: 'Chat', desc: 'Natural conversation' },
                { icon: '🔍', title: 'Search', desc: 'Web & app data' },
                { icon: '📊', title: 'Analyze', desc: 'Patterns & insights' },
                { icon: '🛠️', title: 'Build', desc: 'Trackers & automations' },
                { icon: '🧠', title: 'Remember', desc: 'Consent-based memory' },
              ].map(cap => (
                <div
                  key={cap.title}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                >
                  <span className="text-lg">{cap.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{cap.title}</p>
                    <p className="text-xs text-muted-foreground">{cap.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Tips */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Quick Tips</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Try different personas for varied responses</p>
              <p>• Ask "What can you do?" for help</p>
              <p>• Use Ctrl+K for quick commands</p>
              <p>• Say "Create a tracker" to get started</p>
            </div>
          </Card>

          {/* Keyboard Shortcuts */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Shortcuts</h3>
            <div className="space-y-2">
              {[
                { keys: ['Ctrl', 'K'], action: 'Command Palette' },
                { keys: ['Enter'], action: 'Send Message' },
                { keys: ['↑'], action: 'Previous Message' },
              ].map(shortcut => (
                <div
                  key={shortcut.action}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-muted-foreground">
                    {shortcut.action}
                  </span>
                  <div className="flex gap-1">
                    {shortcut.keys.map(key => (
                      <kbd
                        key={key}
                        className="px-1.5 py-0.5 rounded bg-muted text-xs"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </div>
  );
}

