import type { RetrievalResult, RetrievalConfig } from '@/lib/types/retrieval'
import { embedText } from '@/lib/ai/embeddings'
import { hybridSearch } from './hybrid-search'
import { rerankByRelevance } from './rerank'
import { config } from '@/lib/utils/env'
import { log } from '@/lib/utils/logger'

/**
 * Main retrieval function.
 * Embeds the query, runs hybrid search, reranks, and returns the top K chunks.
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
  const candidates = await hybridSearch(embedding, query, retrieveK)

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
