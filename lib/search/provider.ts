import type { SearchProvider, WebSearchResult } from './types'
import { extractDomain } from '@/lib/utils/text'
import { log } from '@/lib/utils/logger'

export class TavilyProvider implements SearchProvider {
  private readonly apiKey: string
  private readonly baseUrl = 'https://api.tavily.com/search'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async search(query: string, maxResults = 5): Promise<WebSearchResult[]> {
    log.debug('TavilyProvider.search', { query, maxResults })

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Tavily search failed: ${response.status} ${body}`)
    }

    const data = await response.json() as { results: Array<{ title: string; url: string; content: string }> }

    return (data.results ?? []).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      domain: extractDomain(r.url),
    }))
  }
}
