import type { RetrievedChunk } from '@/lib/types/retrieval'
import { semanticSearch, fullTextSearch } from '@/lib/db/vector-search'
import { log } from '@/lib/utils/logger'

const RRF_K = 60 // RRF constant — higher = less extreme rank weighting

/**
 * Compute RRF score for a chunk given its rank in a result list.
 * Lower rank (rank=0 is best) → higher score.
 */
function rrfScore(rank: number): number {
  return 1 / (RRF_K + rank + 1)
}

/**
 * Merge semantic and full-text search results using Reciprocal Rank Fusion.
 * Deduplicates by chunk ID and assigns a combined hybridScore.
 */
export async function hybridSearch(
  embedding: number[],
  query: string,
  k: number
): Promise<RetrievedChunk[]> {
  // Fetch from both sources in parallel
  const [semanticResults, ftsResults] = await Promise.all([
    semanticSearch(embedding, k),
    fullTextSearch(query, k),
  ])

  log.debug('hybridSearch raw results', {
    semanticCount: semanticResults.length,
    ftsCount: ftsResults.length,
  })

  // Build RRF score map: chunkId → score
  const scoreMap = new Map<string, { chunk: RetrievedChunk; score: number }>()

  // Score semantic results
  semanticResults.forEach((chunk, rank) => {
    const score = rrfScore(rank)
    scoreMap.set(chunk.id, { chunk, score })
  })

  // Score FTS results and merge
  ftsResults.forEach((chunk, rank) => {
    const score = rrfScore(rank)
    const existing = scoreMap.get(chunk.id)
    if (existing) {
      existing.score += score
      existing.chunk.ftsRank = chunk.ftsRank
    } else {
      scoreMap.set(chunk.id, { chunk, score })
    }
  })

  // Sort by combined score descending and attach hybridScore
  const merged = Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ chunk, score }) => ({
      ...chunk,
      hybridScore: score,
    }))

  log.debug('hybridSearch merged', { mergedCount: merged.length })
  return merged
}
