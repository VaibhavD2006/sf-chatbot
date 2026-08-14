interface StreamingMessageProps {
  content: string
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  return (
    <div className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
      {content}
      <span className="inline-block w-0.5 h-4 bg-gray-400 ml-0.5 animate-pulse align-middle" />
    </div>
  )
}
