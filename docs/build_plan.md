# Solo Founders Podcast Intelligence — Build Guide

## 1. Build Objective

Build a production-style RAG chatbot that:

* ingests Solo Founders podcast transcripts,
* converts transcript chunks into embeddings,
* stores them in a vector database,
* retrieves relevant transcript passages,
* answers questions using retrieved evidence,
* understands conversational follow-ups,
* falls back to web search when transcript evidence is insufficient,
* cites its sources,
* streams responses,
* and runs on Vercel.

---

# 2. Recommended Stack

```text
Next.js
React
TypeScript
Tailwind CSS
OpenAI API
PostgreSQL
pgvector
Vercel
```

Optional:

```text
Supabase
Tavily / Exa / OpenAI Web Search
```

---

# 3. Build Phases

## Phase 1 — Project Initialization

Create the Next.js application.

Install required dependencies.

Configure:

```text
TypeScript
Tailwind CSS
environment variables
database connection
OpenAI client
```

Environment variables:

```env
OPENAI_API_KEY=
DATABASE_URL=
WEB_SEARCH_API_KEY=
```

---

# 4. Database Setup

Enable pgvector.

Create a transcript chunk table conceptually containing:

```sql
id
episode_id
episode_title
guest_name
speaker
content
embedding
start_timestamp
end_timestamp
metadata
created_at
```

Create the appropriate vector index based on the selected embedding dimension and database provider.

---

# 5. Transcript Ingestion

Create:

```text
scripts/ingest-transcripts.ts
```

Responsibilities:

```text
1. Read transcript files.
2. Parse transcript metadata.
3. Normalize transcript text.
4. Split transcript into chunks.
5. Generate embeddings.
6. Store chunks + metadata + embeddings.
```

The ingestion script should be idempotent where practical so rerunning ingestion does not create uncontrolled duplicate data.

---

# 6. Transcript Parser

Create:

```text
lib/rag/parser.ts
```

Responsibilities:

* parse transcript formats,
* preserve speaker information,
* preserve timestamps,
* preserve episode metadata,
* clean unnecessary formatting.

Return normalized transcript objects.

Example:

```typescript
interface TranscriptSegment {
  episodeId: string;
  episodeTitle: string;
  guest?: string;
  speaker?: string;
  startTimestamp?: string;
  endTimestamp?: string;
  text: string;
}
```

---

# 7. Chunking

Create:

```text
lib/rag/chunk.ts
```

Recommended initial configuration:

```text
Target: 400–800 tokens
Overlap: ~10–20%
```

Prefer speaker/paragraph-aware chunk boundaries over blindly splitting every N characters.

Every resulting chunk must retain its source metadata.

---

# 8. Embedding Generation

Create:

```text
lib/ai/embeddings.ts
```

Function:

```typescript
embedText(text: string)
```

For ingestion:

```text
chunk
 ↓
OpenAI embedding
 ↓
vector
 ↓
database
```

For search:

```text
query
 ↓
OpenAI embedding
 ↓
query vector
```

Use batching during transcript ingestion to reduce unnecessary API overhead.

---

# 9. Vector Search

Create:

```text
lib/rag/retrieve.ts
```

Input:

```typescript
retrieveTranscriptContext(query: string)
```

Process:

```text
Query
 ↓
Embedding
 ↓
pgvector similarity search
 ↓
Top candidates
 ↓
metadata / relevance filtering
 ↓
best chunks
```

Return structured results:

```typescript
interface RetrievalResult {
  chunkId: string;
  episodeId: string;
  episodeTitle: string;
  guest?: string;
  speaker?: string;
  content: string;
  similarity: number;
  startTimestamp?: string;
  endTimestamp?: string;
}
```

---

# 10. Hybrid Retrieval

If time allows, supplement vector retrieval with keyword or full-text search.

This is particularly useful for:

```text
guest names
company names
episode titles
exact phrases
technical terms
product names
```

Architecture:

```text
query
  ↓
 ┌───────────────┐
 ↓               ↓
vector          lexical
search           search
 ↓               ↓
 └───────┬───────┘
         ↓
 candidate merge
         ↓
 ranking
```

---

# 11. Query Rewriting

Create:

```text
lib/rag/rewrite-query.ts
```

Input:

```text
recent conversation history
+
current user question
```

Output:

```text
standalone retrieval query
```

Example:

Conversation:

```text
USER:
What did Sam say about hiring engineers?

ASSISTANT:
...

USER:
Why did he think that?
```

Rewrite internally as:

```text
Why did Sam recommend that approach to hiring engineers?
```

Do NOT display the rewritten query unless debugging.

---

# 12. Evidence Evaluation

Create:

```text
lib/rag/evaluate-context.ts
```

Purpose:

Determine whether retrieved transcript chunks adequately answer the user's question.

Return:

```typescript
type EvidenceStatus =
  | "transcript_supported"
  | "partially_supported"
  | "not_supported";
```

Do not base this decision solely on one similarity number.

Consider:

```text
retrieval similarity
number of relevant chunks
semantic relevance
coverage of the question
LLM relevance classification
```

---

# 13. Web Search

Create:

```text
lib/search/web-search.ts
```

Expose a provider-independent interface:

```typescript
interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

async function searchWeb(
  query: string
): Promise<WebSearchResult[]>
```

This allows search providers to be changed later without changing the main chat system.

---

# 14. Chat Orchestrator

Create:

```text
lib/chat/orchestrator.ts
```

This is the central pipeline.

Pseudo-code:

```typescript
async function answerQuestion(messages) {
  const query = getLatestUserMessage(messages);

  const rewrittenQuery = await rewriteQuery(
    messages,
    query
  );

  const transcriptResults =
    await retrieveTranscriptContext(rewrittenQuery);

  const evidence =
    await evaluateTranscriptEvidence(
      rewrittenQuery,
      transcriptResults
    );

  if (evidence === "transcript_supported") {
    return generateTranscriptAnswer({
      query,
      messages,
      transcriptResults
    });
  }

  if (evidence === "partially_supported") {
    const webResults =
      await searchWeb(rewrittenQuery);

    return generateHybridAnswer({
      query,
      messages,
      transcriptResults,
      webResults
    });
  }

  const webResults =
    await searchWeb(rewrittenQuery);

  return generateWebAnswer({
    query,
    messages,
    webResults
  });
}
```

---

# 15. Prompt Architecture

Create separate prompts rather than one giant prompt.

Recommended:

```text
lib/ai/prompts/system.ts
lib/ai/prompts/query-rewrite.ts
lib/ai/prompts/evidence.ts
lib/ai/prompts/transcript-answer.ts
lib/ai/prompts/hybrid-answer.ts
lib/ai/prompts/web-answer.ts
```

---

# 16. Transcript Answer Prompt

Core rules:

```text
You are the Solo Founders podcast assistant.

Answer the user's question using the provided podcast transcript context.

Rules:

- Treat retrieved transcript passages as evidence.
- Never claim a guest said something unless the supplied transcript supports it.
- Never invent quotations.
- Never invent timestamps.
- Never invent episode information.
- Paraphrase when appropriate.
- If evidence is incomplete, acknowledge the limitation.
- Attach the provided source IDs to claims.
- Keep answers concise unless the user requests additional detail.
```

---

# 17. Web Answer Prompt

Core behavior:

```text
The Solo Founders transcript archive did not contain sufficient information to answer this question.

Use the supplied web search evidence to answer.

Clearly indicate that this information comes from external sources rather than the podcast archive.

Cite the provided sources.
```

---

# 18. Hybrid Prompt

Core behavior:

```text
Answer using both Solo Founders transcript evidence and current external information.

Clearly distinguish:

1. What the podcast said.
2. Additional information from external sources.

Do not attribute web information to podcast guests.
```

---

# 19. Chat API

Create:

```text
app/api/chat/route.ts
```

Responsibilities:

```text
validate request
 ↓
read conversation
 ↓
call orchestrator
 ↓
stream model response
 ↓
return structured citations
```

Use server-side execution so API credentials remain private.

---

# 20. Structured Response

The client should receive enough metadata to display:

```typescript
{
  answer: "...",

  sourceType: "transcript" | "web" | "hybrid",

  transcriptSources: [
    {
      episodeTitle: "...",
      guest: "...",
      timestamp: "...",
      excerpt: "..."
    }
  ],

  webSources: [
    {
      title: "...",
      url: "...",
      domain: "..."
    }
  ]
}
```

The exact streaming protocol can differ, but source information should remain structured.

---

# 21. Frontend

Create the main page:

```text
app/page.tsx
```

Primary UI:

```text
Header

Conversation Area

Message Components

Sources

Input
```

Avoid unnecessary sidebars for the MVP.

---

# 22. Empty State

Display:

```text
Solo Founders

Ask anything from the podcast.
```

Below it:

```text
What have guests said about finding product-market fit?

How did founders get their first customers?

What advice has the podcast given about fundraising?
```

---

# 23. Message UI

User message:

```text
What did Alex say about customer acquisition?
```

Assistant:

```text
Alex described early customer acquisition as...
```

Below response:

```text
Sources

Podcast
Episode 14 — Building X
Alex Smith · 34:12
```

---

# 24. Source Interaction

Clicking a podcast citation should optionally expand:

```text
Episode
Guest
Timestamp
Relevant excerpt
```

Web citations should open the original source.

---

# 25. Loading State

Display a subtle state such as:

```text
Searching the podcast...
```

If fallback occurs:

```text
Searching the web...
```

Do not expose internal implementation details such as embeddings or similarity thresholds in the normal user interface.

---

# 26. Streaming

Stream model output to the frontend.

The user should begin seeing the response before the full generation finishes.

---

# 27. Testing Retrieval

Create:

```text
tests/retrieval.test.ts
```

Test known questions.

Example:

```typescript
{
  query: "How did Alex find his first customers?",
  expectedEpisode: "episode_14"
}
```

Measure whether the expected source appears within:

```text
Top 1
Top 3
Top 5
Top 10
```

---

# 28. Test Fallback Routing

Create questions intentionally absent from the transcripts.

Expected:

```text
Transcript retrieval
        ↓
insufficient evidence
        ↓
web search
```

Also test transcript questions.

Expected:

```text
Transcript retrieval
        ↓
strong evidence
        ↓
NO unnecessary web search
```

---

# 29. Test Follow-Ups

Conversation:

```text
What did Alex say about finding customers?

Why did he recommend that?

Would that work for B2B SaaS?
```

Verify that:

* "he" resolves correctly,
* "that" resolves correctly,
* relevant transcript context remains available,
* web search only occurs when needed.

---

# 30. Logging

During development, log:

```text
original query
rewritten query
retrieved chunk IDs
similarity scores
evidence status
route selected
latency
```

Example:

```text
Query:
"Why did he recommend that?"

Rewrite:
"Why did Alex recommend interviewing customers before building?"

Retrieved:
episode_14_chunk_31
episode_14_chunk_32
episode_08_chunk_14

Route:
TRANSCRIPT

Retrieval latency:
143 ms
```

Do not expose these logs in production UI.

---

# 31. Evaluation Script

Create:

```text
scripts/evaluate-rag.ts
```

Maintain a small evaluation dataset:

```text
tests/fixtures/evaluation.json
```

Evaluate:

```text
retrieval recall
source correctness
groundedness
fallback routing
latency
```

This is particularly valuable for demonstrating engineering rigor during the take-home review.

---

# 32. Deployment

Push repository to GitHub.

Connect repository to Vercel.

Configure environment variables:

```text
OPENAI_API_KEY
DATABASE_URL
WEB_SEARCH_API_KEY
```

Deploy.

---

# 33. Production Verification

Verify:

```text
[ ] homepage loads
[ ] transcript question works
[ ] correct episode is retrieved
[ ] citations display
[ ] follow-up works
[ ] unsupported question triggers web search
[ ] web citations work
[ ] responses stream
[ ] mobile layout works
[ ] API keys are server-side
[ ] no sensitive values appear in client bundle
```

---

# 34. Recommended Build Order

Build in this order:

```text
1. Initialize Next.js
2. Configure database
3. Create transcript schema
4. Build transcript parser
5. Build chunker
6. Generate embeddings
7. Store vectors
8. Implement vector retrieval
9. Manually test retrieval
10. Add query rewriting
11. Add evidence evaluation
12. Build transcript answer generation
13. Add citations
14. Add web search
15. Build routing logic
16. Add conversation handling
17. Build minimal frontend
18. Add streaming
19. Create evaluation dataset
20. Test edge cases
21. Deploy to Vercel
22. Polish
```

Do not start by perfecting the UI.

First prove:

```text
Question → Correct Transcript Chunk
```

Then prove:

```text
Correct Chunk → Grounded Answer
```

Then:

```text
Missing Evidence → Web Search
```

Then build the polished experience around that pipeline.

---

# 35. Definition of Done

The project is complete when a reviewer can:

1. Open the Vercel URL.
2. Ask a question about a podcast.
3. Receive an accurate transcript-grounded answer.
4. See where the answer came from.
5. Ask a natural follow-up.
6. Ask something outside the transcript archive.
7. See the application automatically retrieve current external information.
8. Receive cited web information without confusing it with podcast content.

The finished application should demonstrate both **AI product thinking and retrieval engineering**, not merely an LLM wrapped in a chat interface.
