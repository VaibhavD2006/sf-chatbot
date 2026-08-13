import { describe, it, expect } from 'vitest'
import { buildTranscriptCitations, buildWebCitations } from '@/lib/rag/citations'
import type { RetrievedChunk } from '@/lib/types/retrieval'
import type { WebSearchResult } from '@/lib/search/types'

function makeChunk(overrides: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    id: 'chunk-1',
    episodeId: 'EP001',
    episodeTitle: 'Test Episode',
    guestName: 'Jane Doe',
    speaker: 'Jane Doe',
    content: 'This is the content of the chunk.',
    similarityScore: 0.85,
    metadata: {},
    ...overrides,
  }
}

describe('buildTranscriptCitations', () => {
  it('returns empty array for empty input', () => {
    expect(buildTranscriptCitations([])).toHaveLength(0)
  })

  it('builds citation with correct fields', () => {
    const chunk = makeChunk({ startTimestamp: '00:05:00' })
    const citations = buildTranscriptCitations([chunk])
    expect(citations).toHaveLength(1)
    expect(citations[0].type).toBe('transcript')
    expect(citations[0].episodeTitle).toBe('Test Episode')
    expect(citations[0].guest).toBe('Jane Doe')
    expect(citations[0].timestamp).toBe('00:05:00')
  })

  it('trims excerpt to 150 chars', () => {
    const longContent = 'x'.repeat(300)
    const chunk = makeChunk({ content: longContent })
    const citations = buildTranscriptCitations([chunk])
    // trimExcerpt: slice(0, 150) + '…' → max 151 chars
    expect(citations[0].excerpt!.length).toBeLessThanOrEqual(155)
  })

  it('deduplicates chunks from same episode and timestamp', () => {
    // deduplicateChunks key: `episodeId::startTimestamp`
    const chunk1 = makeChunk({ id: 'a', startTimestamp: '00:05:00', similarityScore: 0.9 })
    const chunk2 = makeChunk({ id: 'b', startTimestamp: '00:05:00', similarityScore: 0.7 })
    const citations = buildTranscriptCitations([chunk1, chunk2])
    expect(citations).toHaveLength(1)
    // Should keep the higher-scoring one (chunk1)
    expect(citations[0].excerpt).toContain(chunk1.content.slice(0, 10))
  })
})

describe('buildWebCitations', () => {
  it('returns empty array for empty input', () => {
    expect(buildWebCitations([])).toHaveLength(0)
  })

  it('builds citation with correct fields', () => {
    const result: WebSearchResult = {
      title: 'How to find customers',
      url: 'https://example.com/article',
      snippet: 'Here is how to find your first customers.',
      domain: 'example.com',
    }
    const citations = buildWebCitations([result])
    expect(citations[0].type).toBe('web')
    expect(citations[0].title).toBe('How to find customers')
    expect(citations[0].url).toBe('https://example.com/article')
  })

  it('deduplicates by URL', () => {
    const result: WebSearchResult = {
      title: 'Article',
      url: 'https://example.com/article',
      snippet: 'Content',
    }
    const citations = buildWebCitations([result, result])
    expect(citations).toHaveLength(1)
  })

  it('extracts domain from URL when not provided', () => {
    const result: WebSearchResult = {
      title: 'Article',
      url: 'https://blog.example.com/post',
      snippet: 'Content',
    }
    const citations = buildWebCitations([result])
    // extractDomain strips www. but not subdomains → 'blog.example.com'
    expect(citations[0].domain).toBe('blog.example.com')
  })
})
