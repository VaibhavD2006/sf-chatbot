import type { ChatMessage } from '@/lib/chat/types'
import type { AgentResult } from './types'
import { extractPersonName, detectRequestedPlatforms } from './should-use-agent'
import { runAgentLoop } from './loop'

export async function runAgent(messages: ChatMessage[], query: string): Promise<AgentResult> {
  const personName = extractPersonName(messages)
  const platforms = detectRequestedPlatforms(query)

  const state = {
    query,
    personName,
    steps: [],
    webSearchCount: 0,
    seenUrls: new Set<string>(),
    seenQueries: new Set<string>(),
  }

  return runAgentLoop(state, platforms)
}
