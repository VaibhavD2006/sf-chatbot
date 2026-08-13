import type { TranscriptChunk } from './transcript'

/** Evidence level indicating how well transcripts answer a query */
export type EvidenceLevel =
  | 'transcript_supported'
  | 'partially_supported'
  | 'not_supported'

/** A chunk retrieved from the database, with similarity score attached */
export interface RetrievedChunk extends TranscriptChunk {
  /** Cosine similarity score [0, 1] */
  similarityScore: number
  /** Full-text search rank (optional, used in hybrid results) */
  ftsRank?: number
  /** Combined hybrid rank (RRF score) */
  hybridScore?: number
}

/** The complete result of a retrieval operation */
export interface RetrievalResult {
  chunks: RetrievedChunk[]
  retrievedAt: Date
  retrievalLatencyMs: number
}

/** Config for retrieval parameters */
export interface RetrievalConfig {
  /** How many candidates to fetch from the DB */
  retrieveK: number
  /** How many to retain after reranking */
  retainK: number
}
