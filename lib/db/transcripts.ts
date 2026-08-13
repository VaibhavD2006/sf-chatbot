import type { TranscriptChunk } from '@/lib/types/transcript'
import { getDb } from './client'

/** Insert or update a chunk (upsert by id) */
export async function upsertChunk(chunk: TranscriptChunk): Promise<void> {
  const db = getDb()
  await db`
    INSERT INTO transcript_chunks (
      id, episode_id, episode_title, guest_name, speaker,
      content, start_timestamp, end_timestamp, source_url, metadata
    ) VALUES (
      ${chunk.id},
      ${chunk.episodeId ?? null},
      ${chunk.episodeTitle ?? null},
      ${chunk.guestName ?? null},
      ${chunk.speaker ?? null},
      ${chunk.content},
      ${chunk.startTimestamp ?? null},
      ${chunk.endTimestamp ?? null},
      ${chunk.sourceUrl ?? null},
      ${JSON.stringify(chunk.metadata)}
    )
    ON CONFLICT (id) DO UPDATE SET
      episode_id = EXCLUDED.episode_id,
      episode_title = EXCLUDED.episode_title,
      guest_name = EXCLUDED.guest_name,
      speaker = EXCLUDED.speaker,
      content = EXCLUDED.content,
      start_timestamp = EXCLUDED.start_timestamp,
      end_timestamp = EXCLUDED.end_timestamp,
      source_url = EXCLUDED.source_url,
      metadata = EXCLUDED.metadata
  `
}

/** Update just the embedding for an existing chunk */
export async function updateChunkEmbedding(id: string, embedding: number[]): Promise<void> {
  const db = getDb()
  const embeddingStr = `[${embedding.join(',')}]`
  await db`
    UPDATE transcript_chunks
    SET embedding = ${embeddingStr}::vector
    WHERE id = ${id}
  `
}

/** Delete all chunks for an episode */
export async function deleteChunksByEpisode(episodeId: string): Promise<number> {
  const db = getDb()
  const result = await db`
    DELETE FROM transcript_chunks WHERE episode_id = ${episodeId}
  `
  return result.count
}

/** Count total chunks in the database */
export async function countChunks(): Promise<number> {
  const db = getDb()
  const result = await db`SELECT COUNT(*)::int AS count FROM transcript_chunks`
  return result[0].count
}

/** List all distinct episodes */
export async function listEpisodes(): Promise<Array<{ episodeId: string | null; episodeTitle: string | null; chunkCount: number }>> {
  const db = getDb()
  const rows = await db`
    SELECT
      episode_id AS "episodeId",
      episode_title AS "episodeTitle",
      COUNT(*)::int AS "chunkCount"
    FROM transcript_chunks
    GROUP BY episode_id, episode_title
    ORDER BY episode_id
  `
  return rows as unknown as Array<{ episodeId: string | null; episodeTitle: string | null; chunkCount: number }>
}
