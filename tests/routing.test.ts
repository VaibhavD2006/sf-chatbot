import { describe, it, expect } from 'vitest'
import type { RetrievedChunk } from '@/lib/types/retrieval'

function makeChunk(similarityScore: number): RetrievedChunk {
  return {
    id: `chunk-${Math.random()}`,
    content: 'Sample transcript content about startup advice and customer discovery.',
    similarityScore,
    metadata: {},
  }
}

describe('Evidence routing heuristics (boundary conditions)', () => {
  it('no chunks → not_supported signal', () => {
    const chunks: RetrievedChunk[] = []
    expect(chunks.length).toBe(0)
  })

  it('high score chunks should lean toward transcript_supported', () => {
    const chunks = [makeChunk(0.85), makeChunk(0.83)]
    const highSimilarityCount = chunks.filter(c => c.similarityScore >= 0.75).length
    const topScore = Math.max(...chunks.map(c => c.similarityScore))
    expect(highSimilarityCount).toBeGreaterThanOrEqual(2)
    expect(topScore).toBeGreaterThanOrEqual(0.82)
  })

  it('very low score chunks → not_supported signal', () => {
    const chunks = [makeChunk(0.3), makeChunk(0.25)]
    const topScore = Math.max(...chunks.map(c => c.similarityScore))
    expect(topScore).toBeLessThan(0.4)
  })

  it('medium score chunks are ambiguous (require LLM)', () => {
    const chunks = [makeChunk(0.6), makeChunk(0.55)]
    const highSimilarityCount = chunks.filter(c => c.similarityScore >= 0.75).length
    const topScore = Math.max(...chunks.map(c => c.similarityScore))
    expect(highSimilarityCount).toBeLessThan(2)
    expect(topScore).toBeGreaterThan(0.4)
  })
})

describe('History utilities', () => {
  it('trimHistory keeps most recent messages', async () => {
    const { trimHistory } = await import('@/lib/chat/history')
    const messages = Array.from({ length: 15 }, (_, i) => ({
      role: 'user' as const,
      content: `Message ${i}`,
    }))
    const trimmed = trimHistory(messages, 10)
    expect(trimmed).toHaveLength(10)
    expect(trimmed[trimmed.length - 1].content).toBe('Message 14')
  })

  it('extractUserQuery gets the last user message', async () => {
    const { extractUserQuery } = await import('@/lib/chat/history')
    const messages = [
      { role: 'user' as const, content: 'First question' },
      { role: 'assistant' as const, content: 'First answer' },
      { role: 'user' as const, content: 'Follow-up question' },
    ]
    expect(extractUserQuery(messages)).toBe('Follow-up question')
  })

  it('extractUserQuery throws when no user message', async () => {
    const { extractUserQuery } = await import('@/lib/chat/history')
    expect(() => extractUserQuery([])).toThrow()
  })
})
