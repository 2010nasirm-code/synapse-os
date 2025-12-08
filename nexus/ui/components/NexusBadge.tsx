'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface NexusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  glow?: boolean;
  dot?: boolean;
  children: React.ReactNode;
}

export function NexusBadge({
  variant = 'default',
  size = 'md',
  glow = false,
  dot = false,
  children,
  className,
  ...props
}: NexusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        // Size styles
        size === 'sm' && 'px-2 py-0.5 text-[10px]',
        size === 'md' && 'px-2.5 py-1 text-xs',
        // Variant styles
        variant === 'default' && 'bg-zinc-800 text-zinc-300',
        variant === 'primary' && 'bg-indigo-500/20 text-indigo-400',
        variant === 'secondary' && 'bg-purple-500/20 text-purple-400',
        variant === 'success' && 'bg-emerald-500/20 text-emerald-400',
        variant === 'warning' && 'bg-amber-500/20 text-amber-400',
        variant === 'error' && 'bg-red-500/20 text-red-400',
        variant === 'info' && 'bg-blue-500/20 text-blue-400',
        // Glow effect
        glow && variant === 'primary' && 'shadow-[0_0_10px_rgba(99,102,241,0.3)]',
        glow && variant === 'success' && 'shadow-[0_0_10px_rgba(16,185,129,0.3)]',
        glow && variant === 'error' && 'shadow-[0_0_10px_rgba(239,68,68,0.3)]',
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full mr-1.5',
            variant === 'default' && 'bg-zinc-500',
            variant === 'primary' && 'bg-indigo-400',
            variant === 'secondary' && 'bg-purple-400',
            variant === 'success' && 'bg-emerald-400',
            variant === 'warning' && 'bg-amber-400',
            variant === 'error' && 'bg-red-400',
            variant === 'info' && 'bg-blue-400'
          )}
        />
      )}
      {children}
    </span>
  );
}

// Status badge for showing online/offline/etc states
interface StatusBadgeProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'active' | 'inactive';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const statusConfig = {
    online: { color: 'bg-emerald-500', text: 'Online' },
    offline: { color: 'bg-zinc-500', text: 'Offline' },
    busy: { color: 'bg-red-500', text: 'Busy' },
    away: { color: 'bg-amber-500', text: 'Away' },
    active: { color: 'bg-emerald-500', text: 'Active' },
    inactive: { color: 'bg-zinc-500', text: 'Inactive' },
  };

  const config = statusConfig[status];

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400">
      <span className={cn('w-2 h-2 rounded-full animate-pulse', config.color)} />
      {label || config.text}
    </span>
  );
}


