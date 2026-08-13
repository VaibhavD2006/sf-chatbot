/** A single utterance or text segment in a transcript */
export interface TranscriptSegment {
  speaker?: string
  text: string
  timestamp?: string
}

/** Metadata about a transcript episode */
export interface TranscriptMetadata {
  episodeId?: string
  episodeTitle?: string
  guestName?: string
  publishedDate?: string
  sourceUrl?: string
}

/** A transcript file parsed into a normalized structure */
export interface NormalizedTranscript {
  metadata: TranscriptMetadata
  segments: TranscriptSegment[]
}

/** A chunk of a transcript ready for embedding and storage */
export interface TranscriptChunk {
  /** Deterministic ID: uuid5 of (episodeId + chunkIndex) */
  id: string
  episodeId?: string
  episodeTitle?: string
  guestName?: string
  speaker?: string
  content: string
  startTimestamp?: string
  endTimestamp?: string
  sourceUrl?: string
  metadata: Record<string, unknown>
}

/** Config for the chunking algorithm */
export interface ChunkConfig {
  chunkSize: number
  chunkOverlap: number
}
