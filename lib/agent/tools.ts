import { searchWeb } from '@/lib/search/web-search'
import type { AgentState, ToolResult, ProfileCandidate } from './types'

const MAX_WEB_SEARCHES = 3

const PLATFORM_DOMAINS: Record<string, string[]> = {
  linkedin: ['linkedin.com/in/', 'linkedin.com/pub/'],
  twitter: ['twitter.com/', 'x.com/'],
  instagram: ['instagram.com/'],
  github: ['github.com/'],
}

const SOCIAL_DOMAINS = ['linkedin.com', 'twitter.com', 'x.com', 'instagram.com', 'github.com', 'facebook.com']

export async function resolvePerson(name: string, context: string, state: AgentState): Promise<ToolResult> {
  const query = `${name} ${context} founder entrepreneur podcast`
  const result = await searchWebTool(query, state)
  return { ...result, tool: 'resolve_person', args: { name, context } }
}

export async function searchWebTool(query: string, state: AgentState): Promise<ToolResult> {
  const normalizedQuery = query.trim().toLowerCase()
  if (state.seenQueries.has(normalizedQuery)) {
    // Already searched this query — skip to avoid duplicate API calls
    return { tool: 'search_web', args: { query }, output: 'Duplicate query skipped', urls: [] }
  }

  if (state.webSearchCount >= MAX_WEB_SEARCHES) {
    return { tool: 'search_web', args: { query }, output: 'Search limit reached', urls: [], error: 'limit' }
  }

  state.seenQueries.add(normalizedQuery)
  state.webSearchCount++

  const results = await searchWeb(query, 5)
  const urls = results.map(r => r.url)
  const output = results.map(r => `${r.title}: ${r.snippet} [${r.url}]`).join('\n')

  return { tool: 'search_web', args: { query }, output, urls }
}

export async function findPersonProfiles(
  name: string,
  platforms: ProfileCandidate['platform'][],
  state: AgentState
): Promise<ToolResult[]> {
  const results: ToolResult[] = []

  for (const platform of platforms) {
    if (platform === 'website' || platform === 'company') continue // handled by findCompany

    const domainPatterns = PLATFORM_DOMAINS[platform] ?? []
    const query = domainPatterns.length > 0
      ? `site:${domainPatterns[0].split('/')[0]} "${name}"`
      : `"${name}" ${platform} profile`

    const result = await searchWebTool(query, state)
    // Only keep URLs that match this platform's domain patterns
    const filteredUrls = result.urls.filter(url =>
      domainPatterns.some(pattern => url.includes(pattern))
    )

    results.push({
      ...result,
      tool: 'find_person_profiles',
      args: { name, platform },
      urls: filteredUrls,
    })
  }

  return results
}

export async function findCompany(
  companyName: string,
  personName: string | null,
  state: AgentState
): Promise<ToolResult> {
  const query = personName
    ? `${companyName} ${personName} official website`
    : `${companyName} official website`

  const result = await searchWebTool(query, state)
  // Filter out social media domains — company sites only
  const filteredUrls = result.urls.filter(url => {
    try {
      const hostname = new URL(url).hostname
      return !SOCIAL_DOMAINS.some(d => hostname.includes(d))
    } catch {
      return false
    }
  })

  return { ...result, tool: 'find_company', args: { companyName, personName: personName ?? '' }, urls: filteredUrls }
}

export function verifyProfile(
  name: string,
  url: string,
  knownSignals: string[],
  state: AgentState
): ProfileCandidate {
  let hostname = 'unknown'
  try { hostname = new URL(url).hostname } catch { /* invalid url */ }

  const nameLower = name.toLowerCase()
  let nameHit = false
  let signalHits = 0

  for (const step of state.steps) {
    const relevant = step.urls.includes(url) || step.output.includes(hostname)
    if (!relevant) continue
    if (step.output.toLowerCase().includes(nameLower)) nameHit = true
    for (const signal of knownSignals) {
      if (signal && step.output.toLowerCase().includes(signal.toLowerCase())) signalHits++
    }
  }

  const confidence: ProfileCandidate['confidence'] =
    nameHit && signalHits >= 1 ? 'high' : nameHit ? 'medium' : 'low'

  return {
    platform: detectPlatformFromUrl(hostname),
    url,
    displayName: name,
    confidence,
    signals: knownSignals,
  }
}

function detectPlatformFromUrl(hostname: string): ProfileCandidate['platform'] {
  if (hostname.includes('linkedin.com')) return 'linkedin'
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter'
  if (hostname.includes('instagram.com')) return 'instagram'
  if (hostname.includes('github.com')) return 'github'
  return 'unknown'
}
