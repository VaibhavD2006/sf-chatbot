/** A citation pointing to a podcast transcript passage */
export interface TranscriptCitation {
  type: 'transcript'
  episodeTitle?: string
  guest?: string
  speaker?: string
  timestamp?: string
  excerpt?: string
  sourceUrl?: string
}

/** A citation pointing to a web resource */
export interface WebCitation {
  type: 'web'
  title: string
  url: string
  domain?: string
  snippet?: string
}

export interface ProfileCitation {
  type: 'profile'
  platform: 'linkedin' | 'twitter' | 'instagram' | 'github' | 'website' | 'company' | 'unknown'
  name?: string
  url: string
  confidence: 'high' | 'medium' | 'low'
}

/** Union of all citation types */
export type Citation = TranscriptCitation | WebCitation | ProfileCitation
export type SourceType = 'transcript' | 'web' | 'profile'
export type ChatRoute = 'transcript' | 'hybrid' | 'web' | 'agent' | 'hybrid_agent' | 'research'
