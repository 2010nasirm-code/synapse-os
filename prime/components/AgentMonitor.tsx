'use client';

// ============================================================================
// NEXUS PRIME - AGENT MONITOR COMPONENT
// Displays and controls Nexus Prime agents
// ============================================================================

import React, { useState } from 'react';
import { useAgents } from '../hooks/use-agents';

interface AgentMonitorProps {
  compact?: boolean;
}

export function AgentMonitor({ compact = false }: AgentMonitorProps) {
  const { agents, stats, startAgent, stopAgent, pauseAgent, resumeAgent } = useAgents();
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  if (compact) {
    return (
      <div className="prime-agent-monitor-compact flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Agents:</span>
        <div className="flex gap-1">
          {agents.map(agent => (
            <div
              key={agent.id}
              className={`w-2 h-2 rounded-full ${
                agent.status === 'working' ? 'bg-green-500 animate-pulse' :
                agent.status === 'idle' ? 'bg-green-500' :
                agent.status === 'paused' ? 'bg-amber-500' :
                'bg-red-500'
              }`}
              title={`${agent.name}: ${agent.status}`}
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="prime-agent-monitor rounded-lg bg-card border">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold">Agent Monitor</h3>
        {stats && (
          <p className="text-xs text-muted-foreground mt-1">
            {stats.activeAgents} active • {stats.totalTasks} tasks • {stats.totalMessages} messages
          </p>
        )}
      </div>

      {/* Agent List */}
      <div className="divide-y">
        {agents.map(agent => (
          <div key={agent.id} className="p-4">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  agent.status === 'working' ? 'bg-green-500 animate-pulse' :
                  agent.status === 'idle' ? 'bg-green-500' :
                  agent.status === 'paused' ? 'bg-amber-500' :
                  agent.status === 'error' ? 'bg-red-500' :
                  'bg-gray-500'
                }`}></div>
                <div>
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">{agent.description}</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  agent.status === 'working' ? 'bg-green-500/10 text-green-500' :
                  agent.status === 'idle' ? 'bg-blue-500/10 text-blue-500' :
                  agent.status === 'paused' ? 'bg-amber-500/10 text-amber-500' :
                  'bg-red-500/10 text-red-500'
                }`}>
                  {agent.status}
                </span>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedAgent === agent.id && (
              <div className="mt-4 pt-4 border-t space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-lg font-semibold">{agent.stats.tasksCompleted}</div>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{agent.stats.tasksFailen}</div>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">{agent.taskCount}</div>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                  <div>
                    <div className="text-lg font-semibold">
                      {agent.stats.avgTaskDuration > 0 
                        ? `${Math.round(agent.stats.avgTaskDuration)}ms`
                        : '-'
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">Avg Time</p>
                  </div>
                </div>

                {/* Capabilities */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Capabilities</p>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.map(cap => (
                      <span 
                        key={cap}
                        className="text-xs px-2 py-1 rounded bg-muted"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Controls */}
                <div className="flex gap-2">
                  {agent.status === 'stopped' ? (
                    <button
                      onClick={() => startAgent(agent.id)}
                      className="px-3 py-1 text-xs rounded bg-green-500/10 text-green-500 hover:bg-green-500/20"
                    >
                      Start
                    </button>
                  ) : agent.status === 'paused' ? (
                    <>
                      <button
                        onClick={() => resumeAgent(agent.id)}
                        className="px-3 py-1 text-xs rounded bg-green-500/10 text-green-500 hover:bg-green-500/20"
                      >
                        Resume
                      </button>
                      <button
                        onClick={() => stopAgent(agent.id)}
                        className="px-3 py-1 text-xs rounded bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      >
                        Stop
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => pauseAgent(agent.id)}
                        className="px-3 py-1 text-xs rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
                      >
                        Pause
                      </button>
                      <button
                        onClick={() => stopAgent(agent.id)}
                        className="px-3 py-1 text-xs rounded bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      >
                        Stop
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

