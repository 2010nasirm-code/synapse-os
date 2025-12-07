import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { AdvancedSuggestionEngine } from "@/lib/ai/advanced-engine";

// POST: Generate advanced AI suggestion
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json().catch(() => ({}));
    const { batch = false, count = 1 } = body;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all user data for analysis
    const [itemsResult, suggestionsResult, automationsResult] = await Promise.all([
      supabase.from("items").select("*").eq("user_id", user.id),
      supabase.from("suggestions").select("*").eq("user_id", user.id),
      supabase.from("automations").select("*").eq("user_id", user.id),
    ]);

    if (itemsResult.error) {
      return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
    }

    // Use the suggestion engine
    const engine = new AdvancedSuggestionEngine();
    engine.setContext({
      items: itemsResult.data || [],
      automations: automationsResult.data || [],
      analytics: null,
      profile: null,
    });

    const suggestions = await engine.generateSuggestions();
    const analysisSummary = engine.generateAnalysisSummary();

    // Get requested count
    const selectedSuggestions = batch ? suggestions.slice(0, count) : suggestions.slice(0, 1);

    if (selectedSuggestions.length === 0) {
      return NextResponse.json({ 
        error: "No suggestions available",
        analysisSummary 
      }, { status: 404 });
    }

    // Save to database
    const savedSuggestions = [];
    for (const suggestion of selectedSuggestions) {
      const { data: saved, error: saveError } = await supabase
        .from("suggestions")
        .insert({
          user_id: user.id,
          type: suggestion.type,
          title: suggestion.title,
          description: suggestion.description,
          impact: suggestion.impact,
          action_data: suggestion.action_data,
        } as any)
        .select()
        .single();

      if (!saveError && saved) {
        savedSuggestions.push(saved);
      }
    }

    // Track event
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type: "ai_suggestion_generated",
      event_data: {
        count: savedSuggestions.length,
        types: savedSuggestions.map(s => s.type),
        batch,
      },
    } as any);

    return NextResponse.json({
      success: true,
      suggestion: savedSuggestions[0] || null,
      suggestions: savedSuggestions,
      analysisSummary,
      analysis: {
        itemsAnalyzed: itemsResult.data?.length || 0,
        suggestionsGenerated: savedSuggestions.length,
      },
    });
  } catch (error) {
    console.error("AI suggestion error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET: Get analysis without saving
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [itemsResult, suggestionsResult, automationsResult] = await Promise.all([
      supabase.from("items").select("*").eq("user_id", user.id),
      supabase.from("suggestions").select("*").eq("user_id", user.id),
      supabase.from("automations").select("*").eq("user_id", user.id),
    ]);

    const engine = new AdvancedSuggestionEngine();
    engine.setContext({
      items: itemsResult.data || [],
      automations: automationsResult.data || [],
      analytics: null,
      profile: null,
    });

    const suggestions = await engine.generateSuggestions();
    const analysisSummary = engine.generateAnalysisSummary();

    return NextResponse.json({
      suggestions,
      analysisSummary,
      stats: {
        items: itemsResult.data?.length || 0,
        suggestions: suggestionsResult.data?.length || 0,
        automations: automationsResult.data?.length || 0,
      },
    });
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
