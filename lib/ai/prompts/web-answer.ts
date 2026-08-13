export interface WebAnswerContext {
  query: string
  webContext: string
  transcriptNote?: string
}

export function buildWebAnswerPrompt(ctx: WebAnswerContext): string {
  const transcriptNote = ctx.transcriptNote
    ? `\nNote: ${ctx.transcriptNote}\n`
    : ''

  return `Answer the user's question using the web search results provided below.
${transcriptNote}
Important: This answer is based on web sources, not the Solo Founders podcast. Make this clear in your response if relevant to the user's intent.

Web search results:
${ctx.webContext}

User question: ${ctx.query}

Answer:`
}
