# Solo Founders Chat

A RAG (Retrieval-Augmented Generation) chatbot for the Solo Founders podcast. Ask any question and get answers grounded in real transcript excerpts — with citations showing exactly which guest said what, in which episode.

When the answer isn't in the transcripts, it searches the web and shows you the sources.

---

## How it works

1. **You ask a question**
2. Your query is embedded into a vector and searched against all podcast transcripts using hybrid search (semantic similarity + full-text keyword matching), merged via Reciprocal Rank Fusion
3. Retrieved chunks are evaluated — are they actually relevant enough to answer the question?
4. **If yes:** answers strictly from transcript content, citing guest name, episode, and timestamp
5. **If partially:** supplements transcript content with live web search results
6. **If no:** falls back to web search entirely and shows sources
7. Response streams in real time with citations attached

No information is made up. If the transcripts don't cover it and web search isn't configured, it says so.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router (TypeScript) |
| UI | Tailwind CSS v3 |
| LLM | OpenAI `gpt-4o-mini` |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| Vector DB | PostgreSQL + pgvector (Supabase) |
| Vector index | HNSW (cosine similarity) |
| Full-text index | GIN (tsvector) |
| Hybrid merge | Reciprocal Rank Fusion (RRF) |
| Web search | Tavily (optional) |
| Testing | Vitest |

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with the pgvector extension enabled
- An [OpenAI](https://platform.openai.com) API key
- (Optional) A [Tavily](https://tavily.com) API key for web search fallback

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
# Required
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://user:password@host:5432/postgres

# Optional — enables web search fallback
TAVILY_API_KEY=tvly-...

# Optional — model overrides
EMBEDDING_MODEL=text-embedding-3-small
CHAT_MODEL=gpt-4o-mini

# Optional — retrieval tuning
CHUNK_SIZE=600
CHUNK_OVERLAP=80
RETRIEVE_K=12
RETAIN_K=6
```

> **Note:** If your database password contains special characters like `@`, URL-encode them (e.g. `@` → `%40`) in the connection string.

### 3. Run database migrations

```bash
npx tsx scripts/run-migrations.ts
```

This creates the `transcript_chunks` table with the HNSW vector index and GIN full-text index.

### 4. Add transcript files

Place transcript files in `data/transcripts/`. Each episode gets its own subdirectory:

```
data/transcripts/
  ep01_guest_name/
    transcript.md
  ep02_guest_name/
    transcript.md
  ...
```

Supported formats: `.md`, `.txt`, `.json`

Expected markdown format:
```markdown
# Solo Founders Podcast — Episode 1 Transcript
## Guest: Ben Broca
## Topic: Building Polsia as a Solo Founder with AI

---

[00:00:00] **Host:** Question text here...

[00:00:37] **Ben Broca:** Answer text here...
```

### 5. Ingest transcripts

```bash
npx tsx scripts/ingest-transcripts.ts
```

This parses every transcript, splits it into chunks, generates OpenAI embeddings, and upserts everything into the database. For 26 episodes it takes about 3 minutes.

Options:
```bash
# Preview without writing to DB
npx tsx scripts/ingest-transcripts.ts --dry-run

# Re-ingest a single episode
npx tsx scripts/ingest-transcripts.ts --episode-id=EP001
```

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm test` | Run unit tests |
| `npx tsx scripts/run-migrations.ts` | Run DB migrations |
| `npx tsx scripts/ingest-transcripts.ts` | Ingest all transcripts |
| `npx tsx scripts/ingest-transcripts.ts --dry-run` | Preview ingestion without DB writes |

---

## Project structure

```
app/
  api/chat/          # Streaming chat endpoint
  api/health/        # Health check
  page.tsx           # Main page
components/
  chat/              # Chat UI components
  sources/           # Citation card components
lib/
  ai/                # OpenAI client, embeddings, prompts
  chat/              # Orchestrator, history, types
  db/                # Postgres client, vector search, transcript access
  rag/               # Parser, chunker, retrieval, reranking, evidence eval, citations
  search/            # Web search (Tavily)
  types/             # Shared TypeScript types
  utils/             # Env config, logger, text utilities
data/transcripts/    # Podcast transcript files (not committed)
db/migrations/       # SQL migration files
scripts/             # Ingestion and utility scripts
tests/               # Unit tests
```

---

## Supabase setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database**
3. Copy the **Transaction pooler** connection string (format: `postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres`)
4. Paste it as `DATABASE_URL` in your `.env`
5. The pgvector extension is enabled by default on all Supabase projects

---

## Deploying to Vercel

```bash
npm i -g vercel
vercel
```

Set the same environment variables in the Vercel dashboard under **Project Settings → Environment Variables**:
- `OPENAI_API_KEY`
- `DATABASE_URL`
- `TAVILY_API_KEY` (optional)
