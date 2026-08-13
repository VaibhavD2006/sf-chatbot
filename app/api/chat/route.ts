import { NextRequest } from 'next/server'
import { orchestrate } from '@/lib/chat/orchestrator'
import type { ChatMessage } from '@/lib/chat/types'
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

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of orchestrate(messages)) {
          if (event.type === 'text') {
            controller.enqueue(encoder.encode(event.content))
          } else if (event.type === 'error') {
            controller.enqueue(encoder.encode(`\n\n${event.message}`))
          } else if (event.type === 'metadata') {
            // Append metadata frame at end — frontend splits on this
            const frame = `__META__:${JSON.stringify({
              route: event.route,
              citations: event.citations,
            })}`
            controller.enqueue(encoder.encode(frame))
          }
          // 'status' events are intentionally dropped here —
          // frontend infers status from first streaming text arrival
        }
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
