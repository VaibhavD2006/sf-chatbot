/** A single result from a web search */
export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  domain?: string
}

/** Abstract interface for web search providers */
export interface SearchProvider {
  search(query: string, maxResults?: number): Promise<WebSearchResult[]>
}
