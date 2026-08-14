'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface StreamingMessageProps {
  content: string
}

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

export function StreamingMessage({ content }: StreamingMessageProps) {
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={SAFE_COMPONENTS}>
        {content}
      </ReactMarkdown>
      <span className="inline-block w-0.5 h-[1em] bg-[var(--text-muted)] ml-0.5 animate-pulse align-middle" />
    </div>
  )
}
