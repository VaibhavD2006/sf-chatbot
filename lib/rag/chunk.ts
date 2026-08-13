import { v5 as uuidv5 } from 'uuid'
import type { NormalizedTranscript, TranscriptChunk, ChunkConfig } from '@/lib/types/transcript'
import { countTokens, splitIntoSentences, splitIntoParagraphs } from '@/lib/utils/text'
import { config } from '@/lib/utils/env'
import { log } from '@/lib/utils/logger'

/** Namespace UUID for deterministic chunk IDs */
const CHUNK_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

/** Generate a deterministic chunk ID */
function chunkId(episodeId: string | undefined, chunkIndex: number): string {
  const key = `${episodeId ?? 'unknown'}:${chunkIndex}`
  return uuidv5(key, CHUNK_NAMESPACE)
}

/**
 * Split a single large text block into smaller pieces at sentence boundaries.
 * Returns an array of text chunks each under maxTokens.
 */
function splitTextIntoChunks(text: string, maxTokens: number, overlapTokens: number): string[] {
  if (countTokens(text) <= maxTokens) return [text]

  const sentences = splitIntoSentences(text)
  const chunks: string[] = []
  let current: string[] = []
  let currentTokens = 0

  for (const sentence of sentences) {
    const sentenceTokens = countTokens(sentence)

    if (currentTokens + sentenceTokens > maxTokens && current.length > 0) {
      chunks.push(current.join(' '))

      // Keep overlap: last few sentences of current chunk
      const overlap: string[] = []
      let overlapSize = 0
      for (let i = current.length - 1; i >= 0; i--) {
        const t = countTokens(current[i])
        if (overlapSize + t > overlapTokens) break
        overlap.unshift(current[i])
        overlapSize += t
      }
      current = overlap
      currentTokens = overlapSize
    }

    current.push(sentence)
    currentTokens += sentenceTokens
  }

  if (current.length > 0) {
    chunks.push(current.join(' '))
  }

  return chunks.filter(c => c.trim().length > 0)
}

/**
 * Chunk a transcript into segments suitable for embedding.
 *
 * Strategy:
 * 1. Group consecutive segments by speaker (speaker turns = natural boundaries)
 * 2. If a speaker turn is too large, split at paragraph then sentence
 * 3. If a speaker turn is too small, try to merge with adjacent same-speaker turns
 *    (only when they'd fit within chunkSize)
 * 4. Apply overlap at the sentence level
 */
export function chunkTranscript(
  transcript: NormalizedTranscript,
  configOverride?: Partial<ChunkConfig>
): TranscriptChunk[] {
  const chunkSize = configOverride?.chunkSize ?? config.chunkSize()
  const chunkOverlap = configOverride?.chunkOverlap ?? config.chunkOverlap()
  const { metadata, segments } = transcript

  if (segments.length === 0) {
    log.warn('chunkTranscript: transcript has no segments', { episodeId: metadata.episodeId })
    return []
  }

  // Group consecutive segments by speaker
  const speakerTurns: Array<{ speaker?: string; text: string; startTimestamp?: string; endTimestamp?: string }> = []

  for (const seg of segments) {
    const last = speakerTurns[speakerTurns.length - 1]
    if (last && last.speaker === seg.speaker) {
      // Merge with previous turn from same speaker
      last.text += ' ' + seg.text
      if (seg.timestamp) last.endTimestamp = seg.timestamp
    } else {
      speakerTurns.push({
        speaker: seg.speaker,
        text: seg.text.trim(),
        startTimestamp: seg.timestamp,
        endTimestamp: seg.timestamp,
      })
    }
  }

  const chunks: TranscriptChunk[] = []
  let chunkIndex = 0

  for (const turn of speakerTurns) {
    if (!turn.text.trim()) continue

    // If this turn fits in one chunk, emit it directly
    if (countTokens(turn.text) <= chunkSize) {
      chunks.push({
        id: chunkId(metadata.episodeId, chunkIndex++),
        episodeId: metadata.episodeId,
        episodeTitle: metadata.episodeTitle,
        guestName: metadata.guestName,
        speaker: turn.speaker,
        content: turn.text.trim(),
        startTimestamp: turn.startTimestamp,
        endTimestamp: turn.endTimestamp,
        sourceUrl: metadata.sourceUrl,
        metadata: {},
      })
      continue
    }

    // Turn is too large — split it
    // Try paragraph split first
    const paragraphs = splitIntoParagraphs(turn.text)
    if (paragraphs.length > 1) {
      // Group paragraphs into chunks
      const subChunks = splitTextIntoChunks(turn.text, chunkSize, chunkOverlap)
      for (const subChunk of subChunks) {
        chunks.push({
          id: chunkId(metadata.episodeId, chunkIndex++),
          episodeId: metadata.episodeId,
          episodeTitle: metadata.episodeTitle,
          guestName: metadata.guestName,
          speaker: turn.speaker,
          content: subChunk.trim(),
          startTimestamp: turn.startTimestamp,
          endTimestamp: turn.endTimestamp,
          sourceUrl: metadata.sourceUrl,
          metadata: {},
        })
      }
    } else {
      // Single paragraph — split at sentence level
      const subChunks = splitTextIntoChunks(turn.text, chunkSize, chunkOverlap)
      for (const subChunk of subChunks) {
        chunks.push({
          id: chunkId(metadata.episodeId, chunkIndex++),
          episodeId: metadata.episodeId,
          episodeTitle: metadata.episodeTitle,
          guestName: metadata.guestName,
          speaker: turn.speaker,
          content: subChunk.trim(),
          startTimestamp: turn.startTimestamp,
          endTimestamp: turn.endTimestamp,
          sourceUrl: metadata.sourceUrl,
          metadata: {},
        })
      }
    }
  }

  log.debug('chunkTranscript complete', {
    episodeId: metadata.episodeId,
    segmentCount: segments.length,
    chunkCount: chunks.length,
  })

  return chunks
}
