# NEXUS ASSISTANT V3

A production-grade, chat-first AI assistant deeply integrated with Nexus Prime.

## Features

- 🤖 **Multi-Agent System** - Specialized agents for reasoning, tools, planning, memory, and knowledge
- 🎭 **Persona Engine** - Switch between friendly, teacher, expert, and concise modes
- 🧠 **Memory System** - Consent-based memory with vector embeddings
- 🔍 **Knowledge Layer** - Web search integration with Wikipedia fallback
- 🎯 **Action Drafts** - Confirmable actions for safety
- 🎤 **Voice I/O** - Optional speech recognition and TTS
- ⌨️ **Command Palette** - Quick access with Ctrl/Cmd+K
- 📊 **Provenance** - Track which agents produced what

## Quick Start

### 1. Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp nexus/assistant-v3/.env.example .env.local
```

### 2. Configure API Keys

Edit `.env.local` and add your API keys:

```env
# Required for LLM features (optional - falls back to offline mode)
OPENAI_API_KEY=sk-...

# Optional for web search
TAVILY_API_KEY=tvly-...

# Optional for vector storage
VECTOR_DB_URL=
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000/assistant` to use the chat interface.

## Architecture

```
/nexus/assistant-v3/
├── /api/                 # API handlers
│   ├── assistant.ts      # Main entry point
│   ├── agentRun.ts      # Run specific agents
│   └── applyAction.ts   # Apply confirmed actions
├── /core/               # Core logic
│   ├── types.ts         # TypeScript interfaces
│   ├── router.ts        # Request routing
│   ├── coordinator.ts   # Multi-agent orchestration
│   ├── contextBuilder.ts# Runtime context
│   ├── safety.ts        # Content filtering
│   ├── rateLimit.ts     # Rate limiting
│   └── provenance.ts    # Audit logging
├── /agents/             # Agent implementations
│   ├── reasoningAgent.ts
│   ├── toolAgent.ts
│   ├── plannerAgent.ts
│   ├── memoryAgent.ts
│   ├── uiAgent.ts
│   ├── debugAgent.ts
│   └── knowledgeAgent.ts
├── /memory/             # Memory subsystem
│   ├── memoryStore.ts   # Consent-aware storage
│   ├── embeddings.ts    # Text embeddings
│   ├── vectorAdapter.ts # Vector search
│   └── summarizer.ts    # Memory compaction
├── /ui/                 # React components
│   ├── NexusChat.tsx
│   ├── ChatBubble.tsx
│   ├── CommandPalette.tsx
│   └── ...
├── /utils/              # Utilities
├── /tests/              # Test suites
├── README.md
└── .env.example
```

## API Endpoints

### POST /api/nexus/assistant

Main chat endpoint.

**Request:**
```json
{
  "query": "What can you help me with?",
  "userId": "user-123",
  "sessionId": "session-abc",
  "persona": "friendly",
  "options": {
    "stream": false,
    "enableWebSearch": true
  }
}
```

**Response:**
```json
{
  "id": "asst-...",
  "success": true,
  "messages": [{
    "role": "assistant",
    "text": "I can help you with...",
    "provenance": [...]
  }],
  "actions": [...],
  "metadata": {
    "processingTime": 150,
    "agentsUsed": ["reasoning"],
    "persona": "friendly",
    "skillLevel": "intermediate"
  }
}
```

### POST /api/nexus/agent

Run a specific agent directly.

**Request:**
```json
{
  "agentId": "reasoning",
  "query": "Analyze my habits",
  "userId": "user-123"
}
```

### POST /api/nexus/action

Apply a confirmed action.

**Request:**
```json
{
  "token": "confirm-...",
  "userId": "user-123",
  "confirm": true
}
```

## Adding New Agents

1. Create a new file in `/agents/`:

```typescript
// myAgent.ts
import { AgentResult } from '../core/types';
import { RuntimeContext } from '../core/contextBuilder';
import { IntentAnalysis } from '../core/router';
import { IAgent } from '../core/coordinator';

export class MyAgent implements IAgent {
  id = 'my-agent';
  name = 'My Agent';
  priority = 5;
  canParallelize = true;

  async execute(
    context: RuntimeContext,
    intent: IntentAnalysis
  ): Promise<AgentResult> {
    // Your logic here
    return {
      agentId: this.id,
      success: true,
      response: 'Hello from my agent!',
      provenance: {
        agent: this.id,
        inputs: [context.request.query],
        confidence: 0.9,
        timestamp: new Date().toISOString(),
      },
      processingTimeMs: 10,
    };
  }
}
```

2. Register in `/agents/index.ts`:

```typescript
import { getMyAgent } from './myAgent';

// In initializeAgents():
coordinator.registerAgent(getMyAgent());
```

## Consent & Safety

### Consent Flow

Users must consent before memory storage is enabled:

```typescript
import { ConsentManager } from './core/safety';

// Check consent
if (ConsentManager.canStoreMemory(userId)) {
  // Store memory
}

// Update consent
ConsentManager.setConsent(userId, {
  memoryConsent: true,
  analyticsConsent: false,
  personalizationConsent: true,
});
```

### Content Safety

All user input is checked for:
- Crisis/self-harm content (shows resources)
- Violence/weapons (blocked)
- Age-inappropriate content (blocked)
- Personal data (redacted from logs)

### Action Confirmation

Actions that modify data require explicit confirmation:

```typescript
const action: ActionDraft = {
  id: 'action-123',
  type: 'delete_tracker',
  payload: { trackerId: 'abc' },
  requiresConfirmation: true,
  impact: 'high',
};
```

## Testing

Run the test suite:

```bash
npm test -- --testPathPattern="assistant-v3"
```

## PR Review Process

When agents suggest code patches:

1. Agent creates `ActionDraft` with `type: 'patch_code'`
2. User reviews in UI with diff preview
3. On confirm, creates draft PR metadata
4. Human reviews and merges manually

**Auto-apply is disabled for code changes.**

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | No | OpenAI API key for LLM features |
| `TAVILY_API_KEY` | No | Tavily API for web search |
| `VECTOR_DB_URL` | No | External vector database URL |
| `RATE_LIMIT_WINDOW_MS` | No | Rate limit window (default: 60000) |
| `RATE_LIMIT_MAX` | No | Max requests per window (default: 30) |
| `ENABLE_OFFLINE_MODEL` | No | Enable offline fallback (default: true) |
| `LOG_LEVEL` | No | Log level: debug/info/warn/error |

## License

MIT

