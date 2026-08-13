import { getOpenAIClient, MODELS } from '@/lib/ai/openai'
import { buildQueryRewritePrompt } from '@/lib/ai/prompts/query-rewrite'
import { log } from '@/lib/utils/logger'

interface Message {
  role: string
  content: string
}

/** Max conversation turns to include in rewrite context */
const MAX_HISTORY_FOR_REWRITE = 6

/** Min query length that suggests it's already standalone */
const STANDALONE_QUERY_LENGTH = 200

/**
 * Detect if a query likely needs rewriting.
 * Checks for pronouns and follow-up indicators.
 */
function needsRewrite(query: string, hasHistory: boolean): boolean {
  if (!hasHistory) return false
  if (query.length > STANDALONE_QUERY_LENGTH) return false

  const followUpPatterns = [
    /\b(he|she|they|it|him|her|them|his|her|their|its)\b/i,
    /\b(that|this|these|those)\b/i,
    /\b(what about|why did|how did|when did|where did|who did)\b/i,
    /\b(the (podcast|episode|guest|show|host))\b/i,
    /^\s*(and|but|also|so|then|what|why|how|when|where|who)\b/i,
    /\b(same|above|mentioned|earlier|previously|before)\b/i,
  ]

  return followUpPatterns.some(p => p.test(query))
}

/**
 * Format recent conversation history as readable text for the LLM.
 */
function formatHistory(messages: Message[], lastN: number): string {
  const recent = messages.slice(-lastN)
  return recent
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n')
}

/**
 * Rewrite a conversational follow-up question into a standalone retrieval query.
 *
 * If the query doesn't appear to need rewriting (first turn, long query, no pronouns),
 * returns the original query unchanged.
 */
export async function rewriteQuery(
  messages: Message[],
  latestQuery: string
): Promise<string> {
  const hasHistory = messages.length > 1
  const shouldRewrite = needsRewrite(latestQuery, hasHistory)

  log.debug('rewriteQuery', {
    originalQuery: latestQuery,
    hasHistory,
    shouldRewrite,
  })

  if (!shouldRewrite) {
    return latestQuery
  }

  const conversationHistory = formatHistory(messages.slice(0, -1), MAX_HISTORY_FOR_REWRITE)
  const prompt = buildQueryRewritePrompt({ conversationHistory, latestQuery })

  try {
    const client = getOpenAIClient()
    const response = await client.chat.completions.create({
      model: MODELS.chat(),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 200,
    })

    const rewritten = response.choices[0]?.message?.content?.trim()
    if (!rewritten) return latestQuery

    log.info('rewriteQuery result', {
      original: latestQuery,
      rewritten,
    })

    return rewritten
  } catch (err) {
    log.error('rewriteQuery failed, using original', { error: String(err) })
    return latestQuery
  }
}
