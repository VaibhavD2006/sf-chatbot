'use client'

import type { WebCitation } from '@/lib/types/source'

interface WebSourceProps {
  citation: WebCitation
}

export function WebSource({ citation }: WebSourceProps) {
  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 text-xs hover:border-gray-300 transition-colors duration-150">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--text-primary)] hover:underline underline-offset-2 line-clamp-2 block leading-snug"
          >
            {citation.title}
          </a>

          {citation.domain && (
            <p className="text-[var(--text-muted)] mt-1 truncate">{citation.domain}</p>
          )}

          {citation.snippet && (
            <p className="text-[var(--text-secondary)] mt-1.5 leading-relaxed line-clamp-3">
              {citation.snippet}
            </p>
          )}
        </div>

        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-[var(--text-muted)] mt-0.5" aria-hidden="true">
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
          <polyline points="15,3 21,3 21,9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </div>
    </div>
  )
}
