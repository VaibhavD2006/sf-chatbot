'use client'

import { Card } from '@/components/ui/Card'
import type { WebCitation } from '@/lib/types/source'

interface WebSourceProps {
  citation: WebCitation
}

export function WebSource({ citation }: WebSourceProps) {
  return (
    <Card padding="sm" className="text-xs">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[var(--text-primary)] hover:underline line-clamp-2 block"
          >
            {citation.title}
          </a>

          {citation.domain && (
            <p className="text-[var(--text-muted)] mt-0.5 truncate">{citation.domain}</p>
          )}

          {citation.snippet && (
            <p className="text-[var(--text-secondary)] mt-1.5 leading-relaxed line-clamp-3">
              {citation.snippet}
            </p>
          )}
        </div>

        {/* External link indicator */}
        <div className="shrink-0 mt-0.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
            <polyline points="15,3 21,3 21,9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </div>
      </div>
    </Card>
  )
}
