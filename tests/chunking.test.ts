import { describe, it, expect } from 'vitest'
import { chunkTranscript } from '@/lib/rag/chunk'
import type { NormalizedTranscript } from '@/lib/types/transcript'
import { countTokens } from '@/lib/utils/text'

function makeTranscript(segments: Array<{ speaker?: string; text: string }>): NormalizedTranscript {
  return {
    metadata: {
      episodeId: 'EP001',
      episodeTitle: 'Test Episode',
      guestName: 'Test Guest',
    },
    segments: segments.map(s => ({ ...s })),
  }
}

describe('chunkTranscript', () => {
  it('returns empty array for transcript with no segments', () => {
    const transcript = makeTranscript([])
    const chunks = chunkTranscript(transcript)
    expect(chunks).toHaveLength(0)
  })

  it('preserves episode metadata on every chunk', () => {
    const transcript = makeTranscript([
      { speaker: 'Host', text: 'Hello and welcome to the show.' },
      { speaker: 'Guest', text: 'Thanks for having me.' },
    ])
    const chunks = chunkTranscript(transcript)
    expect(chunks.length).toBeGreaterThan(0)
    for (const chunk of chunks) {
      expect(chunk.episodeId).toBe('EP001')
      expect(chunk.episodeTitle).toBe('Test Episode')
      expect(chunk.guestName).toBe('Test Guest')
    }
  })

  it('preserves speaker attribution', () => {
    const transcript = makeTranscript([
      { speaker: 'Host', text: 'What is your advice?' },
      { speaker: 'Sarah', text: 'My advice is to talk to customers.' },
    ])
    const chunks = chunkTranscript(transcript)
    const hostChunk = chunks.find(c => c.speaker === 'Host')
    const sarahChunk = chunks.find(c => c.speaker === 'Sarah')
    expect(hostChunk).toBeDefined()
    expect(sarahChunk).toBeDefined()
  })

  it('generates deterministic chunk IDs', () => {
    const transcript = makeTranscript([
      { speaker: 'Host', text: 'Hello.' },
    ])
    const chunks1 = chunkTranscript(transcript)
    const chunks2 = chunkTranscript(transcript)
    expect(chunks1[0].id).toBe(chunks2[0].id)
  })

  it('generates unique IDs across chunks', () => {
    const longText = 'This is a sentence. '.repeat(100)
    const transcript = makeTranscript([{ text: longText }])
    const chunks = chunkTranscript(transcript, { chunkSize: 100, chunkOverlap: 10 })
    const ids = chunks.map(c => c.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('respects chunkSize config', () => {
    const longText = 'Word sentence here. '.repeat(200)
    const transcript = makeTranscript([{ text: longText }])
    const chunks = chunkTranscript(transcript, { chunkSize: 100, chunkOverlap: 10 })
    // Most chunks should be under chunkSize * 1.5 tokens (allow slack for sentence boundaries)
    const oversized = chunks.filter(c => countTokens(c.content) > 150)
    expect(oversized.length).toBe(0)
  })

  it('keeps content non-empty in all chunks', () => {
    const transcript = makeTranscript([
      { speaker: 'Host', text: 'Question here.' },
      { speaker: 'Guest', text: 'Answer here with some detail.' },
    ])
    const chunks = chunkTranscript(transcript)
    for (const chunk of chunks) {
      expect(chunk.content.trim().length).toBeGreaterThan(0)
    }
  })
})

describe('countTokens', () => {
  it('returns 0 for empty string', () => {
    expect(countTokens('')).toBe(0)
  })

  it('approximates token count', () => {
    // countTokens = Math.ceil(text.length / 4)
    const text = 'a'.repeat(400)
    expect(countTokens(text)).toBe(100)
  })
})
