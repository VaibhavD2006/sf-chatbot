interface EmptyStateProps {
  onPromptClick: (prompt: string) => void
}

const EXAMPLE_PROMPTS = [
  'What have guests said about finding product-market fit?',
  'How did solo founders get their first customers?',
  'What does the data say about founder equity at exit?',
  'What advice has the podcast given about fundraising?',
]

export function EmptyState({ onPromptClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-12 text-center">
      {/* Wordmark */}
      <div className="mb-8">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-[var(--text-muted)]" aria-hidden="true">
          <rect x="9" y="2" width="6" height="12" rx="3"/>
          <path d="M5 10a7 7 0 0014 0"/>
          <line x1="12" y1="19" x2="12" y2="22"/>
          <line x1="8" y1="22" x2="16" y2="22"/>
        </svg>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight leading-snug">
          Ask anything from the<br />Solo Founders podcast.
        </h1>
        <p className="mt-3 text-sm text-[var(--text-muted)] max-w-xs mx-auto leading-relaxed">
          Conversations with founders who built without co-founders — distilled on demand.
        </p>
      </div>

      {/* Prompts */}
      <div className="flex flex-col gap-2 w-full max-w-sm">
        {EXAMPLE_PROMPTS.map(prompt => (
          <button
            key={prompt}
            onClick={() => onPromptClick(prompt)}
            className="text-left text-sm text-[var(--text-secondary)] bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-3 hover:border-gray-400 hover:text-[var(--text-primary)] transition-all duration-150 cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
