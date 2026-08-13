/** The chat routing decision */
export type ChatRoute = 'transcript' | 'hybrid' | 'web'

/** Type discriminator for citations */
export type SourceType = 'transcript' | 'web'

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

/** Union of all citation types */
export type Citation = TranscriptCitation | WebCitation
