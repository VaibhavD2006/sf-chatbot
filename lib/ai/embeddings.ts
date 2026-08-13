import { getOpenAIClient, MODELS } from './openai'
import { log } from '@/lib/utils/logger'

const BATCH_SIZE = 100

/**
 * Embed a single text string.
 * Use for query embedding at inference time.
 */
export async function embedText(text: string): Promise<number[]> {
  const client = getOpenAIClient()
  const response = await client.embeddings.create({
    model: MODELS.embedding(),
    input: text,
  })
  return response.data[0].embedding
}

/**
 * Embed multiple texts, batching in groups of BATCH_SIZE.
 * Use for ingestion to avoid hitting API limits.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const client = getOpenAIClient()
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    log.debug('embedTexts batch', { batchStart: i, batchSize: batch.length, total: texts.length })

    const response = await client.embeddings.create({
      model: MODELS.embedding(),
      input: batch,
    })

    // API returns embeddings in order
    const batchEmbeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map(d => d.embedding)

    results.push(...batchEmbeddings)
  }

  return results
}
