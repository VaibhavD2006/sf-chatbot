import 'dotenv/config'
import postgres from 'postgres'

const raw = process.env.DATABASE_URL ?? ''
console.log('DATABASE_URL present:', raw.length > 0)
// Mask password for logging
const masked = raw.replace(/:([^@]+)@/, ':***@')
console.log('URL (masked):', masked)

// URL-encode any @ in the password
const fixed = raw.replace(/^(postgresql:\/\/[^:]+):(.+)@([^@]+)$/, (_, prefix, pass, rest) => {
  return `${prefix}:${encodeURIComponent(pass)}@${rest}`
})

const sql = postgres(fixed, { ssl: 'require', connect_timeout: 10 })

async function main() {
  try {
    const result = await sql`SELECT version()`
    console.log('Connected OK:', result[0].version.slice(0, 50))
  } catch (e: any) {
    console.error('Connection error:', e.message)
  } finally {
    await sql.end()
  }
}

main()
