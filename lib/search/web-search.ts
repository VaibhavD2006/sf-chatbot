import type { WebSearchResult } from './types'
import { TavilyProvider } from './provider'
import { log } from '@/lib/utils/logger'

let _provider: ReturnType<typeof getProvider> | null = null

function getProvider() {
  const tavilyKey = process.env.TAVILY_API_KEY
  if (tavilyKey) {
    log.debug('webSearch: using Tavily provider')
    return new TavilyProvider(tavilyKey)
  }
  return null
}

/**
 * Search the web using the best available provider.
 * Returns empty array if no provider is configured (web route gracefully degrades).
 */
export async function searchWeb(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  if (!_provider) {
    _provider = getProvider()
  }

  if (!_provider) {
    log.warn('searchWeb: no provider configured (set TAVILY_API_KEY). Returning empty results.')
    return []
  }

  try {
    const results = await _provider.search(query, maxResults)
    log.debug('searchWeb results', { query, resultCount: results.length })
    return results
  } catch (err) {
    log.error('searchWeb error', { query, error: String(err) })
    return []
  }
}
