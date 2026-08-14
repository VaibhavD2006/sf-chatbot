import { searchWeb } from '@/lib/search/web-search'
import { getOpenAIClient, MODELS } from '@/lib/ai/openai'
import type { WebSearchResult } from '@/lib/search/types'
import { log } from '@/lib/utils/logger'

const MAX_SUB_QUERIES = 4
const RESULTS_PER_QUERY = 5

/** Patterns that indicate a question needs multi-source research synthesis */
const RESEARCH_PATTERNS = [
  /\b(equity|vesting|option|grant|compensation|salary)\b/i,
  /\b(benchmark|industry average|comparable|typical|standard|norm)\b/i,
  /\b(statistic|percentage|percent|rate|ratio|how much|how many)\b/i,
  /\bwhat do (vc|investor|expert|analyst|founder)s?\b/i,
  /\bcompare|versus|vs\.?\b/i,
  /\b(report|data|research|study|survey)\b/i,
  /\bbest practice/i,
]

export function isResearchQuery(query: string): boolean {
  return RESEARCH_PATTERNS.some(p => p.test(query))
}

/**
 * Generate targeted sub-queries for a research question.
 * Returns the original query if LLM call fails.
 */
async function generateSubQueries(query: string, transcriptContext: string): Promise<string[]> {
  const client = getOpenAIClient()

  const prompt = `You are a research assistant helping answer a question about startup founders and venture capital.

The user asked: "${query}"

We already have some podcast transcript context:
${transcriptContext ? transcriptContext.slice(0, 600) : '(none)'}

Generate ${MAX_SUB_QUERIES} targeted web search queries to find additional data, benchmarks, statistics, and expert perspectives on this topic. Focus on:
1. Industry benchmarks and statistics
2. VC/investor perspectives
3. Comparable data (e.g., solo vs. co-founded if relevant)
4. Recent research or reports

Return ONLY a JSON array of query strings, no explanation. Example:
["query 1", "query 2", "query 3", "query 4"]`

  try {
    const response = await client.chat.completions.create({
      model: MODELS.chat(),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content ?? ''
    // The model returns a JSON object — extract the array
    const parsed = JSON.parse(raw)
    const queries: string[] = Array.isArray(parsed) ? parsed : (parsed.queries ?? parsed.results ?? [])

    if (queries.length > 0) {
      log.info('deepResearch: generated sub-queries', { count: queries.length })
      return queries.slice(0, MAX_SUB_QUERIES)
    }
  } catch (err) {
    log.warn('deepResearch: sub-query generation failed, using original query', { error: String(err) })
  }

  return [query]
}

/**
 * Run multiple targeted web searches and return deduplicated results.
 */
export async function deepResearch(
  query: string,
  transcriptContext: string
): Promise<{ results: WebSearchResult[]; subQueries: string[] }> {
  const subQueries = await generateSubQueries(query, transcriptContext)

  log.info('deepResearch: running sub-queries', { subQueries })

  // Run all searches in parallel
  const searchPromises = subQueries.map(q => searchWeb(q, RESULTS_PER_QUERY))
  const allResultSets = await Promise.all(searchPromises)

  // Flatten and deduplicate by URL
  const seen = new Set<string>()
  const results: WebSearchResult[] = []

  for (const resultSet of allResultSets) {
    for (const r of resultSet) {
      if (!seen.has(r.url)) {
        seen.add(r.url)
        results.push(r)
      }
    }
  }

  log.info('deepResearch: results', {
    subQueryCount: subQueries.length,
    totalResults: results.length,
  })

  return { results, subQueries }
}
