import { getOpenAIClient, MODELS } from '@/lib/ai/openai'
import type { AgentState, AgentResult, ProfileCandidate, ToolResult } from './types'
import type { ProfileCitation } from '@/lib/types/source'
import { resolvePerson, findPersonProfiles, findCompany, verifyProfile } from './tools'

const MAX_STEPS = 4

export async function runAgentLoop(
  state: AgentState,
  platforms: ProfileCandidate['platform'][]
): Promise<AgentResult> {
  let stepCount = 0

  // Step 0: resolve person context if name is known
  if (state.personName && stepCount < MAX_STEPS) {
    const result = await resolvePerson(state.personName, '', state)
    state.steps.push(result)
    stepCount++
  }

  // Step 1: find profiles for each social platform requested
  if (stepCount < MAX_STEPS) {
    const socialPlatforms = platforms.filter(p => p !== 'company' && p !== 'website')
    if (socialPlatforms.length > 0 && state.personName) {
      const results = await findPersonProfiles(state.personName, socialPlatforms, state)
      for (const r of results) {
        state.steps.push(r)
        stepCount++
        if (stepCount >= MAX_STEPS) break
      }
    }
  }

  // Step 2: find company/website if requested
  if (stepCount < MAX_STEPS && (platforms.includes('company') || platforms.includes('website'))) {
    const resolveStep = state.steps.find(s => s.tool === 'resolve_person')
    const companyHint = resolveStep ? extractCompanyHint(resolveStep.output) : null
    const companyName = companyHint ?? (state.personName ? `${state.personName} company` : state.query)
    const result = await findCompany(companyName, state.personName, state)
    state.steps.push(result)
    stepCount++
  }

  // Step 3: verify all candidate URLs (in-memory, no API call)
  const allUrls = Array.from(new Set(state.steps.flatMap(s => s.urls)))
  const candidates: ProfileCandidate[] = []

  for (const url of allUrls) {
    if (state.seenUrls.has(url)) continue
    state.seenUrls.add(url)
    const signals = [state.personName ?? '', ...extractSignalsFromSteps(state.steps)].filter(Boolean)
    const candidate = verifyProfile(state.personName ?? '', url, signals, state)
    if (candidate.confidence !== 'low') {
      candidates.push(candidate)
    }
  }

  const answer = await synthesizeAnswer(state.query, state.personName, candidates)

  const citations: ProfileCitation[] = candidates.map(c => ({
    type: 'profile' as const,
    platform: c.platform,
    name: c.displayName,
    url: c.url,
    confidence: c.confidence,
  }))

  return { answer, citations }
}

async function synthesizeAnswer(
  query: string,
  personName: string | null,
  candidates: ProfileCandidate[]
): Promise<string> {
  const client = getOpenAIClient()
  const profileList = candidates.length > 0
    ? candidates.map(c => `- ${c.platform}: ${c.url} (confidence: ${c.confidence})`).join('\n')
    : 'No verified profiles found.'

  const prompt = [
    `User asked: "${query}"`,
    `Person: ${personName ?? 'unknown'}`,
    `Verified profiles found:\n${profileList}`,
    '',
    'Write a 2-3 sentence response. Only mention URLs from the list above.',
    'Never construct or guess URLs. If confidence is medium, note the profile may need verification.',
    'If no profiles were found, say so honestly.',
  ].join('\n')

  try {
    const response = await client.chat.completions.create({
      model: MODELS.chat(),
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.2,
    })
    return response.choices[0]?.message?.content ?? 'I was unable to find verified profiles.'
  } catch {
    if (candidates.length > 0) {
      return `I found ${candidates.length} potential profile(s) for ${personName ?? 'this person'}. Please check the sources below.`
    }
    return `I couldn't find verified public profiles for ${personName ?? 'this person'}.`
  }
}

function extractCompanyHint(text: string): string | null {
  const m = text.match(/\b(?:at|of|for|from)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s*[,.\n]|$)/)
  return m ? m[1].trim() : null
}

function extractSignalsFromSteps(steps: ToolResult[]): string[] {
  const signals: string[] = []
  for (const step of steps) {
    const titleMatch = step.output.match(/\b(?:CEO|CTO|Founder|Co-founder|President|Director)\b/gi)
    if (titleMatch) signals.push(...titleMatch)
  }
  return Array.from(new Set(signals))
}
