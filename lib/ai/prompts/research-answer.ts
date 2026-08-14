interface ResearchAnswerPromptInput {
  query: string
  transcriptContext: string
  webContext: string
  subQueries: string[]
}

export function buildResearchAnswerPrompt({
  query,
  transcriptContext,
  webContext,
  subQueries,
}: ResearchAnswerPromptInput): string {
  const parts: string[] = []

  parts.push(`You are a research analyst answering a question about startup founding, venture capital, and entrepreneurship.`)
  parts.push(``)
  parts.push(`Question: ${query}`)
  parts.push(``)

  if (transcriptContext) {
    parts.push(`## Podcast Transcript Evidence`)
    parts.push(transcriptContext)
    parts.push(``)
  }

  if (webContext) {
    parts.push(`## Research Sources (from queries: ${subQueries.join(' | ')})`)
    parts.push(webContext)
    parts.push(``)
  }

  parts.push(`## Instructions`)
  parts.push(`Synthesize ALL available evidence into a comprehensive, data-driven answer:`)
  parts.push(`- Lead with the most concrete data points and statistics`)
  parts.push(`- Compare solo founder vs. co-founder data when relevant`)
  parts.push(`- Include specific numbers, percentages, ranges, and benchmarks`)
  parts.push(`- When data from podcast transcripts and external sources agree, note the convergence`)
  parts.push(`- When they differ, present both perspectives`)
  parts.push(`- If the data supports a table or structured comparison, use markdown table format`)
  parts.push(`- Cite which source type each key finding comes from (podcast / industry report / research)`)
  parts.push(`- Be direct and specific — avoid vague generalities`)

  return parts.join('\n')
}
