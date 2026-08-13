'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { EmptyState } from './EmptyState'
import { ThinkingState } from './ThinkingState'
import { StreamingMessage } from './StreamingMessage'
import type { Citation } from '@/lib/types/source'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

const META_PREFIX = '__META__:'

function parseMetaFrame(text: string): { content: string; citations: Citation[]; route: string } | null {
  const idx = text.indexOf(META_PREFIX)
  if (idx === -1) return null
  try {
    const meta = JSON.parse(text.slice(idx + META_PREFIX.length))
    return {
      content: text.slice(0, idx),
      citations: meta.citations ?? [],
      route: meta.route ?? 'transcript',
    }
  } catch {
    return null
  }
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleSubmit = useCallback(async () => {
    const query = input.trim()
    if (!query || isLoading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    setStreamingContent('')

    const apiMessages = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }))

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setStreamingContent(accumulated)
      }

      const parsed = parseMetaFrame(accumulated)
      const finalContent = parsed ? parsed.content : accumulated
      const citations = parsed?.citations ?? []

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: finalContent.trim(),
        citations,
      }

      setMessages(prev => [...prev, assistantMessage])
      setStreamingContent('')
    } catch {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
      }
      setMessages(prev => [...prev, errorMessage])
      setStreamingContent('')
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  const handlePromptClick = useCallback((prompt: string) => {
    setInput(prompt)
  }, [])

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto px-4">
      <div className="flex-1 overflow-y-auto scrollbar-thin py-6">
        {messages.length === 0 && !isLoading ? (
          <EmptyState onPromptClick={handlePromptClick} />
        ) : (
          <div className="space-y-2">
            {messages.map(msg => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                citations={msg.citations}
              />
            ))}

            {isLoading && streamingContent === '' && (
              <ThinkingState status="searching_podcast" />
            )}
            {isLoading && streamingContent !== '' && (
              <StreamingMessage content={streamingContent} />
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="py-4 border-t border-[var(--border)]">
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={isLoading}
        />
      </div>
    </div>
  )
}
