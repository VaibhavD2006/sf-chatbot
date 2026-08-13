import type { RetrievalResult, RetrievalConfig, RetrievedChunk } from '@/lib/types/retrieval'
import { embedText } from '@/lib/ai/embeddings'
import { hybridSearch } from './hybrid-search'
import { rerankByRelevance } from './rerank'
import { config } from '@/lib/utils/env'
import { log } from '@/lib/utils/logger'

// Matches "What did Jane Smith say about X?" and similar patterns
const GUEST_QUERY_PATTERN = /\bwhat\s+(?:did|does|do)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+(?:say|think|talk|mean|believe|suggest|argue|explain)\b/i

function extractGuestFromQuery(query: string): string | null {
  const m = query.match(GUEST_QUERY_PATTERN)
  return m ? m[1] : null
}

function filterByGuest(chunks: RetrievedChunk[], guestName: string): RetrievedChunk[] {
  const lower = guestName.toLowerCase()
  return chunks.filter(c => c.guestName?.toLowerCase().includes(lower))
}

/**
 * Main retrieval function.
 * Embeds the query, runs hybrid search, reranks, and returns the top K chunks.
 * When the query explicitly names a guest, results are filtered to that guest.
 */
export async function retrieveChunks(
  query: string,
  configOverride?: Partial<RetrievalConfig>
): Promise<RetrievalResult> {
  const retrieveK = configOverride?.retrieveK ?? config.retrieveK()
  const retainK = configOverride?.retainK ?? config.retainK()
  const start = Date.now()

  log.info('retrieveChunks start', { query: query.slice(0, 100) })

  // Embed the query
  const embedding = await embedText(query)

  // Hybrid search: semantic + full-text
  let candidates = await hybridSearch(embedding, query, retrieveK)

  // If the query names a specific guest, filter to their chunks only.
  // Fall back to all candidates if too few guest chunks are found.
  const namedGuest = extractGuestFromQuery(query)
  if (namedGuest) {
    const guestChunks = filterByGuest(candidates, namedGuest)
    if (guestChunks.length >= 2) {
      log.info('retrieveChunks: filtering to named guest', { namedGuest, guestChunkCount: guestChunks.length })
      candidates = guestChunks
    } else {
      log.info('retrieveChunks: guest filter returned too few chunks, using all candidates', { namedGuest, guestChunkCount: guestChunks.length })
    }
  }

  // Rerank by combined semantic + keyword score
  const reranked = rerankByRelevance(candidates, query)

  // Keep only the top retainK
  const retained = reranked.slice(0, retainK)

  const latencyMs = Date.now() - start

  log.info('retrieveChunks complete', {
    candidateCount: candidates.length,
    retainedCount: retained.length,
    topScore: retained[0]?.hybridScore?.toFixed(3) ?? 'n/a',
    latencyMs,
  })

  return {
    chunks: retained,
    retrievedAt: new Date(),
    retrievalLatencyMs: latencyMs,
  }
}
