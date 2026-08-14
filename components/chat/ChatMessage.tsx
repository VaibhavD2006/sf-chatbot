'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Sources } from '@/components/sources/Sources'
import type { Citation } from '@/lib/types/source'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

export function ChatMessage({ role, content, citations }: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-5">
        <div className="max-w-[78%] bg-[var(--accent)] text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-7">
      <div className="markdown-content">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
      {citations && citations.length > 0 && (
        <Sources citations={citations} />
      )}
    </div>
  )
}
