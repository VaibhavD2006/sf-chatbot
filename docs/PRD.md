# Solo Founders Podcast Intelligence — Product Requirements Document

## 1. Product Overview

### Product Name

**Solo Founders Podcast Intelligence**

### Product Type

Retrieval-Augmented Generation (RAG) chatbot for Solo Founders podcast transcripts.

### Objective

Build a minimal, fast, and accurate conversational AI interface that allows users to ask questions about Solo Founders podcast content.

The system should:

1. Search podcast transcripts for relevant information.
2. Retrieve the most relevant transcript passages.
3. Generate an answer grounded in those passages.
4. Preserve conversational context for follow-up questions.
5. Fall back to web search when the transcript corpus cannot adequately answer the user's question.
6. Clearly communicate whether an answer came from Solo Founders transcripts, the web, or a combination of both.
7. Provide citations/sources whenever possible.

The application will be deployed on **Vercel**.

---

# 2. Problem Statement

Solo Founders has valuable information distributed across long-form podcast transcripts.

Finding specific insights currently requires users to:

* know which episode contains the information,
* locate the transcript,
* search manually,
* read through large sections,
* and interpret the content themselves.

A conversational interface can turn this archive into a searchable knowledge system.

Example:

**User**

> What did Alex say about finding the first 10 customers?

Instead of requiring the user to locate and read an entire podcast episode, the system should retrieve the relevant transcript sections and generate a concise response.

The conversation may then continue:

**User**

> Based on that advice, what would you recommend for a B2B SaaS founder?

If the transcript contains enough information, the system should continue using transcript context.

If the transcript does not contain sufficient information, the system should perform a web search and use external information to supplement the response.

---

# 3. Product Goals

## Primary Goals

### G1 — Accurate Transcript Retrieval

Given a natural-language query, retrieve the most semantically relevant transcript passages.

### G2 — Grounded Answers

Transcript-based answers should be generated primarily from retrieved transcript context rather than unsupported model knowledge.

### G3 — Intelligent Search Fallback

If transcript retrieval does not provide sufficient evidence to answer the question, automatically use web search.

### G4 — Conversational Follow-Ups

Users should be able to ask follow-up questions without repeating the entire context.

Example:

> What did Sarah say about fundraising?

Follow-up:

> Why did she think that was important?

The second query should be interpreted in the context of the first.

### G5 — Source Transparency

Users should understand where information came from.

Answers should indicate sources such as:

* Podcast transcript
* Episode
* Speaker
* Transcript excerpt
* Web source

### G6 — Fast User Experience

Target perceived response time should be low enough that the application feels conversational.

Streaming responses should be used where possible.

### G7 — Minimal Interface

The application should feel lightweight and intentional rather than like a complex enterprise search product.

---

# 4. Non-Goals

The initial version does NOT need:

* user accounts
* payments
* transcript editing
* podcast publishing
* complex analytics dashboards
* multi-user collaboration
* advanced administration
* autonomous agents
* voice interaction
* fine-tuning a custom LLM
* complex knowledge graphs

The focus is a high-quality RAG demonstration.

---

# 5. Target Users

## Primary User

Someone interested in Solo Founders podcast content who wants to quickly extract knowledge from previous episodes.

Potential users include:

* founders
* aspiring founders
* startup employees
* investors
* students
* podcast listeners

---

# 6. Core User Stories

## Transcript Question

**As a user,**

I want to ask:

> What did [guest] say about [topic]?

so that I can quickly find information from an episode.

---

## Topic Search

**As a user,**

I want to ask:

> What have guests said about finding product-market fit?

so that I can synthesize knowledge across multiple episodes.

---

## Follow-Up Question

**As a user,**

I want to ask:

> Can you explain that in simpler terms?

without repeating my previous question.

---

## Advice Based on Podcast Content

**As a user,**

I want to ask:

> Based on that discussion, what should I do if I'm launching a SaaS product?

so that the AI can translate podcast knowledge into actionable guidance.

---

## External Knowledge

**As a user,**

I want to ask something that may not exist in the transcripts.

Example:

> What are some current tools I could use to implement this strategy?

If the transcript corpus cannot adequately answer the question, the system should search the web.

---

# 7. Functional Requirements

## FR1 — Transcript Ingestion

The system must ingest podcast transcripts provided by Solo Founders.

Supported initial formats may include:

* `.txt`
* `.md`
* `.json`

Transcript ingestion should normalize documents into a consistent internal format.

Each transcript should ideally contain metadata including:

```text
episode_id
episode_title
guest_name
speaker
published_date
source_url
transcript_text
```

Metadata availability depends on the provided transcript files.

---

# 8. Transcript Processing

Each transcript should be divided into retrieval units/chunks.

A chunk should contain:

```json
{
  "chunk_id": "episode_12_chunk_31",
  "episode_id": "episode_12",
  "episode_title": "How Alex Built X",
  "guest_name": "Alex Smith",
  "speaker": "Alex Smith",
  "text": "...",
  "start_timestamp": "00:34:12",
  "end_timestamp": "00:35:03"
}
```

Where timestamps are unavailable, they may be omitted.

---

# 9. Chunking Strategy

Avoid arbitrary fixed-length splitting where possible.

Recommended approach:

1. Split transcripts using speaker boundaries and paragraph boundaries.
2. Group nearby transcript segments.
3. Target approximately **400–800 tokens per chunk**.
4. Maintain approximately **10–20% overlap** between neighboring chunks when necessary.
5. Preserve metadata on every chunk.

The purpose of overlap is to prevent important ideas from being separated across retrieval boundaries.

Chunking parameters should be configurable and evaluated against the actual transcript format.

---

# 10. Embeddings

Each transcript chunk will be converted into a vector embedding using an OpenAI embedding model.

Conceptually:

```text
Transcript
    ↓
Normalize
    ↓
Chunk
    ↓
Embedding Model
    ↓
Vector
    ↓
Vector Database
```

The embedding represents the semantic meaning of the transcript section.

---

# 11. Vector Database

The system should use a vector-capable database.

Recommended implementation:

**PostgreSQL + pgvector**

A managed provider such as Supabase or another hosted Postgres provider can be used.

This provides:

* vector similarity search
* metadata storage
* SQL filtering
* simple infrastructure
* easy integration with serverless APIs
* straightforward deployment architecture

Example table:

```text
transcript_chunks

id
episode_id
episode_title
guest_name
speaker
text
embedding
start_timestamp
end_timestamp
created_at
```

---

# 12. Retrieval Pipeline

For every new user question:

```text
User Query
    ↓
Conversation-Aware Query Rewrite
    ↓
Query Embedding
    ↓
Vector Search
    ↓
Candidate Transcript Chunks
    ↓
Filtering / Ranking
    ↓
Top Context Chunks
    ↓
Confidence Evaluation
```

The system should retrieve more candidates than it ultimately sends to the LLM.

Example:

```text
Retrieve top 10–15 chunks
        ↓
rank/filter
        ↓
send best 4–8 chunks
```

Exact values should be configurable and tuned experimentally.

---

# 13. Retrieval Strategy

The initial implementation should support semantic vector retrieval.

A stronger implementation may use **hybrid retrieval** combining:

### Semantic similarity

Vector similarity identifies passages that are conceptually related.

### Keyword / metadata matching

Useful for queries containing:

* guest names
* company names
* episode names
* product names
* exact terminology

Conceptually:

```text
User Query
      ↓
┌────────────────────┐
│ Query Processing   │
└─────────┬──────────┘
          ↓
 ┌────────┴────────┐
 ↓                 ↓
Vector Search    Keyword /
                 Metadata Search
 ↓                 ↓
 └────────┬────────┘
          ↓
    Candidate Set
          ↓
      Re-ranking
          ↓
     Final Context
```

Hybrid search is preferred if implementation time allows because podcast queries frequently contain exact names and semantic concepts simultaneously.

---

# 14. Query Rewriting

Follow-up questions may not make sense independently.

Example:

```text
User: What did Jason say about hiring?

Assistant: ...

User: Why did he recommend that?
```

The second question should internally become something similar to:

> Why did Jason recommend that hiring strategy?

The system should use recent conversation history to create a standalone retrieval query.

The rewritten query is used for retrieval.

The user's original question remains the question answered by the model.

---

# 15. Retrieval Confidence

The application needs to determine whether the transcript corpus contains enough evidence to answer the question.

Do NOT rely exclusively on one hard-coded cosine similarity threshold.

Confidence should consider:

* similarity scores
* number of relevant chunks
* agreement between retrieved chunks
* whether retrieved text actually addresses the question
* optional LLM relevance classification

Possible states:

```text
TRANSCRIPT_SUPPORTED
PARTIALLY_SUPPORTED
NOT_SUPPORTED
```

---

# 16. Answer Routing

## Route A — Transcript Answer

If relevant transcript evidence exists:

```text
Question
   ↓
Transcript Retrieval
   ↓
Relevant Evidence Found
   ↓
LLM Answer
   ↓
Transcript Citations
```

The model should be instructed to answer using retrieved transcript evidence and avoid inventing podcast claims.

---

## Route B — Web Search

If transcript evidence is insufficient:

```text
Question
   ↓
Transcript Retrieval
   ↓
Insufficient Evidence
   ↓
Web Search
   ↓
Relevant Web Results
   ↓
LLM Synthesis
   ↓
Web Citations
```

---

## Route C — Mixed Answer

Some questions may benefit from both.

Example:

> What did the guest recommend for customer discovery, and what tools could I use today to do that?

The first part may come from the transcript.

The second part may require current web information.

The answer should clearly distinguish the two.

---

# 17. Web Search

The application should expose web search as a server-side capability.

Potential implementations include:

* OpenAI-supported web search capabilities
* Tavily
* Exa
* another search provider

The search layer should be abstracted so the provider can be changed without rewriting the chat pipeline.

Example interface:

```typescript
searchWeb(query: string): Promise<SearchResult[]>
```

The LLM should receive structured search results rather than uncontrolled page content wherever possible.

---

# 18. Citation Requirements

Transcript-derived claims should reference transcript sources.

Example:

> The guest recommends speaking directly with early users before investing heavily in product development.

**Source:** Episode 14 — *Building Your First SaaS*, Alex Smith

If timestamps exist:

> Episode 14 — Alex Smith — 34:12

Web-derived information should provide clickable external sources.

The interface should visually distinguish:

**Podcast Sources**

from

**Web Sources**

---

# 19. Hallucination Prevention

The system prompt should explicitly instruct the model:

1. Do not claim a guest said something unless supported by retrieved transcript context.
2. Do not invent quotes.
3. Do not invent episode names.
4. Do not invent timestamps.
5. If transcript evidence is insufficient, say so.
6. Use web search when appropriate.
7. Clearly distinguish external knowledge from podcast knowledge.

---

# 20. Conversation Memory

The system should maintain recent conversation context.

Memory is primarily used for:

* pronoun resolution
* follow-up interpretation
* query rewriting
* maintaining conversational continuity

Do not automatically embed the entire conversation into every retrieval query.

Instead:

```text
Recent Messages
      +
Current Question
      ↓
Standalone Search Query
      ↓
RAG Retrieval
```

---

# 21. UI Requirements

## Design Philosophy

Minimal.

The interface should prioritize the conversation itself.

Suggested layout:

```text
------------------------------------------------

Solo Founders

Ask anything from the podcast.

------------------------------------------------

Assistant
What would you like to know?

User
What did Alex say about finding customers?

Assistant
Alex recommended...

Sources
Podcast · Episode 14 · Alex Smith

------------------------------------------------

Ask a follow-up...                      ↑

------------------------------------------------
```

---

# 22. Main Interface Components

Required components:

### Header

Contains:

* Solo Founders branding
* minimal product identity

### Chat Container

Contains:

* user messages
* assistant responses
* streaming state

### Message Input

Contains:

* text input
* submit button
* Enter-to-send behavior

### Source Cards

Transcript source example:

```text
Podcast
Episode 14
Alex Smith
34:12
```

Web source example:

```text
Web
Article title
Domain
```

---

# 23. Suggested Example Prompts

The empty state may display prompts such as:

> What did guests say about finding their first customers?

> What advice has the podcast given about fundraising?

> What are common mistakes founders mentioned?

> Compare what different guests said about product-market fit.

---

# 24. Technical Stack

Recommended stack:

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### Backend

* Next.js server-side routes / server functions

### AI

* OpenAI API

### Embeddings

* OpenAI embeddings

### Database

* PostgreSQL
* pgvector

### Hosting

* Vercel

### Optional Managed Database

* Supabase or another managed Postgres provider

### Web Search

Provider abstraction supporting OpenAI web search, Tavily, Exa, or equivalent.

---

# 25. High-Level Architecture

```text
                         ┌──────────────────┐
                         │      USER        │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   Next.js UI     │
                         │     Vercel       │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │    Chat API      │
                         └────────┬─────────┘
                                  │
                                  ▼
                      ┌───────────────────────┐
                      │ Query Rewrite / Router│
                      └───────────┬───────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Query Embedding  │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Vector Database  │
                         │    pgvector      │
                         └────────┬─────────┘
                                  │
                                  ▼
                         ┌──────────────────┐
                         │ Retrieval + Rank │
                         └────────┬─────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              Evidence Found              No Evidence
                    │                           │
                    ▼                           ▼
          ┌──────────────────┐       ┌──────────────────┐
          │ Transcript RAG   │       │    Web Search    │
          └────────┬─────────┘       └────────┬─────────┘
                   │                          │
                   └────────────┬─────────────┘
                                ▼
                       ┌──────────────────┐
                       │   OpenAI LLM     │
                       └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │ Answer + Sources │
                       └──────────────────┘
```

---

# 26. Ingestion Architecture

Transcript ingestion should happen separately from normal chat requests.

```text
Raw Transcripts
      ↓
Transcript Parser
      ↓
Metadata Extraction
      ↓
Text Normalization
      ↓
Chunking
      ↓
Embedding Generation
      ↓
Postgres / pgvector
```

Embeddings should be generated once during ingestion rather than regenerated every time someone asks a question.

---

# 27. Performance Requirements

Target metrics:

| Metric                       | Goal                      |
| ---------------------------- | ------------------------- |
| Initial response             | < 2 seconds when possible |
| Retrieval                    | < 1 second                |
| Query embedding              | < 1 second                |
| Streaming                    | Enabled                   |
| Transcript citation accuracy | 100% source-backed        |
| Mobile support               | Required                  |
| Desktop support              | Required                  |

These are engineering targets rather than strict guarantees.

---

# 28. Security Requirements

API keys must NEVER be exposed to the client.

Store secrets using Vercel environment variables.

Examples:

```text
OPENAI_API_KEY
DATABASE_URL
WEB_SEARCH_API_KEY
```

All LLM, database, and search operations requiring secrets should execute server-side.

---

# 29. Evaluation

Before deployment, create a small RAG evaluation set.

Example:

```json
{
  "question": "What did Alex say about customer acquisition?",
  "expected_episode": "episode_14",
  "expected_chunk": "chunk_31"
}
```

Evaluate:

### Retrieval Recall

Does the correct passage appear within the top K retrieved chunks?

### Citation Accuracy

Does the cited transcript actually support the claim?

### Answer Groundedness

Is the response supported by the supplied context?

### Fallback Accuracy

Does the system correctly identify questions that require external search?

---

# 30. Success Criteria

The project is successful if:

1. Podcast transcripts can be ingested automatically.
2. Transcript chunks are vectorized and stored.
3. Natural-language questions retrieve relevant transcript sections.
4. Responses accurately represent transcript content.
5. Follow-up questions work naturally.
6. Unsupported questions trigger web search.
7. Transcript and web sources are clearly displayed.
8. Responses stream to the UI.
9. The interface is polished and minimal.
10. The complete application is deployed successfully on Vercel.

---

# 31. MVP Definition

The MVP must demonstrate this complete flow:

```text
Transcript
   ↓
Chunk
   ↓
Embed
   ↓
Store
   ↓
User Question
   ↓
Retrieve
   ↓
Evaluate Evidence
   ↓
Transcript Answer OR Web Search
   ↓
Generate Response
   ↓
Citations
```

The key technical objective is not simply creating a chatbot.

It is creating a **trustworthy retrieval system that knows when the Solo Founders corpus contains the answer and when it needs external knowledge.**
