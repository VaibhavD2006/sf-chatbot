import type { TranscriptCitation, WebCitation } from '@/lib/types/source'
import type { RetrievedChunk } from '@/lib/types/retrieval'
import type { WebSearchResult } from '@/lib/search/types'
import { extractDomain } from '@/lib/utils/text'

const MAX_EXCERPT_LENGTH = 150

/** Trim an excerpt to MAX_EXCERPT_LENGTH chars, cutting at a word boundary */
function trimExcerpt(text: string): string {
  if (text.length <= MAX_EXCERPT_LENGTH) return text
  const trimmed = text.slice(0, MAX_EXCERPT_LENGTH)
  const lastSpace = trimmed.lastIndexOf(' ')
  return (lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed) + '…'
}

/**
 * Deduplicate chunks: keep one citation per (episodeId + startTimestamp) pair.
 * When duplicates exist, prefer the one with a higher similarity score.
 */
function deduplicateChunks(chunks: RetrievedChunk[]): RetrievedChunk[] {
  const seen = new Map<string, RetrievedChunk>()

  for (const chunk of chunks) {
    const key = `${chunk.episodeId ?? 'unknown'}::${chunk.startTimestamp ?? chunk.id}`
    const existing = seen.get(key)
    if (!existing || chunk.similarityScore > existing.similarityScore) {
      seen.set(key, chunk)
    }
  }

  return Array.from(seen.values())
}

/**
 * Build structured transcript citations from retrieved chunks.
 * Deduplicates by episode + timestamp and trims excerpts.
 */
export function buildTranscriptCitations(chunks: RetrievedChunk[]): TranscriptCitation[] {
  return deduplicateChunks(chunks).map(chunk => ({
    type: 'transcript' as const,
    episodeTitle: chunk.episodeTitle,
    guest: chunk.guestName,
    speaker: chunk.speaker,
    timestamp: chunk.startTimestamp,
    excerpt: trimExcerpt(chunk.content),
    sourceUrl: chunk.sourceUrl,
  }))
}

/**
 * Build structured web citations from search results.
 * Deduplicates by URL.
 */
export function buildWebCitations(results: WebSearchResult[]): WebCitation[] {
  const seen = new Set<string>()

  return results
    .filter(r => {
      if (seen.has(r.url)) return false
      seen.add(r.url)
      return true
    })
    .map(r => ({
      type: 'web' as const,
      title: r.title,
      url: r.url,
      domain: r.domain ?? extractDomain(r.url),
      snippet: r.snippet ? trimExcerpt(r.snippet) : undefined,
    }))
}
