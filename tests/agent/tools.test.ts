import { describe, it, expect, vi, beforeEach } from 'vitest'
import { findPersonProfiles, verifyProfile, searchWebTool } from '@/lib/agent/tools'
import type { AgentState } from '@/lib/agent/types'

// Mock searchWeb to avoid real API calls
vi.mock('@/lib/search/web-search', () => ({
  searchWeb: vi.fn(),
}))

import { searchWeb } from '@/lib/search/web-search'

function makeState(overrides: Partial<AgentState> = {}): AgentState {
  return {
    query: 'test query',
    personName: 'Jane Smith',
    steps: [],
    webSearchCount: 0,
    seenUrls: new Set(),
    seenQueries: new Set(),
    ...overrides,
  }
}

describe('findPersonProfiles URL gatekeeping', () => {
  beforeEach(() => vi.clearAllMocks())

  it('only returns linkedin.com/in/ URLs for linkedin platform', async () => {
    vi.mocked(searchWeb).mockResolvedValue([
      { title: 'Jane on LinkedIn', url: 'https://linkedin.com/in/janesmith', snippet: 'Jane Smith founder', domain: 'linkedin.com' },
      { title: 'Jane Blog', url: 'https://janeblog.com', snippet: 'personal site', domain: 'janeblog.com' },
    ])

    const state = makeState()
    const results = await findPersonProfiles('Jane Smith', ['linkedin'], state)
    expect(results[0].urls).toEqual(['https://linkedin.com/in/janesmith'])
    expect(results[0].urls).not.toContain('https://janeblog.com')
  })

  it('only returns github.com/ URLs for github platform', async () => {
    vi.mocked(searchWeb).mockResolvedValue([
      { title: 'Jane GitHub', url: 'https://github.com/janesmith', snippet: 'engineer', domain: 'github.com' },
      { title: 'Gist result', url: 'https://gist.github.com/janesmith', snippet: 'code snippet', domain: 'gist.github.com' },
    ])

    const state = makeState()
    const results = await findPersonProfiles('Jane Smith', ['github'], state)
    expect(results[0].urls).toContain('https://github.com/janesmith')
  })
})

describe('verifyProfile confidence scoring', () => {
  it('returns high confidence when name and signal both appear in step output', () => {
    const state = makeState({
      steps: [{
        tool: 'find_person_profiles',
        args: {},
        output: 'Jane Smith Founder CEO at Acme Labs [https://linkedin.com/in/janesmith]',
        urls: ['https://linkedin.com/in/janesmith'],
      }],
    })

    const result = verifyProfile('Jane Smith', 'https://linkedin.com/in/janesmith', ['Founder', 'Acme'], state)
    expect(result.confidence).toBe('high')
  })

  it('returns medium confidence when name appears but no signal', () => {
    const state = makeState({
      steps: [{
        tool: 'find_person_profiles',
        args: {},
        output: 'Jane Smith profile [https://linkedin.com/in/janesmith]',
        urls: ['https://linkedin.com/in/janesmith'],
      }],
    })

    const result = verifyProfile('Jane Smith', 'https://linkedin.com/in/janesmith', ['Acme'], state)
    expect(result.confidence).toBe('medium')
  })

  it('returns low confidence when URL not in any step output', () => {
    const state = makeState({ steps: [] })
    const result = verifyProfile('Jane Smith', 'https://linkedin.com/in/unknownperson', ['Acme'], state)
    expect(result.confidence).toBe('low')
  })
})

describe('search limit enforcement', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns limit error after MAX_WEB_SEARCHES exceeded', async () => {
    vi.mocked(searchWeb).mockResolvedValue([])
    const state = makeState({ webSearchCount: 3 })
    const result = await searchWebTool('any query', state)
    expect(result.error).toBe('limit')
    expect(searchWeb).not.toHaveBeenCalled()
  })

  it('deduplicates identical queries', async () => {
    vi.mocked(searchWeb).mockResolvedValue([
      { title: 'Result', url: 'https://example.com', snippet: 'test', domain: 'example.com' },
    ])

    const state = makeState()
    await searchWebTool('jane smith linkedin', state)
    await searchWebTool('Jane Smith LinkedIn', state) // same normalized
    expect(searchWeb).toHaveBeenCalledTimes(1)
  })
})
