'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { Sources } from '@/components/sources/Sources'
import type { Citation } from '@/lib/types/source'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

// Block images (tracking pixels / exfiltration) and restrict links to http/https only.
const SAFE_COMPONENTS: Components = {
  img: () => null,
  a: ({ href, children }) => {
    const safe = typeof href === 'string' && (href.startsWith('https://') || href.startsWith('http://'))
    if (!safe) return <span>{children}</span>
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  },
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
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={SAFE_COMPONENTS}>
          {content}
        </ReactMarkdown>
      </div>
      {citations && citations.length > 0 && (
        <Sources citations={citations} />
      )}
    </div>
  )
}
