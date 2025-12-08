'use client';

/**
 * ============================================================================
 * MODE TOGGLE
 * ============================================================================
 * 
 * Simple/Pro mode toggle with smooth transitions.
 * 
 * @component ModeToggle
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ModeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ModeToggle({ className, showLabel = true, size = 'md' }: ModeToggleProps) {
  const [mode, setMode] = useState<'simple' | 'pro'>('simple');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load from localStorage
    const saved = localStorage.getItem('nexus-mode');
    if (saved === 'pro' || saved === 'simple') {
      setMode(saved);
    }
  }, []);

  const toggle = () => {
    const newMode = mode === 'simple' ? 'pro' : 'simple';
    setMode(newMode);
    localStorage.setItem('nexus-mode', newMode);
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('nexus-mode-change', { detail: newMode }));
  };

  if (!mounted) return null;

  const sizes = {
    sm: { toggle: 'h-6 w-12', circle: 'h-4 w-4', text: 'text-xs' },
    md: { toggle: 'h-8 w-16', circle: 'h-6 w-6', text: 'text-sm' },
    lg: { toggle: 'h-10 w-20', circle: 'h-8 w-8', text: 'text-base' },
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {showLabel && (
        <span className={cn('font-medium text-muted-foreground', sizes[size].text)}>
          {mode === 'simple' ? '✨ Simple' : '⚡ Pro'}
        </span>
      )}
      
      <button
        onClick={toggle}
        className={cn(
          'relative rounded-full transition-all duration-300',
          sizes[size].toggle,
          mode === 'simple' 
            ? 'bg-emerald-500/20 hover:bg-emerald-500/30' 
            : 'bg-purple-500/20 hover:bg-purple-500/30'
        )}
        aria-label={`Switch to ${mode === 'simple' ? 'Pro' : 'Simple'} mode`}
      >
        <span
          className={cn(
            'absolute top-1/2 -translate-y-1/2 rounded-full transition-all duration-300 shadow-sm',
            sizes[size].circle,
            mode === 'simple'
              ? 'left-1 bg-emerald-500'
              : 'right-1 bg-purple-500'
          )}
        />
      </button>
    </div>
  );
}

/**
 * Hook to use mode state
 */
export function useMode() {
  const [mode, setMode] = useState<'simple' | 'pro'>('simple');

  useEffect(() => {
    const saved = localStorage.getItem('nexus-mode');
    if (saved === 'pro' || saved === 'simple') {
      setMode(saved);
    }

    const handler = (e: CustomEvent) => {
      setMode(e.detail);
    };

    window.addEventListener('nexus-mode-change', handler as EventListener);
    return () => window.removeEventListener('nexus-mode-change', handler as EventListener);
  }, []);

  return {
    mode,
    isSimple: mode === 'simple',
    isPro: mode === 'pro',
    setMode: (newMode: 'simple' | 'pro') => {
      setMode(newMode);
      localStorage.setItem('nexus-mode', newMode);
      window.dispatchEvent(new CustomEvent('nexus-mode-change', { detail: newMode }));
    },
  };
}

export default ModeToggle;

