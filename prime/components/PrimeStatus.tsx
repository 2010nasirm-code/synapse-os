'use client';

// ============================================================================
// NEXUS PRIME - STATUS COMPONENT
// Displays Nexus Prime system status
// ============================================================================

import React from 'react';
import { usePrimeContext } from './PrimeProvider';

interface PrimeStatusProps {
  compact?: boolean;
  showAgents?: boolean;
  showHealth?: boolean;
}

export function PrimeStatus({ compact = false, showAgents = true, showHealth = true }: PrimeStatusProps) {
  const { status, initialized, error } = usePrimeContext();

  if (error) {
    return (
      <div className="prime-status prime-status-error rounded-lg bg-red-500/10 border border-red-500/20 p-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="text-red-500 font-medium">Error</span>
        </div>
        <p className="text-sm text-red-400 mt-1">{error}</p>
      </div>
    );
  }

  if (!initialized || !status) {
    return (
      <div className="prime-status prime-status-loading rounded-lg bg-muted p-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
          <span className="text-muted-foreground">Initializing Nexus Prime...</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="prime-status prime-status-compact flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          status.health.status === 'healthy' ? 'bg-green-500' :
          status.health.status === 'warning' ? 'bg-amber-500' : 'bg-red-500'
        }`}></div>
        <span className="text-sm text-muted-foreground">
          Prime {status.health.score}%
        </span>
      </div>
    );
  }

  return (
    <div className="prime-status rounded-lg bg-card border p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            status.health.status === 'healthy' ? 'bg-green-500' :
            status.health.status === 'warning' ? 'bg-amber-500 animate-pulse' : 'bg-red-500 animate-pulse'
          }`}></div>
          <div>
            <h3 className="font-semibold">Nexus Prime</h3>
            <p className="text-xs text-muted-foreground">v{status.version}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{status.health.score}%</div>
          <p className="text-xs text-muted-foreground">Health Score</p>
        </div>
      </div>

      {/* Health Details */}
      {showHealth && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-semibold">{status.health.issues}</div>
            <p className="text-xs text-muted-foreground">Issues</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold">{formatUptime(status.uptime)}</div>
            <p className="text-xs text-muted-foreground">Uptime</p>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold capitalize">{status.status}</div>
            <p className="text-xs text-muted-foreground">Status</p>
          </div>
        </div>
      )}

      {/* Agent Status */}
      {showAgents && (
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Agents</span>
              <span className="text-sm font-medium">{status.agents.active}/{status.agents.total}</span>
            </div>
            <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${(status.agents.active / status.agents.total) * 100}%` }}
              ></div>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Services</span>
              <span className="text-sm font-medium">{status.services.active}/{status.services.total}</span>
            </div>
            <div className="mt-1 h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${(status.services.active / Math.max(1, status.services.total)) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

