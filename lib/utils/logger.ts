type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function shouldLog(level: LogLevel): boolean {
  if (process.env.NODE_ENV === 'test') return false
  if (process.env.DEBUG === 'true') return true
  if (process.env.NODE_ENV === 'production') return level === 'error' || level === 'warn'
  return true
}

function format(level: LogLevel, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString()
  const dataStr = data !== undefined ? ' ' + JSON.stringify(data) : ''
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${dataStr}`
}

export const log = {
  debug(message: string, data?: unknown): void {
    if (shouldLog('debug')) console.debug(format('debug', message, data))
  },
  info(message: string, data?: unknown): void {
    if (shouldLog('info')) console.info(format('info', message, data))
  },
  warn(message: string, data?: unknown): void {
    if (shouldLog('warn')) console.warn(format('warn', message, data))
  },
  error(message: string, data?: unknown): void {
    if (shouldLog('error')) console.error(format('error', message, data))
  },
}
