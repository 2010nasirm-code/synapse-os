"use client";

/**
 * Result Viewer Component
 * Displays Nexus query results with formatting
 */

import React from "react";
import { CheckCircle, XCircle, Brain, Clock, Lightbulb } from "lucide-react";

interface NexusResult {
  success: boolean;
  answer: string;
  agentsUsed: string[];
  provenance?: Array<{
    agentId: string;
    agentName: string;
    contribution: string;
    confidence: number;
  }>;
  data?: any;
  suggestions?: string[];
  metadata?: {
    requestId: string;
    processingTime: number;
    timestamp: string;
  };
}

interface ResultViewerProps {
  result: NexusResult | null;
  onSuggestionClick?: (suggestion: string) => void;
  showProvenance?: boolean;
}

export function ResultViewer({
  result,
  onSuggestionClick,
  showProvenance = false,
}: ResultViewerProps) {
  if (!result) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Ask Nexus a question to see results here</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center gap-2">
        {result.success ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
        <span className={result.success ? "text-green-500" : "text-red-500"}>
          {result.success ? "Success" : "Failed"}
        </span>
        {result.metadata && (
          <span className="text-muted-foreground text-sm flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {result.metadata.processingTime}ms
          </span>
        )}
      </div>

      {/* Main Answer */}
      <div className="bg-secondary/50 rounded-lg p-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap">{result.answer}</div>
        </div>
      </div>

      {/* Agents Used */}
      {(result.agentsUsed?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Agents Used</h4>
          <div className="flex flex-wrap gap-2">
            {result.agentsUsed?.map((agent) => (
              <span
                key={agent}
                className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
              >
                {agent}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Provenance */}
      {showProvenance && (result.provenance?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Provenance</h4>
          <div className="space-y-2">
            {result.provenance?.map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg text-sm"
              >
                <div>
                  <span className="font-medium">{p.agentName}</span>
                  <span className="text-muted-foreground ml-2">
                    {p.contribution}
                  </span>
                </div>
                <span className="text-muted-foreground">
                  {Math.round(p.confidence * 100)}% confident
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data */}
      {result.data && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Data</h4>
          <pre className="p-4 bg-secondary/30 rounded-lg overflow-x-auto text-xs">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}

      {/* Suggestions */}
      {(result.suggestions?.length ?? 0) > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Suggestions
          </h4>
          <div className="flex flex-wrap gap-2">
            {result.suggestions?.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick?.(suggestion)}
                className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-sm rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

