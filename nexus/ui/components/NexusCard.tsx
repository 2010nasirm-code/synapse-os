'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface NexusCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated' | 'outlined';
  glow?: boolean;
  interactive?: boolean;
  children: React.ReactNode;
}

export function NexusCard({
  variant = 'default',
  glow = false,
  interactive = false,
  children,
  className,
  ...props
}: NexusCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl transition-all duration-200',
        // Variant styles
        variant === 'default' && 'bg-zinc-900/50 border border-zinc-800',
        variant === 'glass' && 'bg-zinc-900/30 backdrop-blur-xl border border-zinc-700/50',
        variant === 'elevated' && 'bg-zinc-800 shadow-lg shadow-black/20',
        variant === 'outlined' && 'bg-transparent border-2 border-zinc-700',
        // Interactive styles
        interactive && 'cursor-pointer hover:border-indigo-500/50 hover:shadow-lg hover:scale-[1.01]',
        // Glow effect
        glow && 'shadow-[0_0_20px_rgba(99,102,241,0.2)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function NexusCardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4 border-b border-zinc-800', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function NexusCardContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function NexusCardFooter({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-6 py-4 border-t border-zinc-800 flex items-center gap-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function NexusCardTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold text-zinc-100', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function NexusCardDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-zinc-400 mt-1', className)}
      {...props}
    >
      {children}
    </p>
  );
}


