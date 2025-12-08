'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface NexusButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  glow?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export function NexusButton({
  variant = 'primary',
  size = 'md',
  glow = false,
  loading = false,
  children,
  className,
  disabled,
  ...props
}: NexusButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        // Size styles
        size === 'sm' && 'px-3 py-1.5 text-xs rounded-md gap-1.5',
        size === 'md' && 'px-4 py-2 text-sm rounded-lg gap-2',
        size === 'lg' && 'px-6 py-3 text-base rounded-xl gap-2.5',
        size === 'icon' && 'p-2 rounded-lg',
        // Variant styles
        variant === 'primary' && [
          'bg-indigo-600 text-white hover:bg-indigo-700',
          'focus:ring-indigo-500',
          glow && 'shadow-[0_0_15px_rgba(99,102,241,0.4)]',
        ],
        variant === 'secondary' && [
          'bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
          'focus:ring-zinc-500',
        ],
        variant === 'ghost' && [
          'bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
          'focus:ring-zinc-500',
        ],
        variant === 'outline' && [
          'bg-transparent border border-zinc-700 text-zinc-300',
          'hover:bg-zinc-800 hover:border-zinc-600',
          'focus:ring-zinc-500',
        ],
        variant === 'danger' && [
          'bg-red-600 text-white hover:bg-red-700',
          'focus:ring-red-500',
        ],
        variant === 'success' && [
          'bg-emerald-600 text-white hover:bg-emerald-700',
          'focus:ring-emerald-500',
        ],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}


