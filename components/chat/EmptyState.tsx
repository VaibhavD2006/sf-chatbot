interface EmptyStateProps {
  onPromptClick: (prompt: string) => void
}

const EXAMPLE_PROMPTS = [
  'What have guests said about finding product-market fit?',
  'How did founders get their first customers?',
  'What advice has the podcast given about fundraising?',
]

export function EmptyState({ onPromptClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
        Solo Founders
      </h1>
      <p className="mt-2 text-[var(--text-secondary)] text-sm">
        Ask anything from the podcast.
      </p>

      <div className="mt-8 flex flex-col gap-2 w-full max-w-sm">
        {EXAMPLE_PROMPTS.map(prompt => (
          <button
            key={prompt}
            onClick={() => onPromptClick(prompt)}
            className="text-left text-sm text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] rounded-xl px-4 py-3 hover:border-gray-300 hover:text-[var(--text-primary)] transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
