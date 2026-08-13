import { readFileSync } from 'fs'
import { extname, basename, dirname } from 'path'
import type { NormalizedTranscript, TranscriptSegment, TranscriptMetadata } from '@/lib/types/transcript'
import { cleanWhitespace } from '@/lib/utils/text'
import { log } from '@/lib/utils/logger'

/**
 * Parse episode metadata from a filename or its parent directory name.
 * Supports pattern: EP001_episode-title.ext, EP1_title.ext, ep01_guest-name/
 */
function parseFilenameMetadata(filepath: string): Partial<TranscriptMetadata> {
  const filename = basename(filepath)
  const name = basename(filename, extname(filename))
  const epMatch = name.match(/^ep?(\d+)[_-](.+)$/i)
  if (epMatch) {
    return {
      episodeId: `EP${epMatch[1].padStart(3, '0')}`,
      episodeTitle: epMatch[2].replace(/[-_]/g, ' ').trim(),
    }
  }
  // Fall back to parent directory name (e.g. ep01_ben_broca/transcript.md)
  const parentDir = basename(dirname(filepath))
  const dirMatch = parentDir.match(/^ep?(\d+)[_-](.+)$/i)
  if (dirMatch) {
    return {
      episodeId: `EP${dirMatch[1].padStart(3, '0')}`,
      episodeTitle: dirMatch[2].replace(/[-_]/g, ' ').trim(),
    }
  }
  return {}
}

/**
 * Parse a JSON transcript file.
 *
 * Supported shapes:
 * - { episode_id?, episode_title?, guest_name?, published_date?, source_url?,
 *     segments: [{ speaker?, text, timestamp? }] }
 * - { text: string } — flat text fallback
 * - { transcript: string } — another flat fallback
 * - Array of segment objects
 */
function parseJson(content: string, filename: string): NormalizedTranscript {
  const data = JSON.parse(content)
  const filenameMeta = parseFilenameMetadata(filename)

  // Handle array input (array of segments)
  if (Array.isArray(data)) {
    return {
      metadata: filenameMeta,
      segments: data.map(item => ({
        speaker: item.speaker || item.Speaker || undefined,
        text: cleanWhitespace(String(item.text || item.content || '')),
        timestamp: item.timestamp || item.time || undefined,
      })).filter(s => s.text.length > 0),
    }
  }

  // Build metadata from file fields, falling back to filename
  const metadata: TranscriptMetadata = {
    episodeId: data.episode_id || data.episodeId || filenameMeta.episodeId,
    episodeTitle: data.episode_title || data.episodeTitle || data.title || filenameMeta.episodeTitle,
    guestName: data.guest_name || data.guestName || data.guest || undefined,
    publishedDate: data.published_date || data.publishedDate || data.date || undefined,
    sourceUrl: data.source_url || data.sourceUrl || data.url || undefined,
  }

  // Handle flat text fields
  if (typeof data.text === 'string') {
    return { metadata, segments: [{ text: cleanWhitespace(data.text) }] }
  }
  if (typeof data.transcript === 'string') {
    return { metadata, segments: [{ text: cleanWhitespace(data.transcript) }] }
  }

  // Handle segments array
  if (Array.isArray(data.segments)) {
    const segments: TranscriptSegment[] = data.segments.map((seg: Record<string, unknown>) => ({
      speaker: (seg.speaker || seg.Speaker) as string | undefined,
      text: cleanWhitespace(String(seg.text || seg.content || '')),
      timestamp: (seg.timestamp || seg.time) as string | undefined,
    })).filter((s: TranscriptSegment) => s.text.length > 0)
    return { metadata, segments }
  }

  // Last resort: stringify the whole object
  log.warn('parseJson: unrecognized JSON shape, using stringified content', { filename })
  return {
    metadata,
    segments: [{ text: cleanWhitespace(JSON.stringify(data)) }],
  }
}

/**
 * Parse a TXT or MD transcript file.
 *
 * Handles three formats (in priority order):
 * 1. Solo Founders markdown: `## Guest: Name`, `[HH:MM:SS] **Speaker:** text`
 * 2. Plain "Speaker: text" pattern
 * 3. Single text block fallback
 */
function parseText(content: string, filepath: string): NormalizedTranscript {
  const filenameMeta = parseFilenameMetadata(filepath)
  const lines = content.split('\n')

  // --- Extract markdown header metadata (## Guest:, ## Topic:, # Title) ---
  const headerMeta: Partial<TranscriptMetadata> = {}
  for (const line of lines) {
    const trimmed = line.trim()
    const guestMatch = trimmed.match(/^##\s+Guest:\s*(.+)$/i)
    if (guestMatch) { headerMeta.guestName = guestMatch[1].trim(); continue }
    const topicMatch = trimmed.match(/^##\s+Topic:\s*(.+)$/i)
    if (topicMatch) { headerMeta.episodeTitle = topicMatch[1].trim(); continue }
    const titleMatch = trimmed.match(/^#\s+Solo Founders Podcast\s*[—-]\s*Episode\s+(\d+)\s+Transcript/i)
    if (titleMatch) { headerMeta.episodeId = `EP${titleMatch[1].padStart(3, '0')}`; continue }
  }

  const metadata: TranscriptMetadata = { ...filenameMeta, ...headerMeta }

  // --- Try [HH:MM:SS] **Speaker:** text format (Solo Founders markdown) ---
  // ponytail: bold markdown speaker with optional timestamp
  const timestampSpeakerPattern = /^\[(\d{2}:\d{2}:\d{2})\]\s+\*\*([^*]+):\*\*\s*(.*)/
  const mdSpeakerLines = lines.filter(l => timestampSpeakerPattern.test(l.trim()))

  if (mdSpeakerLines.length > 0) {
    const segments: TranscriptSegment[] = []
    let currentSpeaker: string | undefined
    let currentTimestamp: string | undefined
    let currentText: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      const match = trimmed.match(timestampSpeakerPattern)
      if (match) {
        if (currentText.length > 0) {
          const text = cleanWhitespace(currentText.join(' '))
          if (text) segments.push({ speaker: currentSpeaker, timestamp: currentTimestamp, text })
        }
        currentTimestamp = match[1]
        currentSpeaker = match[2].trim()
        currentText = match[3] ? [match[3].trim()] : []
      } else if (trimmed && !trimmed.startsWith('#') && trimmed !== '---' && currentText.length > 0) {
        currentText.push(trimmed)
      }
    }
    if (currentText.length > 0) {
      const text = cleanWhitespace(currentText.join(' '))
      if (text) segments.push({ speaker: currentSpeaker, timestamp: currentTimestamp, text })
    }
    return { metadata, segments }
  }

  // --- Try plain "Speaker: content" pattern ---
  const speakerLinePattern = /^([A-Z][A-Za-z\s.'-]{1,40}):\s+(.+)/
  const speakerLines = lines.filter(l => speakerLinePattern.test(l.trim()))
  const hasSpeakerFormat = speakerLines.length > lines.filter(l => l.trim()).length * 0.2

  if (hasSpeakerFormat) {
    const segments: TranscriptSegment[] = []
    let currentSpeaker: string | undefined
    let currentText: string[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      const match = trimmed.match(speakerLinePattern)
      if (match) {
        if (currentText.length > 0) {
          const text = cleanWhitespace(currentText.join(' '))
          if (text) segments.push({ speaker: currentSpeaker, text })
        }
        currentSpeaker = match[1].trim()
        currentText = [match[2].trim()]
      } else if (trimmed && currentText.length > 0) {
        currentText.push(trimmed)
      }
    }
    if (currentText.length > 0) {
      const text = cleanWhitespace(currentText.join(' '))
      if (text) segments.push({ speaker: currentSpeaker, text })
    }
    return { metadata, segments }
  }

  // --- Fallback: single text block ---
  const text = cleanWhitespace(content.replace(/\n+/g, ' '))
  return { metadata, segments: text ? [{ text }] : [] }
}

/**
 * Parse a transcript file from disk.
 * Supports .json, .txt, .md
 * Gracefully degrades on missing optional fields.
 */
export function parseTranscriptFile(filepath: string): NormalizedTranscript {
  const ext = extname(filepath).toLowerCase()
  const filename = basename(filepath)

  log.debug('parseTranscriptFile', { filepath, ext })

  let content: string
  try {
    content = readFileSync(filepath, 'utf-8')
  } catch (err) {
    throw new Error(`Failed to read transcript file: ${filepath} — ${String(err)}`)
  }

  try {
    switch (ext) {
      case '.json':
        return parseJson(content, filename)
      case '.txt':
      case '.md':
        return parseText(content, filepath)
      default:
        log.warn('parseTranscriptFile: unknown extension, trying text parser', { ext })
        return parseText(content, filepath)
    }
  } catch (err) {
    throw new Error(`Failed to parse transcript ${filename}: ${String(err)}`)
  }
}
