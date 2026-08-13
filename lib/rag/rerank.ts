import type { RetrievedChunk } from '@/lib/types/retrieval'

/**
 * Extract unique keywords from a query (lowercase, no stopwords).
 */
function extractKeywords(query: string): string[] {
  const stopwords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'about', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'out', 'up', 'down', 'and', 'but', 'or', 'nor', 'so', 'yet', 'both',
    'either', 'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just', 'how',
    'what', 'when', 'where', 'who', 'why', 'which', 'that', 'this', 'these', 'those',
    'it', 'its', 'they', 'them', 'their', 'he', 'she', 'him', 'her', 'we', 'us', 'our', 'i'])

  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w))
}

/**
 * Keyword density score: fraction of query keywords found in the chunk content.
 */
function keywordScore(content: string, keywords: string[]): number {
  if (keywords.length === 0) return 0
  const lower = content.toLowerCase()
  const matched = keywords.filter(kw => lower.includes(kw)).length
  return matched / keywords.length
}

/**
 * Rerank chunks by combining semantic similarity with keyword presence.
 * Weights: 70% semantic similarity + 30% keyword density.
 */
export function rerankByRelevance(
  chunks: RetrievedChunk[],
  query: string
): RetrievedChunk[] {
  const keywords = extractKeywords(query)

  const scored = chunks.map(chunk => {
    const semantic = chunk.hybridScore ?? chunk.similarityScore
    const keyword = keywordScore(chunk.content, keywords)
    const combined = 0.7 * semantic + 0.3 * keyword

    return { chunk, combined }
  })

  return scored
    .sort((a, b) => b.combined - a.combined)
    .map(({ chunk }) => chunk)
}
