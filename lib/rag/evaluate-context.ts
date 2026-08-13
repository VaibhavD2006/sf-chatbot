import type { EvidenceLevel, RetrievedChunk } from '@/lib/types/retrieval'
import { getOpenAIClient, MODELS } from '@/lib/ai/openai'
import { buildEvidencePrompt } from '@/lib/ai/prompts/evidence'
import { log } from '@/lib/utils/logger'

const HIGH_SIMILARITY_THRESHOLD = 0.75
const MIN_CHUNKS_FOR_SUPPORTED = 2
const MAX_EXCERPT_LENGTH = 500

/** Signal scores from non-LLM heuristics */
interface HeuristicSignals {
  highSimilarityCount: number
  topScore: number
  chunkCount: number
}

function computeHeuristicSignals(chunks: RetrievedChunk[]): HeuristicSignals {
  return {
    highSimilarityCount: chunks.filter(c => c.similarityScore >= HIGH_SIMILARITY_THRESHOLD).length,
    topScore: chunks.length > 0 ? Math.max(...chunks.map(c => c.similarityScore)) : 0,
    chunkCount: chunks.length,
  }
}

/**
 * Fast heuristic pre-check before calling LLM.
 * Returns a level if signals are unambiguous, otherwise returns null (→ use LLM).
 */
function heuristicLevel(signals: HeuristicSignals): EvidenceLevel | null {
  // Clearly unsupported: no chunks at all, or top score is very low
  if (signals.chunkCount === 0 || signals.topScore < 0.4) {
    return 'not_supported'
  }

  // Clearly supported: multiple high-confidence chunks
  if (signals.highSimilarityCount >= MIN_CHUNKS_FOR_SUPPORTED && signals.topScore >= 0.82) {
    return 'transcript_supported'
  }

  // Ambiguous — defer to LLM
  return null
}

/**
 * Call the LLM to classify evidence quality.
 * Returns null if the call fails (caller should fall back to heuristic).
 */
async function classifyWithLLM(
  query: string,
  chunks: RetrievedChunk[]
): Promise<EvidenceLevel | null> {
  const excerpts = chunks.slice(0, 5).map(c =>
    c.content.length > MAX_EXCERPT_LENGTH
      ? c.content.slice(0, MAX_EXCERPT_LENGTH) + '...'
      : c.content
  )

  const prompt = buildEvidencePrompt({ query, retrievedExcerpts: excerpts })

  try {
    const client = getOpenAIClient()
    const response = await client.chat.completions.create({
      model: MODELS.chat(),
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) return null

    const parsed = JSON.parse(raw) as { level: string; reason: string }
    const level = parsed.level as EvidenceLevel

    if (!['transcript_supported', 'partially_supported', 'not_supported'].includes(level)) {
      log.warn('evaluateEvidence: LLM returned unexpected level', { level })
      return null
    }

    log.debug('evaluateEvidence LLM result', { level, reason: parsed.reason })
    return level
  } catch (err) {
    log.error('evaluateEvidence LLM call failed', { error: String(err) })
    return null
  }
}

/**
 * Evaluate whether retrieved transcript chunks are sufficient to answer a query.
 *
 * Uses multi-signal approach:
 * 1. Fast heuristic check (similarity scores, chunk count)
 * 2. LLM classification for ambiguous cases
 * 3. Heuristic fallback if LLM fails
 */
export async function evaluateEvidence(
  query: string,
  chunks: RetrievedChunk[]
): Promise<EvidenceLevel> {
  const signals = computeHeuristicSignals(chunks)

  log.debug('evaluateEvidence signals', {
    query: query.slice(0, 80),
    ...signals,
  })

  // Try fast heuristic first
  const heuristic = heuristicLevel(signals)
  if (heuristic !== null) {
    log.info('evaluateEvidence: heuristic decision', { level: heuristic, signals })
    return heuristic
  }

  // Ambiguous — use LLM
  const llmLevel = await classifyWithLLM(query, chunks)

  if (llmLevel !== null) {
    log.info('evaluateEvidence: LLM decision', { level: llmLevel, signals })
    return llmLevel
  }

  // LLM failed — fall back to conservative heuristic
  const fallback: EvidenceLevel =
    signals.topScore >= 0.65 ? 'partially_supported' : 'not_supported'

  log.warn('evaluateEvidence: LLM failed, using fallback', { fallback, signals })
  return fallback
}
