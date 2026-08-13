import type { ProfileCitation } from '@/lib/types/source'

export interface AgentState {
  query: string
  personName: string | null
  steps: ToolResult[]
  webSearchCount: number
  seenUrls: Set<string>
  seenQueries: Set<string>
}

export interface ToolResult {
  tool: string
  args: Record<string, string>
  output: string
  urls: string[]
  error?: string
}

export interface ProfileCandidate {
  platform: 'linkedin' | 'twitter' | 'instagram' | 'github' | 'website' | 'company' | 'unknown'
  url: string
  displayName?: string
  confidence: 'high' | 'medium' | 'low'
  signals: string[]
}

export interface AgentResult {
  answer: string
  citations: ProfileCitation[]
}
