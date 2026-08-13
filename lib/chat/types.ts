import type { Citation, ChatRoute } from '@/lib/types/source'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
}

/** Streamed from the orchestrator — either a text chunk or final metadata */
export type OrchestratorEvent =
  | { type: 'text'; content: string }
  | { type: 'status'; message: string }
  | { type: 'metadata'; route: ChatRoute; citations: Citation[] }
  | { type: 'error'; message: string }
