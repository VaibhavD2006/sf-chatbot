import OpenAI from 'openai'
import { config } from '@/lib/utils/env'

let _client: OpenAI | null = null

export function getOpenAIClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: config.openaiApiKey(),
    })
  }
  return _client
}

/** Model identifiers — change here to update everywhere */
export const MODELS = {
  embedding: () => config.embeddingModel(),
  chat: () => config.chatModel(),
} as const

/** Embedding vector dimension for the default model */
export const EMBEDDING_DIMENSION = 1536
