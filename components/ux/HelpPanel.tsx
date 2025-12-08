'use client';

/**
 * ============================================================================
 * HELP PANEL
 * ============================================================================
 * 
 * Context-aware help sidebar with tips and suggestions.
 * 
 * @component HelpPanel
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface HelpTip {
  id: string;
  tip: string;
  action?: string;
  priority: 'low' | 'medium' | 'high';
}

interface HelpPanelProps {
  context: string;
  tips: HelpTip[];
  onAction?: (action: string) => void;
  className?: string;
}

export function HelpPanel({ context, tips, onAction, className }: HelpPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Show panel automatically on first visit
  useEffect(() => {
    const hasSeenHelp = localStorage.getItem(`help-seen-${context}`);
    if (!hasSeenHelp && tips.length > 0) {
      setIsOpen(true);
    }
  }, [context, tips.length]);

  const dismiss = (tipId: string) => {
    setDismissed(prev => new Set(prev).add(tipId));
  };

  const dismissAll = () => {
    localStorage.setItem(`help-seen-${context}`, 'true');
    setIsOpen(false);
  };

  const visibleTips = tips.filter(t => !dismissed.has(t.id));

  if (!isOpen || visibleTips.length === 0) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 w-12 h-12 rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'flex items-center justify-center text-xl',
          'hover:scale-110 transition-transform',
          'animate-bounce',
          className
        )}
        aria-label="Show help"
      >
        💡
      </button>
    );
  }

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 w-80 rounded-2xl shadow-2xl',
        'bg-card border border-border overflow-hidden',
        'animate-in slide-in-from-right-5 duration-300',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💡</span>
            <span className="font-semibold">Tips & Help</span>
          </div>
          <button
            onClick={dismissAll}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close help panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
        {visibleTips.map((tip, index) => (
          <div
            key={tip.id}
            className={cn(
              'p-3 rounded-xl transition-all duration-200',
              'animate-in fade-in-0 slide-in-from-right-2',
              tip.priority === 'high' && 'bg-primary/10 border border-primary/20',
              tip.priority === 'medium' && 'bg-muted/50',
              tip.priority === 'low' && 'bg-background'
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <p className="text-sm leading-relaxed">{tip.tip}</p>
            
            <div className="flex items-center gap-2 mt-2">
              {tip.action && (
                <button
                  onClick={() => {
                    onAction?.(tip.action!);
                    dismiss(tip.id);
                  }}
                  className={cn(
                    'text-xs font-medium px-3 py-1.5 rounded-lg',
                    'bg-primary text-primary-foreground',
                    'hover:bg-primary/90 transition-colors'
                  )}
                >
                  Try it →
                </button>
              )}
              <button
                onClick={() => dismiss(tip.id)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Got it
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border bg-muted/20">
        <p className="text-xs text-muted-foreground text-center">
          Need more help? Ask Nexus anything! 🤖
        </p>
      </div>
    </div>
  );
}

export default HelpPanel;

