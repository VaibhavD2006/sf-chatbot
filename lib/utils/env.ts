/** Get a required environment variable — throws if missing */
export function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

/** Get an optional environment variable */
export function optionalEnv(key: string): string | undefined {
  return process.env[key] || undefined
}

/** Get an optional env var with a default value */
export function envWithDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

/** Get an optional numeric env var with a default */
export function envNumber(key: string, defaultValue: number): number {
  const raw = process.env[key]
  if (!raw) return defaultValue
  const parsed = parseInt(raw, 10)
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number, got: ${raw}`)
  }
  return parsed
}

/** Centralized app config — reads env once at module load */
export const config = {
  openaiApiKey: () => requireEnv('OPENAI_API_KEY'),
  databaseUrl: () => requireEnv('DATABASE_URL'),
  tavilyApiKey: () => optionalEnv('TAVILY_API_KEY'),
  embeddingModel: () => envWithDefault('EMBEDDING_MODEL', 'text-embedding-3-small'),
  chatModel: () => envWithDefault('CHAT_MODEL', 'gpt-4o-mini'),
  chunkSize: () => envNumber('CHUNK_SIZE', 600),
  chunkOverlap: () => envNumber('CHUNK_OVERLAP', 80),
  retrieveK: () => envNumber('RETRIEVE_K', 12),
  retainK: () => envNumber('RETAIN_K', 6),
  isDev: () => process.env.NODE_ENV === 'development',
  isDebug: () => process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development',
}
