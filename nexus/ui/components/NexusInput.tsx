'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';

interface NexusInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'default' | 'search' | 'glass';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
}

export function NexusInput({
  variant = 'default',
  leftIcon,
  rightIcon,
  error,
  className,
  ...props
}: NexusInputProps) {
  const isSearch = variant === 'search';

  return (
    <div className="relative">
      {(leftIcon || isSearch) && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
          {isSearch ? <Search className="w-4 h-4" /> : leftIcon}
        </div>
      )}
      <input
        className={cn(
          'w-full rounded-lg px-4 py-2 text-sm text-zinc-100',
          'placeholder:text-zinc-500',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          // Variant styles
          variant === 'default' && [
            'bg-zinc-900 border border-zinc-700',
            'hover:border-zinc-600',
            'focus:border-indigo-500 focus:ring-indigo-500/20',
          ],
          variant === 'search' && [
            'bg-zinc-800/50 border border-zinc-700/50',
            'pl-10',
            'focus:border-indigo-500 focus:ring-indigo-500/20',
          ],
          variant === 'glass' && [
            'bg-zinc-900/30 backdrop-blur-lg border border-zinc-700/30',
            'focus:border-indigo-500 focus:ring-indigo-500/20',
          ],
          // Error state
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          // Icons padding
          leftIcon && 'pl-10',
          rightIcon && 'pr-10',
          className
        )}
        {...props}
      />
      {rightIcon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
          {rightIcon}
        </div>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}

interface NexusTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'glass';
  error?: string;
}

export function NexusTextarea({
  variant = 'default',
  error,
  className,
  ...props
}: NexusTextareaProps) {
  return (
    <div className="relative">
      <textarea
        className={cn(
          'w-full rounded-lg px-4 py-2 text-sm text-zinc-100',
          'placeholder:text-zinc-500',
          'transition-all duration-200 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          variant === 'default' && [
            'bg-zinc-900 border border-zinc-700',
            'hover:border-zinc-600',
            'focus:border-indigo-500 focus:ring-indigo-500/20',
          ],
          variant === 'glass' && [
            'bg-zinc-900/30 backdrop-blur-lg border border-zinc-700/30',
            'focus:border-indigo-500 focus:ring-indigo-500/20',
          ],
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}


