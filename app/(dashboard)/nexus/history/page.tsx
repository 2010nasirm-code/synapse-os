"use client";

/**
 * Nexus History Page
 * View query history and logs
 */

import React, { useState, useEffect } from "react";
import {
  History,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface LogEntry {
  id: string;
  level: string;
  category: string;
  message: string;
  timestamp: string;
}

export default function NexusHistoryPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    level: "all",
    category: "all",
    search: "",
  });
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/nexus?action=logs&limit=100");
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filter.level === "all" || log.level === filter.level;
    const matchesCategory = filter.category === "all" || log.category === filter.category;
    const matchesSearch = log.message.toLowerCase().includes(filter.search.toLowerCase());
    return matchesLevel && matchesCategory && matchesSearch;
  });

  const levelColors: Record<string, string> = {
    debug: "text-gray-500",
    info: "text-blue-500",
    warn: "text-yellow-500",
    error: "text-red-500",
  };

  const levelIcons: Record<string, React.ReactNode> = {
    debug: <Clock className="h-4 w-4" />,
    info: <CheckCircle className="h-4 w-4" />,
    warn: <Clock className="h-4 w-4" />,
    error: <XCircle className="h-4 w-4" />,
  };

  const categories = Array.from(new Set(logs.map((l) => l.category)));
  const levels = ["all", "debug", "info", "warn", "error"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <History className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">History</h1>
              <p className="text-muted-foreground">{logs.length} log entries</p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchLogs}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={filter.search}
                  onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                  placeholder="Search logs..."
                  className="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Level Filter */}
              <select
                value={filter.level}
                onChange={(e) => setFilter({ ...filter, level: e.target.value })}
                className="px-4 py-2 bg-secondary rounded-lg"
              >
                {levels.map((level) => (
                  <option key={level} value={level}>
                    {level === "all" ? "All Levels" : level.toUpperCase()}
                  </option>
                ))}
              </select>

              {/* Category Filter */}
              <select
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                className="px-4 py-2 bg-secondary rounded-lg"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs */}
      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading history...
          </div>
        ) : filteredLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                No logs found matching your filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpandedLog(expandedLog === log.id ? null : log.id)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <span className={levelColors[log.level]}>
                        {levelIcons[log.level]}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-secondary rounded">
                        {log.category}
                      </span>
                      <span className="flex-1 truncate">{log.message}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform ${
                          expandedLog === log.id ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    {expandedLog === log.id && (
                      <div className="mt-3 pl-7 text-sm">
                        <div className="p-3 bg-secondary rounded-lg">
                          <p>
                            <strong>ID:</strong> {log.id}
                          </p>
                          <p>
                            <strong>Level:</strong> {log.level}
                          </p>
                          <p>
                            <strong>Category:</strong> {log.category}
                          </p>
                          <p>
                            <strong>Message:</strong> {log.message}
                          </p>
                          <p>
                            <strong>Time:</strong>{" "}
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

