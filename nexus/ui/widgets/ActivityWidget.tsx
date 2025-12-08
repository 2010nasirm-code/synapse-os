'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from '@/nexus/utils';

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: number;
  icon?: React.ElementType;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

interface ActivityWidgetProps {
  activities: ActivityItem[];
  maxItems?: number;
  showTimestamp?: boolean;
  className?: string;
}

export function ActivityWidget({
  activities,
  maxItems = 10,
  showTimestamp = true,
  className,
}: ActivityWidgetProps) {
  const displayedActivities = activities.slice(0, maxItems);

  if (displayedActivities.length === 0) {
    return (
      <div className={cn('p-8 text-center text-zinc-500', className)}>
        No recent activity
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {displayedActivities.map((activity, index) => (
        <ActivityRow
          key={activity.id}
          activity={activity}
          showTimestamp={showTimestamp}
          isLast={index === displayedActivities.length - 1}
        />
      ))}
    </div>
  );
}

function ActivityRow({
  activity,
  showTimestamp,
  isLast,
}: {
  activity: ActivityItem;
  showTimestamp: boolean;
  isLast: boolean;
}) {
  const Icon = activity.icon;
  const colorClasses = {
    default: 'bg-zinc-800 text-zinc-400',
    primary: 'bg-indigo-500/20 text-indigo-400',
    success: 'bg-emerald-500/20 text-emerald-400',
    warning: 'bg-amber-500/20 text-amber-400',
    error: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="flex gap-3 py-3 px-3 rounded-lg hover:bg-zinc-800/30 transition-colors">
      {/* Timeline dot/icon */}
      <div className="relative flex flex-col items-center">
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            colorClasses[activity.color || 'default']
          )}
        >
          {Icon ? (
            <Icon className="w-4 h-4" />
          ) : (
            <div className="w-2 h-2 rounded-full bg-current" />
          )}
        </div>
        {!isLast && (
          <div className="w-px h-full bg-zinc-800 mt-2" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-zinc-200 truncate">
              {activity.title}
            </p>
            {activity.description && (
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                {activity.description}
              </p>
            )}
          </div>
          {showTimestamp && (
            <span className="text-xs text-zinc-600 whitespace-nowrap">
              {formatDistanceToNow(activity.timestamp)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Compact timeline view
interface TimelineWidgetProps {
  items: Array<{
    id: string;
    label: string;
    timestamp: number;
    completed?: boolean;
  }>;
  className?: string;
}

export function TimelineWidget({ items, className }: TimelineWidgetProps) {
  return (
    <div className={cn('relative pl-4', className)}>
      {/* Vertical line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-800" />

      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="relative flex items-center gap-3">
            <div
              className={cn(
                'w-3.5 h-3.5 rounded-full border-2',
                item.completed
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'bg-zinc-900 border-zinc-600'
              )}
            />
            <div className="flex-1 flex items-center justify-between">
              <span
                className={cn(
                  'text-sm',
                  item.completed ? 'text-zinc-300' : 'text-zinc-500'
                )}
              >
                {item.label}
              </span>
              <span className="text-xs text-zinc-600">
                {formatDistanceToNow(item.timestamp)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


