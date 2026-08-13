export interface EvidenceContext {
  query: string
  retrievedExcerpts: string[]
}

export function buildEvidencePrompt(ctx: EvidenceContext): string {
  const excerpts = ctx.retrievedExcerpts
    .map((e, i) => `[${i + 1}] ${e}`)
    .join('\n\n')

  return `Evaluate whether the following podcast transcript excerpts are sufficient to answer the user's question.

User question: "${ctx.query}"

Retrieved transcript excerpts:
${excerpts}

Classify the evidence as one of:
- "transcript_supported": The excerpts clearly and directly address the question
- "partially_supported": The excerpts touch on the topic but don't fully answer it, or only partially cover what was asked
- "not_supported": The excerpts are not relevant to the question or the corpus doesn't contain this information

Respond with ONLY valid JSON in this exact format:
{"level": "<one of the three values above>", "reason": "<one sentence explanation>"}`
}
