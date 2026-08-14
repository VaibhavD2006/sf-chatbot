import type { ChatMessage, OrchestratorEvent } from './types'
import type { Citation } from '@/lib/types/source'
import type { RetrievedChunk } from '@/lib/types/retrieval'
import type { WebSearchResult } from '@/lib/search/types'
import { trimHistory, extractUserQuery } from './history'
import { rewriteQuery } from '@/lib/rag/rewrite-query'
import { retrieveChunks } from '@/lib/rag/retrieve'
import { evaluateEvidence } from '@/lib/rag/evaluate-context'
import { buildTranscriptCitations, buildWebCitations } from '@/lib/rag/citations'
import { searchWeb } from '@/lib/search/web-search'
import { getOpenAIClient, MODELS } from '@/lib/ai/openai'
import { buildSystemPrompt } from '@/lib/ai/prompts/system'
import { buildTranscriptAnswerPrompt } from '@/lib/ai/prompts/transcript-answer'
import { buildHybridAnswerPrompt } from '@/lib/ai/prompts/hybrid-answer'
import { buildWebAnswerPrompt } from '@/lib/ai/prompts/web-answer'
import { buildResearchAnswerPrompt } from '@/lib/ai/prompts/research-answer'
import { deepResearch, isResearchQuery } from '@/lib/research/deep-research'
import { log } from '@/lib/utils/logger'

/** Format retrieved chunks as readable context string for LLM */
function formatTranscriptContext(chunks: RetrievedChunk[]): string {
  return chunks.map((c, i) => {
    const meta = [
      c.episodeTitle && `Episode: ${c.episodeTitle}`,
      c.guestName && `Guest: ${c.guestName}`,
      c.speaker && `Speaker: ${c.speaker}`,
      c.startTimestamp && `Timestamp: ${c.startTimestamp}`,
    ].filter(Boolean).join(' | ')

    return `[${i + 1}]${meta ? ` (${meta})` : ''}\n${c.content}`
  }).join('\n\n---\n\n')
}

/** Format web search results as readable context string for LLM */
function formatWebContext(results: WebSearchResult[]): string {
  return results.map((r, i) =>
    `[${i + 1}] ${r.title}\nSource: ${r.url}\n${r.snippet}`
  ).join('\n\n---\n\n')
}

/**
 * Main chat orchestrator. Yields OrchestratorEvents as an async generator.
 *
 * Pipeline:
 * 1. Extract + rewrite query
 * 2. Retrieve transcript chunks
 * 3. Evaluate evidence level
 * 4. Route: transcript / hybrid / web
 * 5. Optionally search web
 * 6. Stream LLM answer
 * 7. Yield final metadata (route + citations)
 */
export async function* orchestrate(
  rawMessages: ChatMessage[]
): AsyncGenerator<OrchestratorEvent> {
  const messages = trimHistory(rawMessages)
  const latestQuery = extractUserQuery(messages)

  log.info('orchestrate start', { query: latestQuery.slice(0, 100) })

  // Step 1: Query rewriting for follow-ups
  yield { type: 'status', message: 'Searching the podcast…' }
  const retrievalQuery = await rewriteQuery(messages, latestQuery)

  // Step 2: Transcript retrieval
  const retrievalResult = await retrieveChunks(retrievalQuery)
  const { chunks } = retrievalResult

  log.info('orchestrate retrieval', {
    retrievalQuery: retrievalQuery.slice(0, 100),
    chunkCount: chunks.length,
    latencyMs: retrievalResult.retrievalLatencyMs,
    topScores: chunks.slice(0, 3).map(c => c.similarityScore.toFixed(3)),
  })

  // Step 3: Evidence evaluation
  const evidenceLevel = await evaluateEvidence(retrievalQuery, chunks)

  log.info('orchestrate evidence', { evidenceLevel })

  // Step 4: Route decision
  let route: 'transcript' | 'hybrid' | 'web' | 'research'
  let webResults: WebSearchResult[] = []
  let researchSubQueries: string[] = []

  const needsWeb = evidenceLevel !== 'transcript_supported'
  const useDeepResearch = needsWeb && isResearchQuery(latestQuery)

  if (evidenceLevel === 'transcript_supported') {
    route = 'transcript'
  } else if (useDeepResearch) {
    route = evidenceLevel === 'partially_supported' ? 'research' : 'research'
    yield { type: 'status', message: 'Researching across multiple sources…' }
    const transcriptContext = formatTranscriptContext(chunks)
    const { results, subQueries } = await deepResearch(latestQuery, transcriptContext)
    webResults = results
    researchSubQueries = subQueries
  } else if (evidenceLevel === 'partially_supported') {
    route = 'hybrid'
    yield { type: 'status', message: 'Searching the web…' }
    webResults = await searchWeb(retrievalQuery)
  } else {
    route = 'web'
    yield { type: 'status', message: 'Searching the web…' }
    webResults = await searchWeb(retrievalQuery)
  }

  log.info('orchestrate route', { route, webResultCount: webResults.length })

  // Step 5: Build LLM prompt based on route
  const transcriptContext = formatTranscriptContext(chunks)
  const webContext = formatWebContext(webResults)
  const systemPrompt = buildSystemPrompt()

  // Guard: if we have no usable context at all, say so honestly
  const hasTranscriptContext = chunks.length > 0
  const hasWebContext = webResults.length > 0

  if (!hasTranscriptContext && !hasWebContext) {
    yield {
      type: 'text',
      content: "I don't have information about that in the Solo Founders podcast transcripts, and web search isn't configured to look it up. Try asking something covered in the podcast, or add a TAVILY_API_KEY to enable web search.",
    }
    yield { type: 'metadata', route, citations: [] }
    return
  }

  // Downgrade hybrid→transcript if web search returned nothing
  if (route === 'hybrid' && !hasWebContext) {
    route = 'transcript'
  }

  let userPromptContent: string
  if (route === 'transcript') {
    userPromptContent = buildTranscriptAnswerPrompt({
      query: latestQuery,
      transcriptContext,
    })
  } else if (route === 'research') {
    userPromptContent = buildResearchAnswerPrompt({
      query: latestQuery,
      transcriptContext,
      webContext,
      subQueries: researchSubQueries,
    })
  } else if (route === 'hybrid') {
    userPromptContent = buildHybridAnswerPrompt({
      query: latestQuery,
      transcriptContext,
      webContext,
    })
  } else {
    const transcriptNote = hasTranscriptContext
      ? 'The podcast transcripts were checked but did not contain relevant information for this question.'
      : 'This question is outside the scope of the podcast transcript corpus.'
    userPromptContent = buildWebAnswerPrompt({
      query: latestQuery,
      webContext,
      transcriptNote,
    })
  }

  // Step 6: Stream the LLM answer
  const client = getOpenAIClient()

  try {
    const stream = await client.chat.completions.create({
      model: MODELS.chat(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPromptContent },
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: route === 'research' ? 2000 : 1200,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content
      if (delta) {
        yield { type: 'text', content: delta }
      }
    }
  } catch (err) {
    log.error('orchestrate: LLM streaming failed', { error: String(err) })
    yield { type: 'error', message: 'Failed to generate response. Please try again.' }
    return
  }

  // Step 7: Yield final metadata
  const citations: Citation[] = [
    ...buildTranscriptCitations(chunks),
    ...buildWebCitations(webResults),
  ]

  log.info('orchestrate complete', {
    route,
    citationCount: citations.length,
  })

  yield { type: 'metadata', route, citations }
}
