'use client'

import type { Citation, TranscriptCitation, WebCitation, ProfileCitation } from '@/lib/types/source'
import { TranscriptSource } from './TranscriptSource'
import { WebSource } from './WebSource'
import { ProfileSource } from './ProfileSource'

interface SourcesProps {
  citations: Citation[]
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-2">
      {children}
    </p>
  )
}

export function Sources({ citations }: SourcesProps) {
  if (!citations || citations.length === 0) return null

  const transcriptCitations = citations.filter((c): c is TranscriptCitation => c.type === 'transcript')
  const webCitations = citations.filter((c): c is WebCitation => c.type === 'web')
  const profileCitations = citations.filter((c): c is ProfileCitation => c.type === 'profile')

  return (
    <div className="mt-5 pt-5 border-t border-[var(--border)] space-y-5">
      {transcriptCitations.length > 0 && (
        <div>
          <SectionLabel>Podcast Sources ({transcriptCitations.length})</SectionLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {transcriptCitations.map((citation, i) => (
              <TranscriptSource key={i} citation={citation} />
            ))}
          </div>
        </div>
      )}

      {webCitations.length > 0 && (
        <div>
          <SectionLabel>Web Sources ({webCitations.length})</SectionLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {webCitations.map((citation, i) => (
              <WebSource key={i} citation={citation} />
            ))}
          </div>
        </div>
      )}

      {profileCitations.length > 0 && (
        <div>
          <SectionLabel>Profiles ({profileCitations.length})</SectionLabel>
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
