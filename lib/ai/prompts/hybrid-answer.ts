export interface HybridAnswerContext {
  query: string
  transcriptContext: string
  webContext: string
}

export function buildHybridAnswerPrompt(ctx: HybridAnswerContext): string {
  return `Answer the user's question using both the podcast transcript excerpts and web search results provided below.

Important: clearly distinguish between what was said in the podcast versus external information. Do not mix them.

Grounding rules:
- Only attribute podcast quotes/insights to guests when the transcript directly supports it
- Do not fabricate any podcast quotes, timestamps, or guest names
- When using web information, make it clear it comes from external sources, not the podcast
- If transcript and web information conflict, note the discrepancy

Podcast transcript excerpts:
${ctx.transcriptContext}

Web search results:
${ctx.webContext}

User question: ${ctx.query}

Answer (clearly label podcast insights vs. additional web information):`
}
