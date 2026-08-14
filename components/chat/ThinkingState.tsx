interface ThinkingStateProps {
  status?: 'searching_podcast' | 'searching_web' | 'generating'
}

export function ThinkingState({ status = 'searching_podcast' }: ThinkingStateProps) {
  const label =
    status === 'searching_web'
      ? 'Searching the web…'
      : status === 'generating'
      ? 'Generating answer…'
      : 'Searching the podcast…'

  return (
    <div className="flex items-center gap-2.5 py-2 mb-4">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[var(--border)] animate-bounce"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
      <span className="text-sm text-[var(--text-muted)]">{label}</span>
    </div>
  )
}
