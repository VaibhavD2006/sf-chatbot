export interface QueryRewriteContext {
  conversationHistory: string
  latestQuery: string
}

export function buildQueryRewritePrompt(ctx: QueryRewriteContext): string {
  return `You are rewriting a conversational follow-up question into a standalone search query.

The user has been having a conversation about a podcast. Their latest message may use pronouns or references to earlier parts of the conversation.

Conversation so far:
${ctx.conversationHistory}

Latest user message: "${ctx.latestQuery}"

Rewrite the latest message as a complete, standalone question that could be understood without the conversation context. Preserve the user's intent exactly. Output ONLY the rewritten query — no explanation, no quotes, no prefix.`
}
