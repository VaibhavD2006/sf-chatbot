import { Sources } from '@/components/sources/Sources'
import type { Citation } from '@/lib/types/source'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

function renderContent(text: string) {
  return text.split('\n\n').map((para, i) => (
    <p key={i} className="mb-3 last:mb-0">
      {para.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j}>{part.slice(2, -2)}</strong>
        }
        return part
      })}
    </p>
  ))
}

export function ChatMessage({ role, content, citations }: ChatMessageProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%] bg-[var(--accent)] text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed">
          {content}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="text-sm text-[var(--text-primary)] leading-relaxed">
        {renderContent(content)}
      </div>
      {citations && citations.length > 0 && (
        <Sources citations={citations} />
      )}
    </div>
  )
}
