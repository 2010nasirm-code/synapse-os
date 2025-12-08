// ============================================================================
// NEXUS FUSION - Main API Route
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { NexusFusion } from '@/nexus';
import { handleQuery } from '@/nexus/api/query';
import { handleMemoryAdd, handleMemorySearch, handleMemoryStats } from '@/nexus/api/memory';
import * as moduleHandlers from '@/nexus/api/modules';

// Initialize Nexus
const nexus = new NexusFusion({ autoInitialize: true });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { action, ...params } = body;

    let result: unknown;

    switch (action) {
      // Query
      case 'query':
        result = await handleQuery(nexus, { userId, ...params });
        break;

      // Memory
      case 'memory.add':
        result = await handleMemoryAdd(nexus, { userId, ...params });
        break;
      case 'memory.search':
        result = await handleMemorySearch(nexus, { userId, ...params });
        break;
      case 'memory.stats':
        result = await handleMemoryStats(nexus, userId);
        break;

      // Trackers
      case 'trackers.create':
        result = await moduleHandlers.handleTrackerCreate(nexus, { userId, ...params });
        break;
      case 'trackers.track':
        result = await moduleHandlers.handleTrackerTrack(nexus, params.id, params.value);
        break;
      case 'trackers.list':
        result = await moduleHandlers.handleTrackerList(nexus, userId, params);
        break;

      // Automations
      case 'automations.create':
        result = await moduleHandlers.handleAutomationCreate(nexus, { userId, ...params });
        break;
      case 'automations.activate':
        result = await moduleHandlers.handleAutomationActivate(nexus, params.id);
        break;
      case 'automations.deactivate':
        result = await moduleHandlers.handleAutomationDeactivate(nexus, params.id);
        break;
      case 'automations.trigger':
        result = await moduleHandlers.handleAutomationTrigger(nexus, params.id, params.context);
        break;
      case 'automations.list':
        result = await moduleHandlers.handleAutomationList(nexus, userId);
        break;

      // Knowledge
      case 'knowledge.create':
        result = await moduleHandlers.handleKnowledgeCreate(nexus, { userId, ...params });
        break;
      case 'knowledge.search':
        result = await moduleHandlers.handleKnowledgeSearch(nexus, userId, params.query, params);
        break;
      case 'knowledge.link':
        result = await moduleHandlers.handleKnowledgeLink(nexus, params.sourceId, params.targetId, params.type);
        break;
      case 'knowledge.graph':
        result = await moduleHandlers.handleKnowledgeGraph(nexus, userId);
        break;

      // Suggestions
      case 'suggestions.generate':
        result = await moduleHandlers.handleSuggestionsGenerate(nexus, userId, params.context);
        break;
      case 'suggestions.accept':
        result = await moduleHandlers.handleSuggestionAccept(nexus, params.id);
        break;
      case 'suggestions.reject':
        result = await moduleHandlers.handleSuggestionReject(nexus, params.id, params.reason);
        break;
      case 'suggestions.list':
        result = await moduleHandlers.handleSuggestionsList(nexus, userId);
        break;

      // Analytics
      case 'analytics.track':
        result = await moduleHandlers.handleAnalyticsTrack(
          nexus, userId, params.type, params.category, params.data
        );
        break;
      case 'analytics.dashboard':
        result = await moduleHandlers.handleAnalyticsDashboard(nexus, userId);
        break;
      case 'analytics.insights':
        result = await moduleHandlers.handleAnalyticsInsights(nexus, userId);
        break;

      // Agents
      case 'agents.create':
        result = await moduleHandlers.handleAgentCreate(nexus, { userId, ...params });
        break;
      case 'agents.start':
        result = await moduleHandlers.handleAgentStart(nexus, params.id);
        break;
      case 'agents.stop':
        result = await moduleHandlers.handleAgentStop(nexus, params.id);
        break;
      case 'agents.execute':
        result = await moduleHandlers.handleAgentExecute(nexus, params.id, params.task);
        break;
      case 'agents.list':
        result = await moduleHandlers.handleAgentsList(nexus, userId);
        break;

      // System
      case 'system.stats':
        result = nexus.getStats();
        break;
      case 'system.health':
        result = await nexus.healthCheck();
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error('[Nexus API Error]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const health = await nexus.healthCheck();

    return NextResponse.json({
      status: 'online',
      health,
      version: '2.0.0',
      timestamp: Date.now(),
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }
}


