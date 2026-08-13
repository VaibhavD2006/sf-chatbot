import { describe, it, expect } from 'vitest'
import { shouldUseAgent, extractPersonName, detectRequestedPlatforms } from '@/lib/agent/should-use-agent'
import type { ChatMessage } from '@/lib/chat/types'

describe('shouldUseAgent', () => {
  it.each([
    "What's his LinkedIn?",
    "Find her Instagram.",
    "Does John have a GitHub?",
    "Can you find his Twitter?",
    "What's her company website?",
    "Can you find where I can follow Sarah online?",
    "Find their public profile",
    "What's his social media?",
  ])('returns true for: %s', (query) => {
    expect(shouldUseAgent(query)).toBe(true)
  })

  it.each([
    "What did John say about pricing?",
    "Summarize the episode.",
    "What did she mean by product-market fit?",
    "Tell me more about customer acquisition.",
    "Who was the guest on the last episode?",
  ])('returns false for: %s', (query) => {
    expect(shouldUseAgent(query)).toBe(false)
  })
})

describe('extractPersonName', () => {
  it('extracts name from possessive form', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: "Can you find Jane Smith's LinkedIn?" }
    ]
    expect(extractPersonName(messages)).toBe('Jane Smith')
  })

  it('extracts name from "find [Name]" pattern', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'find David Chen on LinkedIn' }
    ]
    expect(extractPersonName(messages)).toBe('David Chen')
  })

  it('extracts name from quoted form', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'What is "Sara Blakely" Instagram?' }
    ]
    expect(extractPersonName(messages)).toBe('Sara Blakely')
  })

  it('falls back to assistant message for pronoun-only user messages', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'What did the guest say about hiring?' },
      { role: 'assistant', content: 'Guest: Noah Kagan argued that you should hire slowly...' },
      { role: 'user', content: 'Can you find his LinkedIn?' },
    ]
    expect(extractPersonName(messages)).toBe('Noah Kagan')
  })

  it('returns null when no name found', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: "Can you find their LinkedIn?" }
    ]
    expect(extractPersonName(messages)).toBeNull()
  })
})

describe('detectRequestedPlatforms', () => {
  it('detects LinkedIn', () => {
    expect(detectRequestedPlatforms("find his LinkedIn")).toContain('linkedin')
  })

  it('detects multiple platforms', () => {
    const platforms = detectRequestedPlatforms("find his LinkedIn and Instagram")
    expect(platforms).toContain('linkedin')
    expect(platforms).toContain('instagram')
  })

  it('detects company website', () => {
    const platforms = detectRequestedPlatforms("what is his company website?")
    expect(platforms).toContain('company')
  })

  it('defaults to linkedin when agent triggered but no platform named', () => {
    const platforms = detectRequestedPlatforms("find their public profile")
    expect(platforms).toContain('linkedin')
  })
})
