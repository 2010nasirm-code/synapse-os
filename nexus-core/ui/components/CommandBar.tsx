"use client";

/**
 * Command Bar Component
 * Global command palette activated by Ctrl+K
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Loader2, Sparkles, Brain, Zap, History } from "lucide-react";

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface QueryResult {
  success: boolean;
  answer: string;
  agentsUsed: string[];
  suggestions?: string[];
}

export function CommandBar({ isOpen, onClose, userId }: CommandBarProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/nexus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
        }),
      });

      const data = await response.json();
      setResult(data);
      setHistory((prev) => [query, ...prev.slice(0, 9)]);
    } catch (error) {
      setResult({
        success: false,
        answer: "Failed to process query. Please try again.",
        agentsUsed: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { label: "Summarize my tasks", icon: Sparkles },
    { label: "What should I focus on?", icon: Brain },
    { label: "Generate insights", icon: Zap },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Command palette */}
      <div className="relative w-full max-w-2xl bg-background border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Search input */}
        <form onSubmit={handleSubmit} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Nexus anything... (press Enter to send)"
            className="w-full h-14 pl-12 pr-12 bg-transparent text-lg outline-none placeholder:text-muted-foreground"
          />
          {loading ? (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
          ) : query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </form>

        {/* Results or suggestions */}
        <div className="border-t border-border max-h-[60vh] overflow-y-auto">
          {result ? (
            <div className="p-4 space-y-4">
              {/* Answer */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap">{result.answer}</div>
              </div>

              {/* Agents used */}
              {result.agentsUsed?.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Powered by:</span>
                  {result.agentsUsed.map((agent) => (
                    <span
                      key={agent}
                      className="px-2 py-0.5 bg-primary/10 text-primary rounded-full"
                    >
                      {agent}
                    </span>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {(result.suggestions?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Suggested follow-ups:</p>
                  <div className="flex flex-wrap gap-2">
                    {result.suggestions?.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setQuery(suggestion)}
                        className="text-sm px-3 py-1 bg-secondary hover:bg-secondary/80 rounded-full transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Quick actions */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground px-2">Quick actions</p>
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => setQuery(action.label)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary rounded-lg transition-colors"
                  >
                    <action.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>

              {/* History */}
              {history.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground px-2">Recent</p>
                  {history.slice(0, 5).map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(item)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-secondary rounded-lg transition-colors text-muted-foreground"
                    >
                      <History className="h-4 w-4" />
                      <span className="truncate">{item}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">Enter</kbd> to send
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px]">Esc</kbd> to close
            </span>
          </div>
          <span>Nexus AI</span>
        </div>
      </div>
    </div>
  );
}

// Hook to control command bar
export function useCommandBar() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}

