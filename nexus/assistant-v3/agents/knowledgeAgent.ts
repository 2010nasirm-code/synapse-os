/**
 * ============================================================================
 * NEXUS ASSISTANT V3 - KNOWLEDGE AGENT
 * ============================================================================
 * 
 * Handles web search and knowledge queries with safety filters.
 * 
 * @module nexus/assistant-v3/agents/knowledgeAgent
 * @version 3.0.0
 */

import { AgentResult, Source, KnowledgeQuery } from '../core/types';
import { RuntimeContext } from '../core/contextBuilder';
import { IntentAnalysis } from '../core/router';
import { IAgent } from '../core/coordinator';
import { SafetyChecker, ContentFilter } from '../core/safety';

// ============================================================================
// API CONFIGURATION
// ============================================================================

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const SERP_API_KEY = process.env.SERP_API_KEY;

// ============================================================================
// KNOWLEDGE BASE (OFFLINE FALLBACK)
// ============================================================================

interface KnowledgeEntry {
  keywords: string[];
  answer: string;
  sources?: Source[];
}

const offlineKnowledge: KnowledgeEntry[] = [
  {
    keywords: ['sky', 'blue'],
    answer: 'The sky appears blue due to Rayleigh scattering. Sunlight is scattered by the atmosphere, and blue light is scattered more than other colors because it travels in shorter, smaller waves.',
    sources: [{
      title: 'Physics of Light Scattering',
      url: 'https://en.wikipedia.org/wiki/Rayleigh_scattering',
      type: 'wikipedia',
    }],
  },
  {
    keywords: ['photosynthesis'],
    answer: 'Photosynthesis is the process by which plants convert sunlight, water, and carbon dioxide into glucose and oxygen. It occurs in the chloroplasts and is essential for producing the oxygen we breathe.',
    sources: [{
      title: 'Photosynthesis - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Photosynthesis',
      type: 'wikipedia',
    }],
  },
  {
    keywords: ['quantum', 'physics'],
    answer: 'Quantum physics studies the behavior of matter and energy at the smallest scales. It reveals that particles can exist in multiple states simultaneously (superposition) and that observing them affects their behavior.',
    sources: [{
      title: 'Quantum Mechanics - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Quantum_mechanics',
      type: 'wikipedia',
    }],
  },
  {
    keywords: ['gravity'],
    answer: "Gravity is a fundamental force that attracts objects with mass toward each other. Einstein's general relativity describes it as the curvature of spacetime caused by mass and energy.",
    sources: [{
      title: 'Gravity - Wikipedia',
      url: 'https://en.wikipedia.org/wiki/Gravity',
      type: 'wikipedia',
    }],
  },
];

// ============================================================================
// QUERY ANALYSIS
// ============================================================================

function analyzeKnowledgeQuery(query: string): KnowledgeQuery {
  const lower = query.toLowerCase();
  
  let type: KnowledgeQuery['type'] = 'general';
  let requiresFreshData = false;

  // Determine query type
  if (/\bwhat\s+is\b|\bdefine\b|\bmeaning\s+of\b/.test(lower)) {
    type = 'definition';
  } else if (/\bhow\s+to\b|\bhow\s+do\b|\bsteps\s+to\b/.test(lower)) {
    type = 'howto';
  } else if (/\bnews\b|\blatest\b|\brecent\b|\btoday\b|\b2024\b|\b2025\b/.test(lower)) {
    type = 'news';
    requiresFreshData = true;
  } else if (/\bwhat\s+is\b|\bwho\s+is\b|\bwhy\s+does\b/.test(lower)) {
    type = 'factual';
  }

  return {
    query,
    type,
    requiresFreshData,
  };
}

// ============================================================================
// SEARCH FUNCTIONS
// ============================================================================

async function searchTavily(query: string): Promise<Source[]> {
  if (!TAVILY_API_KEY) return [];

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        include_answer: false,
        max_results: 5,
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      type: 'web' as const,
      reliability: 0.8,
    }));
  } catch (error) {
    console.error('[KnowledgeAgent] Tavily search failed:', error);
    return [];
  }
}

async function searchWikipedia(query: string): Promise<Source[]> {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=3`;
    
    const response = await fetch(searchUrl);
    if (!response.ok) return [];

    const data = await response.json();
    const results = data.query?.search || [];

    return results.map((r: any) => ({
      title: r.title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(r.title.replace(/ /g, '_'))}`,
      snippet: r.snippet.replace(/<[^>]+>/g, ''),
      type: 'wikipedia' as const,
      reliability: 0.9,
    }));
  } catch (error) {
    console.error('[KnowledgeAgent] Wikipedia search failed:', error);
    return [];
  }
}

// ============================================================================
// OFFLINE SEARCH
// ============================================================================

function searchOffline(query: string): { answer: string; sources: Source[] } | null {
  const lower = query.toLowerCase();
  
  for (const entry of offlineKnowledge) {
    const matches = entry.keywords.filter(kw => lower.includes(kw));
    if (matches.length >= 1) {
      return {
        answer: entry.answer,
        sources: entry.sources || [],
      };
    }
  }

  return null;
}

// ============================================================================
// KNOWLEDGE AGENT
// ============================================================================

export class KnowledgeAgent implements IAgent {
  id = 'knowledge';
  name = 'Knowledge Agent';
  priority = 9;
  canParallelize = true;

  async execute(context: RuntimeContext, intent: IntentAnalysis): Promise<AgentResult> {
    const startTime = Date.now();

    try {
      const query = context.request.query;
      
      // Safety check the query
      const safetyCheck = SafetyChecker.checkContent(query);
      if (!safetyCheck.safe) {
        return {
          agentId: this.id,
          success: true,
          response: "I can't search for that type of content.",
          provenance: {
            agent: this.id,
            inputs: ['blocked_query'],
            confidence: 1,
            timestamp: new Date().toISOString(),
            operation: 'safety_block',
          },
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Analyze the query
      const knowledgeQuery = analyzeKnowledgeQuery(query);

      // Try web search first (if API available)
      let sources: Source[] = [];
      let answer: string | undefined;

      if (TAVILY_API_KEY || SERP_API_KEY) {
        // Use external search
        const webResults = await searchTavily(query);
        const wikiResults = await searchWikipedia(query);
        
        // Combine and filter results
        const allResults = [...webResults, ...wikiResults];
        sources = ContentFilter.filterSearchResults(allResults) as Source[];

        if (sources.length > 0) {
          answer = this.synthesizeAnswer(query, sources, context);
        }
      }

      // Fallback to offline knowledge
      if (!answer) {
        const offline = searchOffline(query);
        if (offline) {
          answer = offline.answer;
          sources = offline.sources;
        }
      }

      // No results found
      if (!answer) {
        const response = context.persona === 'friendly'
          ? "I couldn't find reliable information about that. 🤔 Could you try rephrasing your question?"
          : "No reliable information found for this query. Please try a different search term.";

        return {
          agentId: this.id,
          success: true,
          response,
          provenance: {
            agent: this.id,
            inputs: [query],
            confidence: 0.3,
            timestamp: new Date().toISOString(),
            operation: 'no_results',
          },
          processingTimeMs: Date.now() - startTime,
        };
      }

      // Format response with sources
      let response = answer;
      
      if (sources.length > 0) {
        response += '\n\n**Sources:**\n';
        sources.slice(0, 3).forEach((source, i) => {
          response += `${i + 1}. [${source.title}](${source.url})\n`;
        });
      }

      return {
        agentId: this.id,
        success: true,
        response,
        provenance: {
          agent: this.id,
          inputs: [query],
          confidence: sources.length > 0 ? 0.85 : 0.6,
          timestamp: new Date().toISOString(),
          operation: 'knowledge_search',
        },
        processingTimeMs: Date.now() - startTime,
      };

    } catch (error) {
      return {
        agentId: this.id,
        success: false,
        error: error instanceof Error ? error.message : 'Knowledge search failed',
        provenance: {
          agent: this.id,
          inputs: [context.request.query],
          confidence: 0,
          timestamp: new Date().toISOString(),
          operation: 'error',
        },
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  private synthesizeAnswer(query: string, sources: Source[], context: RuntimeContext): string {
    // Combine snippets from sources
    const snippets = sources
      .filter(s => s.snippet)
      .map(s => s.snippet!)
      .slice(0, 3)
      .join(' ');

    if (!snippets) {
      return sources[0]?.snippet || 'Found relevant information but unable to summarize.';
    }

    // Simple synthesis - in production would use LLM
    let answer = snippets;

    // Trim to reasonable length
    if (answer.length > 500) {
      answer = answer.slice(0, 500) + '...';
    }

    // Add persona touch
    if (context.persona === 'friendly') {
      answer = `Here's what I found! 📚\n\n${answer}`;
    } else if (context.persona === 'teacher') {
      answer = `Based on my research:\n\n${answer}`;
    }

    return answer;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: KnowledgeAgent | null = null;

export function getKnowledgeAgent(): KnowledgeAgent {
  if (!instance) {
    instance = new KnowledgeAgent();
  }
  return instance;
}

export default KnowledgeAgent;

