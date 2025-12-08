import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { runFeatureTests, formatTestResults } from "@/lib/testing/feature-test";

// GET: Run all feature tests
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized - Please login first" }, { status: 401 });
    }

    console.log("Starting feature tests for user:", user.id);
    
    // Run all tests
    const results = await runFeatureTests(supabase, user.id);
    
    // Log results
    console.log(formatTestResults(results));

    return NextResponse.json({
      success: results.failed === 0,
      summary: {
        total: results.totalTests,
        passed: results.passed,
        failed: results.failed,
        skipped: results.skipped,
        duration: `${results.duration}ms`,
      },
      results: results.results,
      formatted: formatTestResults(results),
    });
  } catch (error: any) {
    console.error("Test suite error:", error);
    return NextResponse.json(
      { error: error.message || "Test suite failed" },
      { status: 500 }
    );
  }
}


