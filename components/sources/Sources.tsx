'use client'

import type { Citation, TranscriptCitation, WebCitation, ProfileCitation } from '@/lib/types/source'
import { TranscriptSource } from './TranscriptSource'
import { WebSource } from './WebSource'
import { ProfileSource } from './ProfileSource'

interface SourcesProps {
  citations: Citation[]
}

export function Sources({ citations }: SourcesProps) {
  if (!citations || citations.length === 0) return null

  const transcriptCitations = citations.filter(
    (c): c is TranscriptCitation => c.type === 'transcript'
  )
  const webCitations = citations.filter(
    (c): c is WebCitation => c.type === 'web'
  )
  const profileCitations = citations.filter(
    (c): c is ProfileCitation => c.type === 'profile'
  )

  return (
    <div className="mt-4 space-y-4">
      {transcriptCitations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
            Podcast Sources ({transcriptCitations.length})
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {transcriptCitations.map((citation, i) => (
              <TranscriptSource key={i} citation={citation} />
            ))}
          </div>
        </div>
      )}

      {webCitations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
            Web Sources ({webCitations.length})
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {webCitations.map((citation, i) => (
              <WebSource key={i} citation={citation} />
            ))}
          </div>
        </div>
      )}

      {profileCitations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide mb-2">
            Profiles ({profileCitations.length})
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {profileCitations.map((citation, i) => (
              <ProfileSource key={i} citation={citation} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
