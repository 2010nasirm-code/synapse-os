# NEXUS PRIME

**Production-grade AI subsystem for intelligent reasoning, memory, and action management.**

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXUS PRIME                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐    │
│  │   Core    │  │  Agents   │  │  Memory   │  │  Actions  │    │
│  │  System   │  │  (8x)     │  │  System   │  │  System   │    │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘    │
│        │              │              │              │           │
│        └──────────────┼──────────────┼──────────────┘           │
│                       │              │                          │
│               ┌───────┴──────┐ ┌─────┴─────┐                   │
│               │    Router    │ │   API     │                   │
│               └──────────────┘ └───────────┘                   │
│                       │              │                          │
│               ┌───────┴──────────────┴───────┐                 │
│               │          UI Layer            │                 │
│               └──────────────────────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### Core System
- **Router**: Intelligent request routing based on intent analysis
- **Registry**: Agent management and lifecycle
- **Context**: Dynamic context building with memory integration
- **Safety**: Action validation and filtering
- **Rate Limiting**: Per-user and per-agent rate limits
- **Provenance**: Full audit trail of all operations
- **Validation**: Request and response validation

### Agents (8 specialized agents)

| Agent | Purpose | Capabilities |
|-------|---------|--------------|
| **Orchestrator** | Routes and coordinates | routing, synthesis |
| **Insight** | Data analysis | trends, patterns, predictions |
| **Builder** | Creates trackers/dashboards | create, design |
| **Repair** | Debugging assistance | debug, fix, patch (PR drafts) |
| **UI** | Navigation help | navigate, suggest |
| **Automation** | Creates automations | triggers, actions |
| **Memory** | Long-term memory | store, recall, summarize |
| **Evolution** | Suggests improvements | optimize, evolve |

### Memory System
- Vector-based semantic search
- Memory decay and importance tracking
- Category-based organization
- Summary generation
- Memory compaction

### Action System
- Safe action routing with confirmation flows
- PR draft generation for code changes
- Never auto-applies dangerous actions
- Batch action support

### UI Components
- `NexusPrimeChat`: Chat interface with provenance
- `NexusPrimePanel`: Memory, insights, and action sidebar
- `CommandHalo`: Global command launcher (Cmd/Ctrl+K)
- `InsightFeed`: Real-time insight display

## Quick Start

### 1. Initialize Agents

```typescript
import { initializeAgents } from '@/nexus/prime/agents';

// Call once at app startup
initializeAgents();
```

### 2. Make a Request

```typescript
import { handleNexusPrimeRequest } from '@/nexus/prime/api';

const response = await handleNexusPrimeRequest({
  prompt: 'Analyze my recent activity',
  userId: 'user-123',
});

console.log(response.answer);
console.log(response.insights);
console.log(response.actionDrafts);
```

### 3. Run Specific Agent

```typescript
import { handleRunAgentRequest } from '@/nexus/prime/api';

const response = await handleRunAgentRequest({
  agentId: 'insight',
  prompt: 'Show trends',
  userId: 'user-123',
});
```

### 4. Apply Action with Confirmation

```typescript
import { handleApplyActionRequest } from '@/nexus/prime/api';

// Request confirmation
const request = await handleApplyActionRequest({
  action: myActionDraft,
  userId: 'user-123',
});

if (request.needsConfirmation) {
  // Show confirmation UI, then:
  const confirmed = await handleApplyActionRequest({
    confirmationToken: request.confirmationToken,
    userId: 'user-123',
  });
}
```

### 5. Use UI Components

```tsx
import { NexusPrimeChat, CommandHalo, useCommandHalo } from '@/nexus/prime/ui';

function App() {
  const { isOpen, open, close } = useCommandHalo();

  return (
    <>
      <NexusPrimeChat
        onSendMessage={async (msg) => {
          return await handleNexusPrimeRequest({ prompt: msg, userId: 'user' });
        }}
        onConfirmAction={async (action) => {/* handle */}}
        onRejectAction={(action) => {/* handle */}}
      />
      
      <CommandHalo
        isOpen={isOpen}
        onClose={close}
        onSubmit={async (query) => {/* handle */}}
      />
    </>
  );
}
```

## Environment Variables

```env
# Required for AI embeddings (optional - falls back to local)
OPENAI_API_KEY=sk-...

# Vector DB (optional - falls back to in-memory)
VECTOR_DB_URL=

# Security
NEXUS_SALT=your-random-salt

# Rate limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=60
```

## Safety Rules

NEXUS PRIME enforces strict safety rules:

1. **Never auto-applies code changes** - All patches are PR drafts
2. **Requires confirmation for:**
   - Creating/updating/deleting data
   - Creating automations
   - Modifying settings
3. **Auto-applies only:**
   - Navigation
   - Highlighting UI elements
   - Suggestions
   - Logging

## Adding New Agents

```typescript
// agents/MyAgent.ts
import { BaseAgent } from './BaseAgent';

export class MyAgent extends BaseAgent {
  readonly config = {
    id: 'my-agent',
    name: 'My Agent',
    description: 'Does something useful',
    capabilities: ['my-capability'],
    rateLimit: 30,
    safetyTier: 1,
    canProduceActions: true,
    requiresContext: true,
    timeout: 20000,
  };

  async process(request, context) {
    return this.executeWithTracking(request, context, 'my-op', async () => {
      // Your logic here
      return this.createSuccessResult('Response text');
    });
  }

  canHandle(request) {
    return /my-keyword/i.test(request.prompt);
  }
}
```

Then register in `agents/index.ts`:

```typescript
import { MyAgent } from './MyAgent';
registerAgent(new MyAgent());
```

## API Routes (Next.js)

Create `app/api/prime/route.ts`:

```typescript
import { handleNexusPrimeRequest } from '@/nexus/prime/api';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const response = await handleNexusPrimeRequest(body);
  return NextResponse.json(response);
}
```

## Testing

```bash
# Run all tests
npm test -- nexus/prime/tests

# Run specific test
npm test -- nexus/prime/tests/agents.test.ts
```

## File Structure

```
nexus/prime/
├── core/           # Core system (types, router, registry, safety)
├── agents/         # All 8 agents
├── memory/         # Memory system (store, embeddings, vector)
├── actions/        # Action system (router, handlers, confirmations)
├── ui/             # React UI components
├── api/            # API handlers
├── tests/          # Test suites
├── README.md       # This file
└── .env.example    # Environment template
```

## License

MIT License - See LICENSE for details.

