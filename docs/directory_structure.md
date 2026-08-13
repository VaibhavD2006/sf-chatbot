# Solo Founders Podcast Intelligence — Directory Structure

```text
solo-founders-rag/
│
├── app/
│   │
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts
│   │   │
│   │   └── health/
│   │       └── route.ts
│   │
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   │
│   ├── chat/
│   │   ├── Chat.tsx
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ChatEmptyState.tsx
│   │   ├── StreamingMessage.tsx
│   │   └── ThinkingState.tsx
│   │
│   ├── sources/
│   │   ├── Sources.tsx
│   │   ├── TranscriptSource.tsx
│   │   └── WebSource.tsx
│   │
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Textarea.tsx
│
├── lib/
│   │
│   ├── ai/
│   │   ├── openai.ts
│   │   ├── embeddings.ts
│   │   │
│   │   └── prompts/
│   │       ├── system.ts
│   │       ├── query-rewrite.ts
│   │       ├── evidence.ts
│   │       ├── transcript-answer.ts
│   │       ├── hybrid-answer.ts
│   │       └── web-answer.ts
│   │
│   ├── rag/
│   │   ├── parser.ts
│   │   ├── chunk.ts
│   │   ├── retrieve.ts
│   │   ├── hybrid-search.ts
│   │   ├── rerank.ts
│   │   ├── rewrite-query.ts
│   │   ├── evaluate-context.ts
│   │   └── citations.ts
│   │
│   ├── chat/
│   │   ├── orchestrator.ts
│   │   ├── history.ts
│   │   └── types.ts
│   │
│   ├── search/
│   │   ├── web-search.ts
│   │   ├── provider.ts
│   │   └── types.ts
│   │
│   ├── db/
│   │   ├── client.ts
│   │   ├── transcripts.ts
│   │   └── vector-search.ts
│   │
│   ├── utils/
│   │   ├── env.ts
│   │   ├── logger.ts
│   │   └── text.ts
│   │
│   └── types/
│       ├── transcript.ts
│       ├── retrieval.ts
│       └── source.ts
│
├── scripts/
│   ├── ingest-transcripts.ts
│   ├── reindex-transcripts.ts
│   └── evaluate-rag.ts
│
├── data/
│   └── transcripts/
│       ├── .gitkeep
│       └── README.md
│
├── tests/
│   ├── retrieval.test.ts
│   ├── routing.test.ts
│   ├── chunking.test.ts
│   │
│   └── fixtures/
│       └── evaluation.json
│
├── db/
│   └── migrations/
│       ├── 001_enable_vector.sql
│       └── 002_create_transcript_chunks.sql
│
├── public/
│   ├── logo.svg
│   └── favicon.ico
│
├── .env.local
├── .env.example
├── .gitignore
├── README.md
├── PRD.md
├── BUILD.md
├── DIRECTORY_STRUCTURE.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.js
└── eslint.config.mjs
```

# Directory Responsibilities

## `/app`

Next.js application layer.

Contains:

* pages
* layouts
* server API routes

The main chat endpoint lives at:

```text
app/api/chat/route.ts
```

---

## `/components/chat`

All conversational UI components.

```text
Chat.tsx
```

Controls the main conversation experience.

```text
ChatInput.tsx
```

Handles user input.

```text
ChatMessage.tsx
```

Renders individual messages.

```text
ThinkingState.tsx
```

Displays retrieval/search state.

---

## `/components/sources`

Responsible for source presentation.

Transcript sources and web sources should use separate components because they represent fundamentally different evidence.

---

## `/lib/ai`

All OpenAI-related logic.

```text
openai.ts
```

Creates the OpenAI client.

```text
embeddings.ts
```

Creates query and transcript embeddings.

```text
prompts/
```

Stores prompts separately from business logic.

---

## `/lib/rag`

Core retrieval system.

### `parser.ts`

Parses transcript files.

### `chunk.ts`

Splits transcripts into retrieval chunks.

### `retrieve.ts`

Performs transcript retrieval.

### `hybrid-search.ts`

Combines semantic and lexical retrieval.

### `rerank.ts`

Ranks retrieved candidates.

### `rewrite-query.ts`

Turns conversational questions into standalone retrieval queries.

### `evaluate-context.ts`

Determines whether transcript evidence adequately supports the question.

### `citations.ts`

Transforms retrieved metadata into user-facing citations.

---

## `/lib/chat`

Controls conversation-level behavior.

### `orchestrator.ts`

Central decision engine.

Conceptually:

```text
Question
   ↓
Rewrite
   ↓
Retrieve
   ↓
Evaluate
   ↓
┌───────────────┬────────────────┐
│ Transcript    │ Web Required   │
└───────┬───────┴───────┬────────┘
        ↓               ↓
       RAG          Web Search
        │               │
        └───────┬───────┘
                ↓
             Answer
```

---

## `/lib/search`

External search abstraction.

The rest of the application should call:

```typescript
searchWeb(query)
```

rather than depending directly on a particular provider.

This makes replacing the search provider straightforward.

---

## `/lib/db`

Database access layer.

No React component should directly query the database.

```text
client.ts
```

Database connection.

```text
transcripts.ts
```

Transcript persistence.

```text
vector-search.ts
```

Vector similarity queries.

---

## `/scripts`

Offline/development operations.

### `ingest-transcripts.ts`

Primary transcript ingestion pipeline.

```text
Files
 ↓
Parse
 ↓
Chunk
 ↓
Embed
 ↓
Store
```

### `reindex-transcripts.ts`

Regenerates embeddings/indexes when chunking or embedding strategies change.

### `evaluate-rag.ts`

Runs the retrieval evaluation dataset.

---

## `/data/transcripts`

Local transcript input directory during development.

Example:

```text
data/transcripts/

episode-001.txt
episode-002.txt
episode-003.txt
```

Production transcript storage does not need to depend on the Vercel filesystem.

---

## `/tests`

Automated evaluation.

```text
retrieval.test.ts
```

Tests whether known questions retrieve correct episodes.

```text
routing.test.ts
```

Tests transcript vs web fallback behavior.

```text
chunking.test.ts
```

Tests transcript chunk creation.

---

# Core Runtime Flow

```text
app/page.tsx
      │
      ▼
components/chat/Chat.tsx
      │
      ▼
app/api/chat/route.ts
      │
      ▼
lib/chat/orchestrator.ts
      │
      ├─────────────────────────────┐
      │                             │
      ▼                             │
lib/rag/rewrite-query.ts            │
      │                             │
      ▼                             │
lib/rag/retrieve.ts                 │
      │                             │
      ▼                             │
lib/db/vector-search.ts             │
      │                             │
      ▼                             │
lib/rag/evaluate-context.ts         │
      │                             │
      ├──────── YES ────────────────┤
      │                             │
      │                             ▼
      │                    Transcript Answer
      │
      └──────── NO
              │
              ▼
      lib/search/web-search.ts
              │
              ▼
          Web Answer
              │
              ▼
      app/api/chat/route.ts
              │
              ▼
          Streaming UI
```

# Offline Ingestion Flow

```text
data/transcripts/
        │
        ▼
scripts/ingest-transcripts.ts
        │
        ▼
lib/rag/parser.ts
        │
        ▼
lib/rag/chunk.ts
        │
        ▼
lib/ai/embeddings.ts
        │
        ▼
lib/db/transcripts.ts
        │
        ▼
PostgreSQL + pgvector
```

# Architectural Rule

Maintain strict separation between:

```text
UI
↓
API
↓
Orchestration
↓
Retrieval / Search
↓
AI
↓
Database
```

Avoid putting retrieval, prompting, database access, and UI logic into a single API route.

The `route.ts` file should remain thin.

The core intelligence of the application should live inside:

```text
lib/chat/orchestrator.ts
lib/rag/
lib/ai/
```

This keeps the take-home project small while still demonstrating a production-quality software architecture.
