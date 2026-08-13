import type { ChatMessage } from '@/lib/chat/types'
import type { ProfileCandidate } from './types'

const AGENT_PATTERNS = [
  /\blinkedin\b/i,
  /\binstagram\b/i,
  /\b(twitter|x\.com)\b/i,
  /\bgithub\b/i,
  /\b(their|his|her)\s+(website|site|page|link)\b/i,
  /\bpersonal\s+(website|site|page)\b/i,
  /\bcompany\s+(website|site|page)\b/i,
  /\bfind\b.{0,30}\bprofile\b/i,
  /\bwhere\s+(can\s+i|do\s+i|to)\s+(find|follow)\b/i,
  /\bwhere\s+i\s+can\s+(find|follow)\b/i,
  /\bsocial\s+(media|links|accounts)\b/i,
  /\bpublic\s+profile\b/i,
]

export function shouldUseAgent(query: string): boolean {
  return AGENT_PATTERNS.some(p => p.test(query))
}

export function extractPersonName(messages: ChatMessage[]): string | null {
  // Check latest user message first for explicit name mentions
  const latestUser = [...messages].reverse().find(m => m.role === 'user')
  if (latestUser) {
    const name = extractNameFromText(latestUser.content)
    if (name) return name
  }
  // Fall back to last assistant message (may have mentioned guest name)
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')
  if (lastAssistant) {
    const name = extractNameFromText(lastAssistant.content)
    if (name) return name
  }
  return null
}

function extractNameFromText(text: string): string | null {
  // "Jane Smith's LinkedIn" or "find Jane Smith"
  let m = text.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)'s\b/)
  if (m) return m[1]
  m = text.match(/\bfind\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/)
  if (m) return m[1]
  // "Jane Smith" in quotes
  m = text.match(/["']([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)["']/)
  if (m) return m[1]
  // Guest: or **Guest:** pattern from transcript citations
  m = text.match(/\*{0,2}Guest:\*{0,2}\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/)
  if (m) return m[1]
  return null
}

const PLATFORM_PATTERNS: Array<[RegExp, ProfileCandidate['platform']]> = [
  [/\blinkedin\b/i, 'linkedin'],
  [/\binstagram\b/i, 'instagram'],
  [/\b(twitter|x\.com)\b/i, 'twitter'],
  [/\bgithub\b/i, 'github'],
  [/\b(company|startup|firm)\b/i, 'company'],
  [/\b(personal\s+)?(website|site|homepage|page)\b/i, 'website'],
]

export function detectRequestedPlatforms(query: string): ProfileCandidate['platform'][] {
  const platforms = PLATFORM_PATTERNS
    .filter(([pattern]) => pattern.test(query))
    .map(([, platform]) => platform)
  return platforms.length > 0 ? platforms : ['linkedin']
}
