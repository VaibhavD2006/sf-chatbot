import type { ChatMessage } from './types'

const MAX_HISTORY_MESSAGES = 10

/**
 * Trim conversation to the most recent N messages.
 * Always keeps the latest user message.
 */
export function trimHistory(messages: ChatMessage[], maxMessages = MAX_HISTORY_MESSAGES): ChatMessage[] {
  if (messages.length <= maxMessages) return messages
  return messages.slice(-maxMessages)
}

/**
 * Extract the latest user query from the message array.
 * Throws if no user message is found.
 */
export function extractUserQuery(messages: ChatMessage[]): string {
  const userMessages = messages.filter(m => m.role === 'user')
  if (userMessages.length === 0) {
    throw new Error('No user message found in conversation')
  }
  return userMessages[userMessages.length - 1].content
}
