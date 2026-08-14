'use client'

import { useState } from 'react'
import type { TranscriptCitation } from '@/lib/types/source'

interface TranscriptSourceProps {
  citation: TranscriptCitation
}

export function TranscriptSource({ citation }: TranscriptSourceProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 text-xs hover:border-gray-300 transition-colors duration-150">
      <div className="flex-1 min-w-0">
        {citation.episodeTitle && (
          <p className="font-medium text-[var(--text-primary)] leading-snug mb-1 line-clamp-2">
            {citation.episodeTitle}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[var(--text-muted)]">
          {citation.guest && (
            <span>{citation.guest}</span>
          )}
          {citation.speaker && citation.speaker !== citation.guest && (
            <span>· {citation.speaker}</span>
          )}
          {citation.timestamp && (
            <span className="font-mono">{citation.timestamp}</span>
          )}
        </div>

        {citation.excerpt && (
          <div className="mt-2">
            <p className={`text-[var(--text-secondary)] leading-relaxed ${!expanded ? 'line-clamp-2' : ''}`}>
              {citation.excerpt}
            </p>
            {citation.excerpt.length > 100 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] mt-1 transition-colors cursor-pointer"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}

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
      </div>
    </div>
  )
}
