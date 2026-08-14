'use client'

import { Card } from '@/components/ui/Card'
import type { ProfileCitation } from '@/lib/types/source'

const PLATFORM_LABELS: Record<ProfileCitation['platform'], string> = {
  linkedin: 'LinkedIn',
  twitter: 'X / Twitter',
  instagram: 'Instagram',
  github: 'GitHub',
  website: 'Personal Site',
  company: 'Company',
  unknown: 'Profile',
}

interface ProfileSourceProps {
  citation: ProfileCitation
}

export function ProfileSource({ citation }: ProfileSourceProps) {
  const label = PLATFORM_LABELS[citation.platform]
  const isUnverified = citation.confidence === 'low'

  return (
    <Card padding="sm" className="text-xs">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-medium text-[var(--text-muted)] uppercase tracking-wide text-[10px]">
              {label}
            </span>
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                citation.confidence === 'high'
                  ? 'bg-green-500'
                  : citation.confidence === 'medium'
                    ? 'bg-yellow-400'
                    : 'bg-gray-400'
              }`}
            />
          </div>

          {citation.name && (
            <p className="font-medium text-[var(--text-primary)] truncate">{citation.name}</p>
          )}

          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-muted)] hover:underline truncate block"
          >
            {citation.url}
          </a>

          {isUnverified && (
            <p className="text-[var(--text-muted)] mt-0.5 italic">(unverified)</p>
          )}
        </div>

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
