'use client'

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

  return (
    <div className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 text-xs hover:border-gray-300 transition-colors duration-150">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-semibold text-[var(--text-muted)] uppercase tracking-widest text-[9px]">
              {label}
            </span>
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                citation.confidence === 'high'
                  ? 'bg-green-500'
                  : citation.confidence === 'medium'
                  ? 'bg-yellow-400'
                  : 'bg-gray-300'
              }`}
            />
          </div>

          {citation.name && (
            <p className="font-medium text-[var(--text-primary)] truncate mb-0.5">{citation.name}</p>
          )}

          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:underline underline-offset-2 truncate block transition-colors"
          >
            {citation.url}
          </a>

          {citation.confidence === 'low' && (
            <p className="text-[var(--text-muted)] mt-0.5 italic">unverified</p>
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
