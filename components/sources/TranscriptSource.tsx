'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import type { TranscriptCitation } from '@/lib/types/source'

interface TranscriptSourceProps {
  citation: TranscriptCitation
}

export function TranscriptSource({ citation }: TranscriptSourceProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card padding="sm" className="text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Episode title */}
          {citation.episodeTitle && (
            <p className="font-medium text-[var(--text-primary)] truncate">
              {citation.episodeTitle}
            </p>
          )}

          {/* Guest / Speaker / Timestamp row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
            {citation.guest && (
              <span className="text-[var(--text-secondary)]">{citation.guest}</span>
            )}
            {citation.speaker && citation.speaker !== citation.guest && (
              <span className="text-[var(--text-muted)]">· {citation.speaker}</span>
            )}
            {citation.timestamp && (
              <span className="text-[var(--text-muted)] font-mono">{citation.timestamp}</span>
            )}
          </div>

          {/* Excerpt — collapsed by default */}
          {citation.excerpt && (
            <div className="mt-1.5">
              <p className={`text-[var(--text-secondary)] leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
                {citation.excerpt}
              </p>
              {citation.excerpt.length > 100 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] mt-0.5 transition-colors"
                >
                  {expanded ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Podcast icon indicator */}
        <div className="shrink-0 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-gray-400">
            <path d="M12 1a9 9 0 100 18A9 9 0 0012 1zM11 7h2v2h-2V7zm0 4h2v6h-2v-6z"/>
          </svg>
        </div>
      </div>

      {/* Source URL */}
      {citation.sourceUrl && (
        <a
          href={citation.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors truncate"
        >
          {citation.sourceUrl}
        </a>
      )}
    </Card>
  )
}
