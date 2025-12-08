'use client';

// ============================================================================
// NEXUS PRIME - DIAGNOSTICS PANEL COMPONENT
// System health and diagnostics display
// ============================================================================

import React, { useState } from 'react';
import { usePrime } from '../hooks/use-prime';
import { diagnosticsAPI, DiagnosticsReport } from '../api/diagnostics-api';

export function DiagnosticsPanel() {
  const { status, runPerfectionCheck, triggerSoftReset } = usePrime();
  const [report, setReport] = useState<DiagnosticsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [healing, setHealing] = useState(false);

  const runDiagnostics = async () => {
    setLoading(true);
    try {
      const result = await diagnosticsAPI.runFullDiagnostics();
      setReport(result);
    } catch (error) {
      console.error('Diagnostics failed:', error);
    }
    setLoading(false);
  };

  const triggerHealing = async () => {
    setHealing(true);
    try {
      await diagnosticsAPI.triggerHealing();
      await runDiagnostics(); // Refresh report
    } catch (error) {
      console.error('Healing failed:', error);
    }
    setHealing(false);
  };

  return (
    <div className="prime-diagnostics-panel rounded-lg bg-card border">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold">System Diagnostics</h3>
          <p className="text-xs text-muted-foreground">
            {status ? `Health: ${status.health.score}%` : 'Loading...'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="px-3 py-1 text-xs rounded bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Diagnostics'}
          </button>
        </div>
      </div>

      {/* Health Overview */}
      {status && (
        <div className="p-4 border-b">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className={`text-2xl font-bold ${
                status.health.score >= 80 ? 'text-green-500' :
                status.health.score >= 50 ? 'text-amber-500' : 'text-red-500'
              }`}>
                {status.health.score}%
              </div>
              <p className="text-xs text-muted-foreground">Health Score</p>
            </div>
            <div>
              <div className="text-2xl font-bold">{status.health.issues}</div>
              <p className="text-xs text-muted-foreground">Active Issues</p>
            </div>
            <div>
              <div className="text-2xl font-bold capitalize">{status.health.status}</div>
              <p className="text-xs text-muted-foreground">Status</p>
            </div>
          </div>
        </div>
      )}

      {/* Report Details */}
      {report && (
        <div className="p-4 space-y-4">
          {/* Perfection Checks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Perfection Checks</h4>
              <span className="text-xs text-muted-foreground">
                Score: {Math.round(report.perfection.score)}%
              </span>
            </div>
            <div className="space-y-1">
              {report.perfection.checks.map(check => (
                <div 
                  key={check.name}
                  className="flex items-center justify-between text-xs py-1"
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      check.passed ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    {check.name}
                  </span>
                  <span className="text-muted-foreground">{check.score}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Issues */}
          {report.issues.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Issues ({report.issues.length})</h4>
                <button
                  onClick={triggerHealing}
                  disabled={healing}
                  className="px-2 py-1 text-xs rounded bg-green-500/10 text-green-500 hover:bg-green-500/20 disabled:opacity-50"
                >
                  {healing ? 'Healing...' : 'Auto-Heal'}
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {report.issues.map(issue => (
                  <div 
                    key={issue.id}
                    className={`p-2 rounded text-xs ${
                      issue.severity === 'critical' ? 'bg-red-500/10 border border-red-500/20' :
                      issue.severity === 'high' ? 'bg-amber-500/10 border border-amber-500/20' :
                      'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                        issue.severity === 'critical' ? 'bg-red-500 text-white' :
                        issue.severity === 'high' ? 'bg-amber-500 text-white' :
                        'bg-muted-foreground/20'
                      }`}>
                        {issue.severity}
                      </span>
                      <span>{issue.component}</span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{issue.message}</p>
                    {issue.autoFixable && (
                      <span className="inline-block mt-1 text-green-500">Auto-fixable</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Recommendations</h4>
              <ul className="space-y-1">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Guardian Status */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Self-Healing Guardian</h4>
            <div className="grid grid-cols-3 gap-4 text-center text-xs">
              <div>
                <div className="font-semibold">{report.guardian.healed}</div>
                <p className="text-muted-foreground">Healed</p>
              </div>
              <div>
                <div className="font-semibold">{report.guardian.failed}</div>
                <p className="text-muted-foreground">Failed</p>
              </div>
              <div>
                <div className="font-semibold capitalize">{report.guardian.status}</div>
                <p className="text-muted-foreground">Status</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!report && !loading && (
        <div className="p-8 text-center text-muted-foreground">
          <p>Click "Run Diagnostics" to analyze system health</p>
        </div>
      )}
    </div>
  );
}

