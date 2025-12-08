"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertTriangle,
  RefreshCw 
} from "lucide-react";

interface TestResult {
  name: string;
  module: string;
  status: "pass" | "fail" | "skip";
  duration: number;
  error?: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: string;
}

export default function TestPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<TestSummary | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setError(null);
    setSummary(null);
    setResults([]);

    try {
      const response = await fetch("/api/test");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Test failed");
      }

      setSummary(data.summary);
      setResults(data.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  // Group results by module
  const groupedResults: Record<string, TestResult[]> = {};
  results.forEach((r) => {
    if (!groupedResults[r.module]) groupedResults[r.module] = [];
    groupedResults[r.module].push(r);
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🧪 Feature Tests</h1>
        <p className="text-muted-foreground">
          Run automated tests across all modules to verify functionality.
        </p>
      </div>

      {/* Run Button */}
      <div className="mb-8">
        <Button 
          onClick={runTests} 
          disabled={isRunning}
          size="lg"
          className="gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Run All Tests
            </>
          )}
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="mb-8 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg bg-muted text-center">
            <div className="text-2xl font-bold">{summary.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </div>
          <div className="p-4 rounded-lg bg-green-500/10 text-center">
            <div className="text-2xl font-bold text-green-500">{summary.passed}</div>
            <div className="text-sm text-green-500/70">Passed</div>
          </div>
          <div className="p-4 rounded-lg bg-red-500/10 text-center">
            <div className="text-2xl font-bold text-red-500">{summary.failed}</div>
            <div className="text-sm text-red-500/70">Failed</div>
          </div>
          <div className="p-4 rounded-lg bg-yellow-500/10 text-center">
            <div className="text-2xl font-bold text-yellow-500">{summary.skipped}</div>
            <div className="text-sm text-yellow-500/70">Skipped</div>
          </div>
          <div className="p-4 rounded-lg bg-muted text-center">
            <div className="text-2xl font-bold">{summary.duration}</div>
            <div className="text-sm text-muted-foreground">Duration</div>
          </div>
        </div>
      )}

      {/* Results by Module */}
      {Object.entries(groupedResults).map(([module, tests]) => (
        <div key={module} className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            📦 {module}
            <span className="text-sm font-normal text-muted-foreground">
              ({tests.filter(t => t.status === "pass").length}/{tests.length} passed)
            </span>
          </h2>
          <div className="space-y-2">
            {tests.map((test, i) => (
              <div 
                key={i}
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  test.status === "pass" 
                    ? "bg-green-500/5 border-green-500/20" 
                    : test.status === "fail"
                    ? "bg-red-500/5 border-red-500/20"
                    : "bg-muted border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  {test.status === "pass" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : test.status === "fail" ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <RefreshCw className="h-5 w-5 text-yellow-500" />
                  )}
                  <div>
                    <div className="font-medium">{test.name}</div>
                    {test.error && (
                      <div className="text-sm text-red-500">{test.error}</div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {test.duration}ms
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Empty State */}
      {!isRunning && results.length === 0 && !error && (
        <div className="text-center py-12 text-muted-foreground">
          Click "Run All Tests" to start testing
        </div>
      )}
    </div>
  );
}


