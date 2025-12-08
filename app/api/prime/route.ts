/**
 * ============================================================================
 * NEXUS PRIME - API Route
 * ============================================================================
 * 
 * Main API endpoint for NEXUS PRIME system.
 * Uses OpenAI for intelligent responses to ANY question.
 * POST /api/prime
 */

import { NextRequest, NextResponse } from 'next/server';

// System prompt that makes the AI helpful for everything
const SYSTEM_PROMPT = `You are Nexus Prime, an advanced AI assistant. You can help with ANYTHING:

**Your Capabilities:**
- Math problems (algebra, calculus, geometry, statistics, any level)
- Homework help (essays, science, history, languages, coding)
- General knowledge (facts, explanations, how things work)
- Creative writing (stories, poems, ideas)
- Coding help (any language, debugging, explanations)
- Study help (explanations, practice questions, summaries)
- Life advice and problem-solving
- Research and information

**Your Style:**
- Clear and easy to understand
- Step-by-step for complex problems
- Show your work for math
- Give examples when helpful
- Be encouraging and supportive
- Use markdown formatting for clarity

**Rules:**
- Always try to help, even with difficult questions
- If you're not 100% sure, say so but still try to help
- Break down complex topics into simple parts
- For math: show each step of the solution
- For homework: explain the concept, don't just give answers
- Be friendly and approachable

You are here to help students, teens, and anyone learn and succeed!`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, conversationHistory } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing prompt' },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      // Use smart fallback for common questions
      const fallbackResponse = generateSmartFallback(prompt);
      return NextResponse.json({
        success: true,
        answer: fallbackResponse.answer,
        agentsUsed: ['Offline Mode'],
        insights: [],
        actionDrafts: [],
        note: 'Running in offline mode. Add OPENAI_API_KEY for full AI capabilities.',
      });
    }

    // Build messages for OpenAI
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    // Add conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory.slice(-10)) {
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    // Add current prompt
    messages.push({ role: 'user', content: prompt });

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and affordable
        messages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Prime API] OpenAI error:', errorData);
      
      // Fallback if OpenAI fails
      const fallbackResponse = generateSmartFallback(prompt);
      return NextResponse.json({
        success: true,
        answer: fallbackResponse.answer,
        agentsUsed: ['Fallback Mode'],
        insights: [],
        actionDrafts: [],
      });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'I couldn\'t generate a response. Please try again.';

    // Detect insights from the response
    const insights = detectInsights(prompt, answer);

    return NextResponse.json({
      success: true,
      answer,
      agentsUsed: ['Nexus Prime AI', 'Knowledge Agent'],
      insights,
      actionDrafts: [],
      model: 'gpt-4o-mini',
    });

  } catch (error) {
    console.error('[Prime API] Error:', error);
    
    // Always try to return something useful
    return NextResponse.json({
      success: false,
      error: 'Something went wrong',
      answer: 'I encountered an error. Please try again or rephrase your question.',
      agentsUsed: ['Error Handler'],
      insights: [],
      actionDrafts: [],
    });
  }
}

// Smart fallback for when API isn't available
function generateSmartFallback(prompt: string): { answer: string; insights: any[] } {
  const lower = prompt.toLowerCase();

  // Math detection
  if (/(\d+\s*[\+\-\*\/\^]\s*\d+)|solve|calculate|equation|math|algebra|geometry/i.test(lower)) {
    // Try to solve simple math
    const mathMatch = prompt.match(/(\d+)\s*([\+\-\*\/])\s*(\d+)/);
    if (mathMatch) {
      const a = parseFloat(mathMatch[1]);
      const op = mathMatch[2];
      const b = parseFloat(mathMatch[3]);
      let result: number | string = 'undefined';
      
      switch (op) {
        case '+': result = a + b; break;
        case '-': result = a - b; break;
        case '*': result = a * b; break;
        case '/': result = b !== 0 ? a / b : 'undefined (division by zero)'; break;
      }
      
      return {
        answer: `**Solution:**\n\n${a} ${op} ${b} = **${result}**\n\n---\n*For more complex math problems, I recommend adding the OpenAI API key for full AI capabilities.*`,
        insights: [{ id: 'math-1', type: 'calculation', title: 'Math Solved', description: `Calculated ${a} ${op} ${b}`, level: 'success' }],
      };
    }
    
    return {
      answer: `I see you have a math question! 📐\n\nI'm currently running in **offline mode** with limited capabilities.\n\nTo solve complex math problems, equations, and help with homework:\n\n1. Go to **Vercel** → Your project settings\n2. Add environment variable: \`OPENAI_API_KEY\`\n3. Redeploy the app\n\nOnce configured, I can solve:\n- Algebra equations\n- Calculus problems\n- Geometry proofs\n- Statistics\n- And much more!\n\n*In the meantime, try simple calculations like "5 + 3" or "10 * 4"*`,
      insights: [],
    };
  }

  // Homework/learning detection
  if (/homework|essay|write|explain|help me understand|study|learn|teach/i.test(lower)) {
    return {
      answer: `I'd love to help with your homework! 📚\n\nI'm currently in **offline mode** with limited knowledge.\n\nTo unlock full homework help:\n\n1. Add \`OPENAI_API_KEY\` to your Vercel environment variables\n2. Redeploy the app\n\nThen I can help with:\n- **Writing:** Essays, stories, summaries\n- **Math:** Step-by-step solutions\n- **Science:** Explanations and concepts\n- **History:** Facts and analysis\n- **Languages:** Grammar, translation\n- **Coding:** Any programming language\n\nWhat subject do you need help with?`,
      insights: [],
    };
  }

  // Coding detection
  if (/code|programming|javascript|python|html|css|function|bug|error|debug/i.test(lower)) {
    return {
      answer: `I can help with coding! 💻\n\nI'm in **offline mode** right now.\n\nTo get full coding assistance:\n\n1. Add \`OPENAI_API_KEY\` to Vercel\n2. Redeploy\n\nThen I can:\n- Write code in any language\n- Debug your errors\n- Explain concepts\n- Review your code\n- Help with projects\n\nWhat are you working on?`,
      insights: [],
    };
  }

  // General questions
  if (/what is|who is|how does|why|when|where|explain/i.test(lower)) {
    return {
      answer: `Great question! 🤔\n\nI'm running in **offline mode** with limited knowledge.\n\nTo answer any question:\n\n**Setup Full AI:**\n1. Go to Vercel → Project Settings → Environment Variables\n2. Add: \`OPENAI_API_KEY\` = your OpenAI key\n3. Click Redeploy\n\nThen I can answer questions about:\n- Science & nature\n- History & culture\n- Technology\n- Current events\n- Literally anything!\n\nGet your OpenAI key at: https://platform.openai.com/api-keys`,
      insights: [],
    };
  }

  // Default response
  return {
    answer: `Hey! 👋 I'm Nexus Prime.\n\nI'm currently in **offline mode**, so my abilities are limited.\n\n**To unlock full AI capabilities:**\n\n1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)\n2. Add it to Vercel: \`OPENAI_API_KEY\`\n3. Redeploy your app\n\nOnce configured, I can:\n- ✅ Solve any math problem\n- ✅ Help with homework\n- ✅ Answer any question\n- ✅ Write essays and code\n- ✅ Explain complex topics\n- ✅ And so much more!\n\nWhat would you like help with?`,
    insights: [],
  };
}

// Detect insights from Q&A
function detectInsights(prompt: string, answer: string): any[] {
  const insights: any[] = [];
  const lower = prompt.toLowerCase();

  if (/math|calculate|solve|equation/i.test(lower)) {
    insights.push({
      id: `ins-${Date.now()}`,
      type: 'education',
      title: 'Math Help',
      description: 'Answered a math question',
      level: 'info',
    });
  }

  if (/homework|essay|study/i.test(lower)) {
    insights.push({
      id: `ins-${Date.now()}`,
      type: 'education',
      title: 'Learning Session',
      description: 'Helped with homework or studying',
      level: 'success',
    });
  }

  return insights;
}

export async function GET() {
  const hasApiKey = !!process.env.OPENAI_API_KEY;
  
  return NextResponse.json({
    name: 'NEXUS PRIME API',
    version: '2.0.0',
    status: hasApiKey ? 'fully operational' : 'offline mode',
    capabilities: hasApiKey 
      ? ['math', 'homework', 'coding', 'writing', 'general knowledge', 'anything']
      : ['basic math', 'guidance'],
    note: hasApiKey ? 'Full AI enabled!' : 'Add OPENAI_API_KEY for full capabilities',
  });
}
