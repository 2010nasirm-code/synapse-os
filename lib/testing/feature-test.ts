/**
 * Feature Test Suite for Synapse OS
 * Simulates user interactions across all modules
 */

export interface TestResult {
  name: string;
  module: string;
  status: "pass" | "fail" | "skip";
  duration: number;
  error?: string;
  details?: string;
}

export interface TestSuite {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  results: TestResult[];
}

// Test runner
export async function runFeatureTests(supabase: any, userId: string): Promise<TestSuite> {
  const results: TestResult[] = [];
  const startTime = Date.now();

  // Helper to run a single test
  const runTest = async (
    name: string,
    module: string,
    testFn: () => Promise<void>
  ): Promise<TestResult> => {
    const testStart = Date.now();
    try {
      await testFn();
      return {
        name,
        module,
        status: "pass",
        duration: Date.now() - testStart,
      };
    } catch (error: any) {
      return {
        name,
        module,
        status: "fail",
        duration: Date.now() - testStart,
        error: error.message,
      };
    }
  };

  // ============================================
  // ITEMS MODULE TESTS
  // ============================================

  results.push(
    await runTest("Create item", "Items", async () => {
      const { data, error } = await supabase
        .from("items")
        .insert({
          user_id: userId,
          name: "Test Item " + Date.now(),
          description: "Created by feature test",
          priority: "medium",
          status: "pending",
          category: "Testing",
        })
        .select()
        .single();
      if (error) throw error;
      if (!data.id) throw new Error("No ID returned");
    })
  );

  results.push(
    await runTest("Read items", "Items", async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
      if (!Array.isArray(data)) throw new Error("Expected array");
    })
  );

  results.push(
    await runTest("Update item", "Items", async () => {
      const { data: items } = await supabase
        .from("items")
        .select("id")
        .eq("user_id", userId)
        .limit(1);
      if (!items?.length) throw new Error("No items to update");
      
      const { error } = await supabase
        .from("items")
        .update({ status: "in_progress" })
        .eq("id", items[0].id);
      if (error) throw error;
    })
  );

  results.push(
    await runTest("Filter items by status", "Items", async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending");
      if (error) throw error;
    })
  );

  results.push(
    await runTest("Filter items by priority", "Items", async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", userId)
        .eq("priority", "high");
      if (error) throw error;
    })
  );

  // ============================================
  // SUGGESTIONS MODULE TESTS
  // ============================================

  results.push(
    await runTest("Create suggestion", "Suggestions", async () => {
      const { data, error } = await supabase
        .from("suggestions")
        .insert({
          user_id: userId,
          title: "Test Suggestion",
          description: "Created by feature test",
          type: "insight",
          impact: "medium",
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
    })
  );

  results.push(
    await runTest("Read suggestions", "Suggestions", async () => {
      const { data, error } = await supabase
        .from("suggestions")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
    })
  );

  results.push(
    await runTest("Apply suggestion", "Suggestions", async () => {
      const { data: suggestions } = await supabase
        .from("suggestions")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "pending")
        .limit(1);
      if (!suggestions?.length) throw new Error("No suggestions to apply");
      
      const { error } = await supabase
        .from("suggestions")
        .update({ status: "applied" })
        .eq("id", suggestions[0].id);
      if (error) throw error;
    })
  );

  // ============================================
  // AUTOMATIONS MODULE TESTS
  // ============================================

  results.push(
    await runTest("Create automation", "Automations", async () => {
      const { data, error } = await supabase
        .from("automations")
        .insert({
          user_id: userId,
          name: "Test Automation",
          description: "Created by feature test",
          trigger_type: "item_created",
          trigger_config: {},
          action_type: "generate_suggestion",
          action_config: {},
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;
    })
  );

  results.push(
    await runTest("Read automations", "Automations", async () => {
      const { data, error } = await supabase
        .from("automations")
        .select("*")
        .eq("user_id", userId);
      if (error) throw error;
    })
  );

  results.push(
    await runTest("Toggle automation", "Automations", async () => {
      const { data: automations } = await supabase
        .from("automations")
        .select("id, is_active")
        .eq("user_id", userId)
        .limit(1);
      if (!automations?.length) throw new Error("No automations to toggle");
      
      const { error } = await supabase
        .from("automations")
        .update({ is_active: !automations[0].is_active })
        .eq("id", automations[0].id);
      if (error) throw error;
    })
  );

  // ============================================
  // ANALYTICS MODULE TESTS
  // ============================================

  results.push(
    await runTest("Track event", "Analytics", async () => {
      const { error } = await supabase.from("analytics_events").insert({
        user_id: userId,
        event_type: "feature_test",
        event_data: { test: true, timestamp: new Date().toISOString() },
      });
      if (error) throw error;
    })
  );

  results.push(
    await runTest("Read analytics events", "Analytics", async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
    })
  );

  // ============================================
  // API ENDPOINT TESTS
  // ============================================

  results.push(
    await runTest("Health check API", "API", async () => {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`Status: ${res.status}`);
      const data = await res.json();
      if (!data.status) throw new Error("No status in response");
    })
  );

  // ============================================
  // CLEANUP TEST DATA
  // ============================================

  results.push(
    await runTest("Cleanup test items", "Cleanup", async () => {
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("user_id", userId)
        .like("name", "Test Item%");
      if (error) throw error;
    })
  );

  results.push(
    await runTest("Cleanup test suggestions", "Cleanup", async () => {
      const { error } = await supabase
        .from("suggestions")
        .delete()
        .eq("user_id", userId)
        .eq("title", "Test Suggestion");
      if (error) throw error;
    })
  );

  results.push(
    await runTest("Cleanup test automations", "Cleanup", async () => {
      const { error } = await supabase
        .from("automations")
        .delete()
        .eq("user_id", userId)
        .eq("name", "Test Automation");
      if (error) throw error;
    })
  );

  // Calculate summary
  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.filter((r) => r.status === "fail").length;
  const skipped = results.filter((r) => r.status === "skip").length;

  return {
    totalTests: results.length,
    passed,
    failed,
    skipped,
    duration: Date.now() - startTime,
    results,
  };
}

// Format test results for display
export function formatTestResults(suite: TestSuite): string {
  let output = `\n========================================\n`;
  output += `  SYNAPSE OS FEATURE TEST RESULTS\n`;
  output += `========================================\n\n`;
  
  output += `Total: ${suite.totalTests} | `;
  output += `✅ Passed: ${suite.passed} | `;
  output += `❌ Failed: ${suite.failed} | `;
  output += `⏭️ Skipped: ${suite.skipped}\n`;
  output += `Duration: ${suite.duration}ms\n\n`;

  // Group by module
  const byModule: Record<string, TestResult[]> = {};
  suite.results.forEach((r) => {
    if (!byModule[r.module]) byModule[r.module] = [];
    byModule[r.module].push(r);
  });

  for (const [module, tests] of Object.entries(byModule)) {
    output += `\n📦 ${module}\n`;
    output += `${"─".repeat(40)}\n`;
    
    for (const test of tests) {
      const icon = test.status === "pass" ? "✅" : test.status === "fail" ? "❌" : "⏭️";
      output += `  ${icon} ${test.name} (${test.duration}ms)\n`;
      if (test.error) {
        output += `     └─ Error: ${test.error}\n`;
      }
    }
  }

  output += `\n========================================\n`;
  
  return output;
}


