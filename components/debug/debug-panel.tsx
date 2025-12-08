"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Bug,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Filter,
  Search,
  Terminal,
  Activity,
  Zap,
  Database,
  RefreshCw,
  Copy,
  Check,
  Settings,
} from "lucide-react";
import { logger } from "@/lib/debug/logger";
import { generateSampleData, clearUserData } from "@/lib/beta/sample-data";
import { getSupabaseClient } from "@/lib/supabase/client";

interface DebugPanelProps {
  enabled?: boolean;
}

export function DebugPanel({ enabled = true }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const supabase = getSupabaseClient();

  // Subscribe to log updates
  useEffect(() => {
    const unsubscribe = logger.subscribe((log) => {
      setLogs((prev) => [...prev, log].slice(-500));
    });

    // Load initial logs
    setLogs(logger.getLogs());

    return () => unsubscribe();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (!isMinimized && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isMinimized]);

  if (!enabled) return null;

  const handleExport = () => {
    const data = logger.exportLogs();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `synapse-os-logs-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logger.info("debug", "Logs exported");
  };

  const handleClear = () => {
    logger.clearLogs();
    setLogs([]);
  };

  const handleCopyLogs = async () => {
    await navigator.clipboard.writeText(logger.exportLogs());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateSampleData = async () => {
    setIsGenerating(true);
    logger.info("debug", "Generating sample data...");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.error("debug", "No user logged in - cannot generate sample data");
        return;
      }

      const result = await generateSampleData(supabase, user.id);
      logger.info("debug", "Sample data generated", {
        items: result.items.length,
        automations: result.automations.length,
        suggestions: result.suggestions.length,
        errors: result.errors.length,
      });

      if (result.errors.length > 0) {
        result.errors.forEach(err => logger.warn("debug", err));
      }
    } catch (error: any) {
      logger.error("debug", "Failed to generate sample data", { error: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearUserData = async () => {
    setIsClearing(true);
    logger.info("debug", "Clearing user data...");
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.error("debug", "No user logged in");
        return;
      }

      const result = await clearUserData(supabase, user.id);
      if (result.success) {
        logger.info("debug", "User data cleared successfully");
      } else {
        result.errors.forEach(err => logger.error("debug", err));
      }
    } catch (error: any) {
      logger.error("debug", "Failed to clear user data", { error: error.message });
    } finally {
      setIsClearing(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesFilter = filter === "all" || log.level === filter || log.category === filter;
    const matchesSearch = !searchQuery || 
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.data || {}).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case "debug": return "text-gray-500";
      case "info": return "text-blue-500";
      case "warn": return "text-yellow-500";
      case "error": return "text-red-500";
      default: return "text-foreground";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "api": return Database;
      case "performance": return Activity;
      case "ui": return Zap;
      default: return Terminal;
    }
  };

  const sessionInfo = logger.getSessionInfo();

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 left-6 z-50 p-3 rounded-full bg-orange-500 text-white shadow-lg hover:shadow-xl transition-shadow",
          isOpen && "hidden"
        )}
        title="Open Debug Panel"
      >
        <Bug className="h-5 w-5" />
      </motion.button>

      {/* Debug Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={cn(
              "fixed left-4 bottom-4 z-50 bg-background border rounded-xl shadow-2xl overflow-hidden font-mono text-xs",
              isMinimized ? "w-80" : "w-[500px] max-w-[calc(100vw-2rem)]"
            )}
          >
            {/* Header */}
            <div className="p-3 border-b bg-orange-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                <span className="font-semibold">Debug Console</span>
                <span className="text-xs opacity-75">Beta</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  {isMinimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/20 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Session Info */}
                <div className="px-3 py-2 border-b bg-muted/50 text-[10px] text-muted-foreground flex items-center gap-4">
                  <span>Session: {sessionInfo.sessionId.slice(0, 16)}...</span>
                  <span>Logs: {sessionInfo.logsCount}</span>
                  <span className="flex items-center gap-1">
                    <span className={cn("w-2 h-2 rounded-full", sessionInfo.isEnabled ? "bg-green-500" : "bg-red-500")} />
                    {sessionInfo.isEnabled ? "Active" : "Disabled"}
                  </span>
                </div>

                {/* Toolbar */}
                <div className="p-2 border-b flex items-center gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[150px]">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search logs..."
                      className="h-7 pl-7 text-xs"
                    />
                  </div>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="h-7 px-2 text-xs rounded border bg-background"
                  >
                    <option value="all">All</option>
                    <optgroup label="Level">
                      <option value="debug">Debug</option>
                      <option value="info">Info</option>
                      <option value="warn">Warning</option>
                      <option value="error">Error</option>
                    </optgroup>
                    <optgroup label="Category">
                      <option value="api">API</option>
                      <option value="ui">UI</option>
                      <option value="suggestions">Suggestions</option>
                      <option value="automations">Automations</option>
                      <option value="graph">Graph</option>
                    </optgroup>
                  </select>
                </div>

                {/* Logs */}
                <div className="h-64 overflow-y-auto p-2 space-y-1 bg-black/5 dark:bg-white/5">
                  {filteredLogs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      No logs to display
                    </div>
                  ) : (
                    filteredLogs.map((log) => {
                      const Icon = getCategoryIcon(log.category);
                      return (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={cn(
                            "p-1.5 rounded border bg-background hover:bg-muted/50 transition-colors",
                            log.level === "error" && "border-red-500/30 bg-red-500/5"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <Icon className={cn("h-3 w-3 mt-0.5 shrink-0", getLevelColor(log.level))} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn("font-semibold", getLevelColor(log.level))}>
                                  [{log.category}]
                                </span>
                                <span className="truncate">{log.message}</span>
                              </div>
                              {log.data && (
                                <pre className="mt-1 p-1 rounded bg-muted text-[10px] overflow-x-auto">
                                  {JSON.stringify(log.data, null, 2)}
                                </pre>
                              )}
                              <span className="text-[9px] text-muted-foreground">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                  <div ref={logsEndRef} />
                </div>

                {/* Actions */}
                <div className="p-2 border-t flex items-center gap-2 flex-wrap">
                  <Button variant="outline" size="sm" onClick={handleCopyLogs} className="h-7 text-xs gap-1">
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExport} className="h-7 text-xs gap-1">
                    <Download className="h-3 w-3" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleClear} className="h-7 text-xs gap-1">
                    <Trash2 className="h-3 w-3" />
                    Clear
                  </Button>
                  <div className="flex-1" />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleGenerateSampleData}
                    disabled={isGenerating}
                    className="h-7 text-xs gap-1"
                  >
                    {isGenerating ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Database className="h-3 w-3" />}
                    {isGenerating ? "Generating..." : "Add Sample Data"}
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleClearUserData}
                    disabled={isClearing}
                    className="h-7 text-xs gap-1"
                  >
                    {isClearing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    {isClearing ? "Clearing..." : "Reset Data"}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


