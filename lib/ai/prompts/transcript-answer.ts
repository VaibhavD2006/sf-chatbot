export interface TranscriptAnswerContext {
  query: string
  transcriptContext: string
}

export function buildTranscriptAnswerPrompt(ctx: TranscriptAnswerContext): string {
  return `Answer the user's question using ONLY the podcast transcript excerpts provided below.

Grounding rules (strictly enforced):
- Only attribute statements to guests when the transcript excerpt directly supports it
- Do not invent or fabricate any quotes, timestamps, episode titles, or guest names
- If the context is incomplete, acknowledge the limitation
- Prefer paraphrasing over direct quotes unless you have the exact transcript text
- Be specific: name the guest and episode when you have that information
- Do not add information from your general knowledge — transcript only

Transcript excerpts:
${ctx.transcriptContext}

User question: ${ctx.query}

Answer:`
}
