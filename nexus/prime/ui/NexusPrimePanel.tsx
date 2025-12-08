'use client';

/**
 * ============================================================================
 * NEXUS PRIME - PANEL
 * ============================================================================
 * 
 * Side panel showing:
 * - Memory snippets
 * - Active insights
 * - Pending actions
 * 
 * @module nexus/prime/ui/NexusPrimePanel
 * @version 1.0.0
 */

import React, { useState } from 'react';
import { NexusMemoryItem, Insight, ActionDraft } from '../core/types';

// ============================================================================
// TYPES
// ============================================================================

interface NexusPrimePanelProps {
  memories: NexusMemoryItem[];
  insights: Insight[];
  pendingActions: ActionDraft[];
  onMemoryClick?: (memory: NexusMemoryItem) => void;
  onInsightClick?: (insight: Insight) => void;
  onActionClick?: (action: ActionDraft) => void;
  className?: string;
}

type TabId = 'memory' | 'insights' | 'actions';

// ============================================================================
// COMPONENT
// ============================================================================

export function NexusPrimePanel({
  memories,
  insights,
  pendingActions,
  onMemoryClick,
  onInsightClick,
  onActionClick,
  className = '',
}: NexusPrimePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('insights');

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: 'memory', label: 'Memory', count: memories.length },
    { id: 'insights', label: 'Insights', count: insights.length },
    { id: 'actions', label: 'Actions', count: pendingActions.length },
  ];

  return (
    <div className={`flex flex-col h-full bg-background border-l ${className}`}>
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="font-semibold text-sm">NEXUS PRIME</h2>
        <p className="text-xs text-muted-foreground">Intelligence Panel</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'memory' && (
          <MemoryList memories={memories} onMemoryClick={onMemoryClick} />
        )}
        {activeTab === 'insights' && (
          <InsightList insights={insights} onInsightClick={onInsightClick} />
        )}
        {activeTab === 'actions' && (
          <ActionList actions={pendingActions} onActionClick={onActionClick} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MEMORY LIST
// ============================================================================

function MemoryList({
  memories,
  onMemoryClick,
}: {
  memories: NexusMemoryItem[];
  onMemoryClick?: (memory: NexusMemoryItem) => void;
}) {
  if (memories.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p className="text-sm">No memories yet</p>
        <p className="text-xs mt-1">Ask NEXUS to remember something</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {memories.map(memory => (
        <div
          key={memory.id}
          onClick={() => onMemoryClick?.(memory)}
          className="p-3 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{memory.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">
                  {memory.category || 'general'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(memory.importance * 100)}% importance
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// INSIGHT LIST
// ============================================================================

function InsightList({
  insights,
  onInsightClick,
}: {
  insights: Insight[];
  onInsightClick?: (insight: Insight) => void;
}) {
  if (insights.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p className="text-sm">No insights yet</p>
        <p className="text-xs mt-1">Insights will appear as NEXUS analyzes data</p>
      </div>
    );
  }

  const getLevelStyles = (level: Insight['level']) => {
    switch (level) {
      case 'critical':
        return 'border-l-destructive bg-destructive/5';
      case 'warning':
        return 'border-l-yellow-500 bg-yellow-500/5';
      case 'success':
        return 'border-l-green-500 bg-green-500/5';
      default:
        return 'border-l-blue-500 bg-blue-500/5';
    }
  };

  return (
    <div className="space-y-2">
      {insights.map(insight => (
        <div
          key={insight.id}
          onClick={() => onInsightClick?.(insight)}
          className={`p-3 rounded-lg border-l-4 cursor-pointer hover:opacity-80 transition-opacity ${getLevelStyles(insight.level)}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{insight.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">
                  {insight.type}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {Math.round(insight.confidence * 100)}% confidence
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// ACTION LIST
// ============================================================================

function ActionList({
  actions,
  onActionClick,
}: {
  actions: ActionDraft[];
  onActionClick?: (action: ActionDraft) => void;
}) {
  if (actions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p className="text-sm">No pending actions</p>
        <p className="text-xs mt-1">Actions requiring confirmation will appear here</p>
      </div>
    );
  }

  const getSafetyStyles = (level: ActionDraft['safetyLevel']) => {
    switch (level) {
      case 'high':
        return 'border-destructive/50 bg-destructive/5';
      case 'medium':
        return 'border-yellow-500/50 bg-yellow-500/5';
      default:
        return 'border-green-500/50 bg-green-500/5';
    }
  };

  return (
    <div className="space-y-2">
      {actions.map(action => (
        <div
          key={action.id}
          onClick={() => onActionClick?.(action)}
          className={`p-3 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity ${getSafetyStyles(action.safetyLevel)}`}
        >
          <div>
            <p className="text-sm font-medium">{action.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                action.safetyLevel === 'high' ? 'bg-destructive/20 text-destructive' :
                action.safetyLevel === 'medium' ? 'bg-yellow-500/20 text-yellow-700' :
                'bg-green-500/20 text-green-700'
              }`}>
                {action.safetyLevel} risk
              </span>
              <span className="text-[10px] text-muted-foreground">
                from {action.source}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default NexusPrimePanel;

