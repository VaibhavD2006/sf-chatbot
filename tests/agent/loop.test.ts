import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runAgentLoop } from '@/lib/agent/loop'
import type { AgentState } from '@/lib/agent/types'

vi.mock('@/lib/search/web-search', () => ({
  searchWeb: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/lib/ai/openai', () => ({
  getOpenAIClient: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'No profiles found.' } }],
        }),
      },
    },
  })),
  MODELS: { chat: () => 'gpt-4o-mini' },
}))

function makeState(overrides: Partial<AgentState> = {}): AgentState {
  return {
    query: 'find his LinkedIn',
    personName: 'Jane Smith',
    steps: [],
    webSearchCount: 0,
    seenUrls: new Set(),
    seenQueries: new Set(),
    ...overrides,
  }
}

describe('runAgentLoop', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns graceful answer with zero citations when no results found', async () => {
    const state = makeState()
    const result = await runAgentLoop(state, ['linkedin'])
    expect(result.citations).toHaveLength(0)
    expect(typeof result.answer).toBe('string')
    expect(result.answer.length).toBeGreaterThan(0)
  })

  it('never exceeds MAX_STEPS (4)', async () => {
    const state = makeState()
    // Run with many platforms — should still respect step limit
    await runAgentLoop(state, ['linkedin', 'instagram', 'twitter', 'github', 'company'])
    expect(state.steps.length).toBeLessThanOrEqual(4)
  })

  it('deduplicates repeated URLs in citations', async () => {
    const { searchWeb } = await import('@/lib/search/web-search')
    vi.mocked(searchWeb).mockResolvedValue([
      { title: 'Jane LinkedIn', url: 'https://linkedin.com/in/janesmith', snippet: 'Jane Smith Founder', domain: 'linkedin.com' },
    ])

    const state = makeState()
    const result = await runAgentLoop(state, ['linkedin'])
    // Even if the same URL appears in multiple steps, citations should be deduped
    const urls = result.citations.map(c => c.url)
    expect(urls.length).toBe(new Set(urls).size)
  })

  it('works with null personName (no name extractable)', async () => {
    const state = makeState({ personName: null })
    const result = await runAgentLoop(state, ['linkedin'])
    expect(result).toHaveProperty('answer')
    expect(result).toHaveProperty('citations')
  })
})
