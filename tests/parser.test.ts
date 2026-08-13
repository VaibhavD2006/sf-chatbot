import { describe, it, expect } from 'vitest'
import { writeFileSync, unlinkSync, mkdirSync } from 'fs'
import { join } from 'path'
import { parseTranscriptFile } from '@/lib/rag/parser'

const TMP_DIR = join(process.cwd(), 'tests', '__tmp__')

function writeTmp(filename: string, content: string): string {
  try { mkdirSync(TMP_DIR, { recursive: true }) } catch {}
  const filepath = join(TMP_DIR, filename)
  writeFileSync(filepath, content, 'utf-8')
  return filepath
}

function cleanTmp(filepath: string) {
  try { unlinkSync(filepath) } catch {}
}

describe('parseTranscriptFile — JSON', () => {
  it('parses well-formed JSON transcript', () => {
    const content = JSON.stringify({
      episode_id: 'EP001',
      episode_title: 'Test Episode',
      guest_name: 'Jane Doe',
      segments: [
        { speaker: 'Host', text: 'Hello!', timestamp: '00:00:00' },
        { speaker: 'Jane Doe', text: 'Hi there!', timestamp: '00:00:10' },
      ],
    })
    const filepath = writeTmp('test_ep001.json', content)
    try {
      const result = parseTranscriptFile(filepath)
      expect(result.metadata.episodeId).toBe('EP001')
      expect(result.metadata.guestName).toBe('Jane Doe')
      expect(result.segments).toHaveLength(2)
      expect(result.segments[0].speaker).toBe('Host')
      expect(result.segments[1].timestamp).toBe('00:00:10')
    } finally {
      cleanTmp(filepath)
    }
  })

  it('handles flat JSON with just a text field', () => {
    const content = JSON.stringify({ text: 'This is the episode content.' })
    const filepath = writeTmp('flat_text.json', content)
    try {
      const result = parseTranscriptFile(filepath)
      expect(result.segments).toHaveLength(1)
      expect(result.segments[0].text).toBe('This is the episode content.')
    } finally {
      cleanTmp(filepath)
    }
  })

  it('gracefully handles missing optional fields', () => {
    const content = JSON.stringify({
      segments: [{ text: 'Just some text without speaker or timestamp.' }],
    })
    const filepath = writeTmp('minimal.json', content)
    try {
      const result = parseTranscriptFile(filepath)
      expect(result.metadata.episodeId).toBeUndefined()
      expect(result.metadata.guestName).toBeUndefined()
      expect(result.segments[0].speaker).toBeUndefined()
    } finally {
      cleanTmp(filepath)
    }
  })

  it('extracts episode ID from filename when not in JSON', () => {
    const content = JSON.stringify({
      segments: [{ text: 'Episode content.' }],
    })
    // parseFilenameMetadata: /^EP?(\d+)[_-](.+)$/i → EP042_some-title → EP042
    const filepath = writeTmp('EP042_some-title.json', content)
    try {
      const result = parseTranscriptFile(filepath)
      expect(result.metadata.episodeId).toBe('EP042')
    } finally {
      cleanTmp(filepath)
    }
  })
})

describe('parseTranscriptFile — TXT', () => {
  it('parses speaker-format text file', () => {
    const content = [
      'Host: Welcome to the show.',
      'Jane Doe: Thank you for having me.',
      'Host: Let us get started.',
    ].join('\n')
    const filepath = writeTmp('episode.txt', content)
    try {
      const result = parseTranscriptFile(filepath)
      expect(result.segments.length).toBeGreaterThanOrEqual(2)
      const hostSeg = result.segments.find(s => s.speaker === 'Host')
      expect(hostSeg).toBeDefined()
    } finally {
      cleanTmp(filepath)
    }
  })

  it('handles plain text without speaker markers', () => {
    const content = 'This is a plain text transcript without any speaker markers.'
    const filepath = writeTmp('plain.txt', content)
    try {
      const result = parseTranscriptFile(filepath)
      expect(result.segments).toHaveLength(1)
      expect(result.segments[0].speaker).toBeUndefined()
    } finally {
      cleanTmp(filepath)
    }
  })
})
