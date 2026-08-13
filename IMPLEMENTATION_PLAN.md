# Implementation Plan

See the full plan at: `.claude/plans/sorted-wondering-zebra.md`

## Phases Completed

1. Project Foundation — Next.js 14, TypeScript, Tailwind, Vitest
2. SQL Migrations — pgvector schema with HNSW + GIN indexes
3. TypeScript Types — transcript, retrieval, source types
4. Utilities — env, logger, text helpers
5. Database Client — postgres.js, CRUD, vector search
6. OpenAI + Embeddings — singleton client, batched embedding
7. AI Prompts — 6 focused prompt files (system, rewrite, evidence, transcript, hybrid, web)
8. Transcript Parser — JSON/TXT/MD with graceful degradation
9. Chunker — speaker-boundary aware, configurable, deterministic IDs
10. Retrieval — hybrid search (RRF), reranking, configurable K
11. Query Rewriting — pronoun/follow-up detection, LLM rewrite
12. Evidence Evaluation — multi-signal (heuristic + LLM)
13. Citations Builder — dedup, excerpt trimming, domain extraction
14. Web Search — Tavily provider with clean abstraction
15. Chat Orchestrator — 7-step pipeline, async generator streaming
16. API Routes — /api/chat (streaming), /api/health
17. Ingestion Script — batch embed, upsert, dry-run, episode filter
18. Sample Data + Eval Script — 8 eval cases, table output
19. Unit Tests — 30 tests, all green
20. UI Primitives — Button, Card, Textarea, layout
21. Source Components — TranscriptSource, WebSource, Sources
22. Chat Components — Chat, ChatInput, ChatMessage, EmptyState, StreamingMessage, ThinkingState
23. Main Page — app/page.tsx
24. README + Documentation
