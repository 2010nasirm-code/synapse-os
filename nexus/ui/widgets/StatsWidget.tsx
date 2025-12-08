'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatItem {
  label: string;
  value: string | number;
  change?: number;
  icon?: React.ElementType;
}

interface StatsWidgetProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsWidget({ stats, columns = 4, className }: StatsWidgetProps) {
  return (
    <div
      className={cn(
        'grid gap-4',
        columns === 2 && 'grid-cols-2',
        columns === 3 && 'grid-cols-3',
        columns === 4 && 'grid-cols-4',
        className
      )}
    >
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}

function StatCard({ label, value, change, icon: Icon }: StatItem) {
  const trend = change ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : null;

  return (
    <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
        {Icon && <Icon className="w-4 h-4 text-zinc-600" />}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-zinc-100">{value}</span>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs',
              trend === 'up' && 'text-emerald-500',
              trend === 'down' && 'text-red-500',
              trend === 'neutral' && 'text-zinc-500'
            )}
          >
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3" />}
            {trend === 'neutral' && <Minus className="w-3 h-3" />}
            {Math.abs(change || 0)}%
          </div>
        )}
      </div>
    </div>
  );
}

// Mini stat for inline use
interface MiniStatProps {
  label: string;
  value: string | number;
  icon?: React.ElementType;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

export function MiniStat({ label, value, icon: Icon, variant = 'default' }: MiniStatProps) {
  return (
    <div className="flex items-center gap-3">
      {Icon && (
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            variant === 'default' && 'bg-zinc-800 text-zinc-400',
            variant === 'primary' && 'bg-indigo-500/20 text-indigo-400',
            variant === 'success' && 'bg-emerald-500/20 text-emerald-400',
            variant === 'warning' && 'bg-amber-500/20 text-amber-400',
            variant === 'error' && 'bg-red-500/20 text-red-400'
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div>
        <div className="text-lg font-semibold text-zinc-100">{value}</div>
        <div className="text-xs text-zinc-500">{label}</div>
      </div>
    </div>
  );
}


