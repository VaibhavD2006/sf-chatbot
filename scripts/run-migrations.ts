import 'dotenv/config'
import { readFileSync } from 'fs'
import { join } from 'path'
import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require' })

async function main() {
  const migrations = [
    '001_enable_vector.sql',
    '002_create_transcript_chunks.sql',
  ]

  for (const file of migrations) {
    const query = readFileSync(join(process.cwd(), 'db/migrations', file), 'utf-8')
    console.log(`Running ${file}...`)
    await sql.unsafe(query)
    console.log(`  ✓ done`)
  }

  await sql.end()
  console.log('\nAll migrations complete.')
}

main().catch(err => {
  console.error('Migration failed:', err.message)
  process.exit(1)
})
