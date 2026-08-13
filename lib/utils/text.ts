/**
 * Approximate token count using character heuristic (chars / 4).
 * Good enough for chunking decisions; not exact.
 */
export function countTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

/**
 * Truncate text to approximately maxTokens tokens, cutting at a word boundary.
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4
  if (text.length <= maxChars) return text

  const truncated = text.slice(0, maxChars)
  // Cut at the last word boundary
  const lastSpace = truncated.lastIndexOf(' ')
  return lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated
}

/**
 * Collapse multiple whitespace/newlines into single spaces.
 */
export function cleanWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Extract the domain from a URL (e.g. "https://example.com/path" → "example.com").
 * Returns undefined for invalid URLs.
 */
export function extractDomain(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}

/**
 * Split text into sentences using basic punctuation detection.
 */
export function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/**
 * Split text into paragraphs (double newline separated).
 */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
}
