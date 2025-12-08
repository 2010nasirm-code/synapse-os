# Nexus OS Core

> **The Ultimate AI Intelligence, Automation, and Content-Generation Backbone**

Nexus OS Core is a comprehensive, modular, and scalable "brain + toolkit" that powers Synapse OS with creative, data, AI, automation, multimedia, social, and meta-capabilities.

## 🧠 Architecture Overview

```
nexus-core/
├── api/                    # API handlers
│   ├── nexus.ts           # Main query endpoint
│   └── agent.ts           # Agent management
├── core/                   # Core system
│   ├── index.ts           # Main exports
│   ├── kernel.ts          # Processing engine
│   ├── router.ts          # Request routing
│   ├── memory.ts          # Memory system
│   ├── config.ts          # Configuration
│   └── types.ts           # Type definitions
├── agents/                 # AI agents (15+)
│   ├── reasoningAgent.ts
│   ├── memoryAgent.ts
│   ├── planningAgent.ts
│   └── ...
├── skills/                 # Skill modules (20+)
│   ├── reasoning.ts
│   ├── summarization.ts
│   └── ...
├── lib/                    # Utilities
│   ├── logger.ts
│   ├── vectorStore.ts
│   ├── db.ts
│   └── ...
└── ui/                     # UI components
    ├── components/
    └── pages/
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm/npm
- Supabase account (optional for persistence)
- OpenAI API key (optional for advanced embeddings)

### Installation

1. Navigate to your Next.js project:
```bash
cd synapse-os/app
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp nexus-core/.env.example .env.local
# Edit .env.local with your keys
```

4. Run the development server:
```bash
pnpm dev
```

5. Open the Nexus dashboard:
```
http://localhost:3000/nexus
```

## 🔧 Configuration

### Environment Variables

```env
# Required
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Optional (for enhanced features)
OPENAI_API_KEY=your-openai-key
NEXUS_MEMORY_ENABLED=true
NEXUS_QUERIES_PER_MINUTE=60
```

### Agent Configuration

Edit `core/config.ts` to enable/disable agents:

```typescript
agents: [
  { id: "reasoning", enabled: true, priority: 1 },
  { id: "memory", enabled: true, priority: 2 },
  // ...
]
```

## 📡 API Endpoints

### Main Query
```http
POST /api/nexus
Content-Type: application/json

{
  "userId": "user-123",
  "query": "What should I focus on today?",
  "options": {
    "agents": ["reasoning", "analytics"],
    "memoryScope": "persistent"
  }
}
```

### Memory Operations
```http
GET /api/nexus/memory?userId=user-123
POST /api/nexus/memory
DELETE /api/nexus/memory
```

### Agent Operations
```http
GET /api/nexus/agent
POST /api/nexus/agent (run specific agent)
```

### Automations
```http
GET /api/nexus/automation?userId=user-123
POST /api/nexus/automation
DELETE /api/nexus/automation
```

## 🤖 Agents

| Agent | Description | Capabilities |
|-------|-------------|--------------|
| **Reasoning** | Logical analysis & Q&A | question-answering, inference |
| **Memory** | Long-term memory management | recall, storage, context |
| **Planning** | Task & project planning | roadmaps, breakdowns |
| **Analytics** | Data analysis & patterns | statistics, trends |
| **Insight** | Correlation & discovery | patterns, anomalies |
| **Automation** | Workflow automation | triggers, actions |
| **Search** | Semantic search | fuzzy-search, filtering |
| **Summarization** | Content condensation | TLDR, abstracts |
| **Creativity** | Idea generation | brainstorming, expansion |
| **Scheduling** | Time management | calendar, reminders |
| **Notification** | Alerts & communication | push, email |
| **Resource** | File & data management | upload, export |
| **Vector** | Embedding operations | similarity, clustering |
| **Backup** | Data protection | backup, restore |
| **Moderation** | Content safety | filtering, privacy |

## 🛠️ Skills

| Skill | Category | Description |
|-------|----------|-------------|
| **Reasoning** | reasoning | Logic & inference |
| **Summarization** | reasoning | Text condensation |
| **Translation** | utility | Language translation |
| **Code Analysis** | analysis | Code quality checks |
| **Data Visualizer** | data | Chart generation |
| **Task Planner** | productivity | Task breakdowns |
| **Writing Assistant** | creative | Writing help |

## 💾 Memory System

The memory system stores user-specific data with:
- **Vector embeddings** for semantic search
- **Decay scoring** based on recency/usage
- **Type classification** (fact, preference, context, etc.)
- **Tag-based organization**

```typescript
// Add a memory
await memorySystem.add(userId, "Important note", "fact", {
  tags: ["important"],
  importance: 0.9,
});

// Query memories
const results = await memorySystem.query({
  userId,
  query: "What's important?",
  limit: 5,
  minRelevance: 0.5,
});
```

## 🎯 User Flow Example

1. **User asks a question** via Command Bar (⌘K)
2. **Router analyzes** intent and selects agents
3. **Agents process** the query in parallel
4. **Results merge** with provenance tracking
5. **Memory stores** the interaction
6. **Response displays** with suggestions

```
User: "What should I focus on today?"
         ↓
    [Router] → [Planning Agent] → [Analytics Agent] → [Memory Agent]
         ↓
    [Merge Results]
         ↓
    Response: "Based on your data, focus on..."
         + Suggestions: ["Break down tasks", "Set deadlines"]
```

## 🔌 Adding Custom Agents

Create a new file in `agents/`:

```typescript
// agents/customAgent.ts
import type { Agent, AgentInput, AgentOutput } from "../core/types";

const customAgent: Agent = {
  id: "custom",
  name: "Custom Agent",
  description: "Does something custom",
  capabilities: ["custom-feature"],
  priority: 10,
  enabled: true,

  async process(input: AgentInput): Promise<AgentOutput> {
    // Your logic here
    return {
      success: true,
      result: { answer: "Custom response" },
      confidence: 0.9,
    };
  },
};

export default customAgent;
```

Register in `agents/index.ts` and `core/config.ts`.

## 🔌 Adding Custom Skills

Create a new file in `skills/`:

```typescript
// skills/customSkill.ts
import type { Skill, SkillInput, SkillOutput } from "../core/types";

const customSkill: Skill = {
  id: "custom",
  name: "Custom Skill",
  description: "Does something specific",
  category: "utility",

  async execute(input: SkillInput): Promise<SkillOutput> {
    // Your logic here
    return { success: true, result: "Done!" };
  },
};

export default customSkill;
```

## 🧪 Testing

```bash
# Run tests
pnpm test

# Run specific test
pnpm test -- --grep "reasoning"
```

## 📦 Docker Deployment

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f nexus
```

## 🔒 Privacy & Safety

- **Consent-based storage**: Ask before storing personal data
- **Data export**: Users can export all their data
- **Data deletion**: Users can delete all their data
- **Content moderation**: Built-in safety filters
- **No age-restricted content**: Teen-safe design

## 📄 License

MIT License - see [LICENSE.md](LICENSE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with ❤️ for Synapse OS


