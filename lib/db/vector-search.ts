import type { RetrievedChunk } from '@/lib/types/retrieval'
import { getDb } from './client'
import { log } from '@/lib/utils/logger'

/** Convert a number[] embedding to Postgres vector literal */
function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(',')}]`
}

/** Map a DB row to RetrievedChunk */
function rowToChunk(row: Record<string, unknown>): RetrievedChunk {
  return {
    id: row.id as string,
    episodeId: row.episode_id as string | undefined,
    episodeTitle: row.episode_title as string | undefined,
    guestName: row.guest_name as string | undefined,
    speaker: row.speaker as string | undefined,
    content: row.content as string,
    startTimestamp: row.start_timestamp as string | undefined,
    endTimestamp: row.end_timestamp as string | undefined,
    sourceUrl: row.source_url as string | undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    similarityScore: parseFloat(row.similarity as string),
    ftsRank: row.fts_rank !== undefined ? parseFloat(row.fts_rank as string) : undefined,
    hybridScore: row.hybrid_score !== undefined ? parseFloat(row.hybrid_score as string) : undefined,
  }
}

/** Semantic similarity search using pgvector cosine distance */
export async function semanticSearch(embedding: number[], k: number): Promise<RetrievedChunk[]> {
  const db = getDb()
  const vectorLiteral = toVectorLiteral(embedding)

  const rows = await db`
    SELECT
      id, episode_id, episode_title, guest_name, speaker,
      content, start_timestamp, end_timestamp, source_url, metadata,
      1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM transcript_chunks
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT ${k}
  `

  log.debug('semanticSearch', { k, resultCount: rows.length })
  return rows.map(r => rowToChunk(r as Record<string, unknown>))
}

/** Full-text search using PostgreSQL tsvector */
export async function fullTextSearch(query: string, k: number): Promise<RetrievedChunk[]> {
  const db = getDb()

  const rows = await db`
    SELECT
      id, episode_id, episode_title, guest_name, speaker,
      content, start_timestamp, end_timestamp, source_url, metadata,
      ts_rank(tsvector_content, plainto_tsquery('english', ${query})) AS similarity,
      ts_rank(tsvector_content, plainto_tsquery('english', ${query})) AS fts_rank
    FROM transcript_chunks
    WHERE tsvector_content @@ plainto_tsquery('english', ${query})
    ORDER BY fts_rank DESC
    LIMIT ${k}
  `

  log.debug('fullTextSearch', { query, resultCount: rows.length })
  return rows.map(r => rowToChunk(r as Record<string, unknown>))
}
