import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { 
  sampleItems, 
  sampleAutomations, 
  sampleSuggestions,
  testAccounts 
} from "@/lib/beta/sample-data";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items = true, automations = true, suggestions = true, clear = false } = body;

    const results = {
      items: [] as any[],
      automations: [] as any[],
      suggestions: [] as any[],
      errors: [] as string[],
    };

    // Clear existing data if requested
    if (clear) {
      await supabase.from("items").delete().eq("user_id", user.id);
      await supabase.from("automations").delete().eq("user_id", user.id);
      await supabase.from("suggestions").delete().eq("user_id", user.id);
    }

    // Generate items
    if (items) {
      for (const item of sampleItems) {
        const { data, error } = await supabase
          .from("items")
          .insert({ ...item, user_id: user.id } as any)
          .select()
          .single();

        if (error) {
          results.errors.push(`Item: ${error.message}`);
        } else {
          results.items.push(data);
        }
      }
    }

    // Generate automations
    if (automations) {
      for (const automation of sampleAutomations) {
        const { data, error } = await supabase
          .from("automations")
          .insert({ ...automation, user_id: user.id } as any)
          .select()
          .single();

        if (error) {
          results.errors.push(`Automation: ${error.message}`);
        } else {
          results.automations.push(data);
        }
      }
    }

    // Generate suggestions
    if (suggestions) {
      for (const suggestion of sampleSuggestions) {
        const { data, error } = await supabase
          .from("suggestions")
          .insert({ ...suggestion, user_id: user.id } as any)
          .select()
          .single();

        if (error) {
          results.errors.push(`Suggestion: ${error.message}`);
        } else {
          results.suggestions.push(data);
        }
      }
    }

    // Track this action
    await supabase.from("analytics_events").insert({
      user_id: user.id,
      event_type: "sample_data_generated",
      event_data: {
        items_count: results.items.length,
        automations_count: results.automations.length,
        suggestions_count: results.suggestions.length,
        errors_count: results.errors.length,
      },
    } as any);

    return NextResponse.json({
      success: true,
      created: {
        items: results.items.length,
        automations: results.automations.length,
        suggestions: results.suggestions.length,
      },
      errors: results.errors,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tables = ["items", "automations", "suggestions", "analytics_events"];
    const results: Record<string, boolean> = {};

    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("user_id", user.id);

      results[table] = !error;
    }

    return NextResponse.json({
      success: true,
      cleared: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// Get test account info (for development only)
export async function GET() {
  // Only expose in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  return NextResponse.json({
    testAccounts,
    note: "These accounts are for beta testing only",
  });
}


