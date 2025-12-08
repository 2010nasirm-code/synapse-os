'use client';

// ============================================================================
// NEXUS PRIME - EVOLUTION PANEL COMPONENT
// Displays and manages evolved features and insights
// ============================================================================

import React, { useState } from 'react';
import { useEvolution } from '../hooks/use-evolution';

interface EvolutionPanelProps {
  showInsights?: boolean;
  showFeatures?: boolean;
}

export function EvolutionPanel({ showInsights = true, showFeatures = true }: EvolutionPanelProps) {
  const { 
    status, 
    proposedFeatures, 
    activeFeatures, 
    actionableInsights,
    activateFeature,
    deactivateFeature,
    applyInsight,
  } = useEvolution();
  
  const [activeTab, setActiveTab] = useState<'features' | 'insights'>('features');

  if (!status) {
    return (
      <div className="prime-evolution-panel rounded-lg bg-card border p-4">
        <div className="text-center text-muted-foreground">Loading evolution data...</div>
      </div>
    );
  }

  return (
    <div className="prime-evolution-panel rounded-lg bg-card border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b">
        <h3 className="font-semibold">System Evolution</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {status.features.active} active features • {status.insights.actionable} actionable insights
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {showFeatures && (
          <button
            onClick={() => setActiveTab('features')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'features'
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Features ({status.features.total})
          </button>
        )}
        {showInsights && (
          <button
            onClick={() => setActiveTab('insights')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'insights'
                ? 'bg-primary/10 text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Insights ({status.insights.total})
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 max-h-80 overflow-y-auto">
        {activeTab === 'features' && showFeatures && (
          <div className="space-y-3">
            {/* Active Features */}
            {activeFeatures.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Active Features</p>
                {activeFeatures.map(feature => (
                  <div key={feature.id} className="flex items-center justify-between p-2 rounded bg-green-500/5 border border-green-500/20 mb-2">
                    <div>
                      <p className="text-sm font-medium">{feature.name}</p>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                    <button
                      onClick={() => deactivateFeature(feature.id)}
                      className="px-2 py-1 text-xs rounded bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    >
                      Disable
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Proposed Features */}
            {proposedFeatures.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Proposed Features</p>
                {proposedFeatures.map(feature => (
                  <div key={feature.id} className="flex items-center justify-between p-2 rounded bg-muted mb-2">
                    <div>
                      <p className="text-sm font-medium">{feature.name}</p>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Confidence: {Math.round(feature.confidence * 100)}%
                      </p>
                    </div>
                    <button
                      onClick={() => activateFeature(feature.id)}
                      className="px-2 py-1 text-xs rounded bg-green-500/10 text-green-500 hover:bg-green-500/20"
                    >
                      Activate
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeFeatures.length === 0 && proposedFeatures.length === 0 && (
              <p className="text-center text-muted-foreground text-sm">
                No features evolved yet. Keep using the app to discover patterns.
              </p>
            )}
          </div>
        )}

        {activeTab === 'insights' && showInsights && (
          <div className="space-y-2">
            {actionableInsights.map(insight => (
              <div key={insight.id} className="p-3 rounded bg-muted">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        insight.type === 'optimization' ? 'bg-blue-500/10 text-blue-500' :
                        insight.type === 'warning' ? 'bg-amber-500/10 text-amber-500' :
                        insight.type === 'suggestion' ? 'bg-green-500/10 text-green-500' :
                        'bg-purple-500/10 text-purple-500'
                      }`}>
                        {insight.type}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(insight.confidence * 100)}% confidence
                      </span>
                    </div>
                    <p className="text-sm font-medium mt-1">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                  {insight.actionable && (
                    <button
                      onClick={() => applyInsight(insight.id)}
                      className="px-2 py-1 text-xs rounded bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            ))}

            {actionableInsights.length === 0 && (
              <p className="text-center text-muted-foreground text-sm">
                No actionable insights yet. The system is learning from your usage.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

