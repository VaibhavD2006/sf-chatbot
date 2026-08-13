import { NextRequest } from 'next/server'
import { orchestrate } from '@/lib/chat/orchestrator'
import type { ChatMessage } from '@/lib/chat/types'
import type { Citation, ChatRoute } from '@/lib/types/source'
import { shouldUseAgent, runAgent } from '@/lib/agent'
import { log } from '@/lib/utils/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  let messages: ChatMessage[]

  try {
    const body = await req.json()
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    messages = body.messages
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const encoder = new TextEncoder()
  const latestQuery = messages[messages.length - 1]?.content ?? ''
  const useAgent = shouldUseAgent(latestQuery)

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Use object wrapper so TypeScript tracks mutations through async callbacks
        const orchestratorMeta = { citations: [] as Citation[], route: 'web' as ChatRoute }

        // Run orchestrator and agent in parallel when agent is needed
        const [, agentResult] = await Promise.all([
          (async () => {
            for await (const event of orchestrate(messages)) {
              if (event.type === 'text') {
                controller.enqueue(encoder.encode(event.content))
              } else if (event.type === 'error') {
                controller.enqueue(encoder.encode(`\n\n${event.message}`))
              } else if (event.type === 'metadata') {
                orchestratorMeta.citations = event.citations
                orchestratorMeta.route = event.route
              }
              // 'status' events are intentionally dropped here —
              // frontend infers status from first streaming text arrival
            }
          })(),
          useAgent ? runAgent(messages, latestQuery) : Promise.resolve(null),
        ])

        // Append agent answer section if agent ran and produced a result
        if (agentResult && agentResult.answer) {
          controller.enqueue(encoder.encode('\n\n---\n\n**Profile Research**\n\n' + agentResult.answer))
        }

        // Merge citations and emit single __META__ frame
        const mergedCitations: Citation[] = [
          ...orchestratorMeta.citations,
          ...(agentResult?.citations ?? []),
        ]
        const isTranscriptBacked = orchestratorMeta.route === 'transcript' || orchestratorMeta.route === 'hybrid'
        const route: ChatRoute = useAgent
          ? (isTranscriptBacked ? 'hybrid_agent' : 'agent')
          : orchestratorMeta.route

        const frame = `__META__:${JSON.stringify({ route, citations: mergedCitations })}`
        controller.enqueue(encoder.encode(frame))
      } catch (err) {
        log.error('chat route streaming error', { error: String(err) })
        controller.enqueue(encoder.encode('\n\nAn error occurred. Please try again.'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
