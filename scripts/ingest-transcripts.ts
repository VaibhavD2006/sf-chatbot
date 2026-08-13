import { readdirSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { parseTranscriptFile } from '@/lib/rag/parser'
import { chunkTranscript } from '@/lib/rag/chunk'
import { embedTexts } from '@/lib/ai/embeddings'
import { upsertChunk, updateChunkEmbedding, countChunks } from '@/lib/db/transcripts'
import { log } from '@/lib/utils/logger'

// Load .env or .env.local for environments outside Next.js runtime
import 'dotenv/config'

const TRANSCRIPT_DIR = join(process.cwd(), 'data', 'transcripts')
const SUPPORTED_EXTENSIONS = new Set(['.json', '.txt', '.md'])
const EMBED_BATCH_SIZE = 50

function parseArgs() {
  const args = process.argv.slice(2)
  return {
    dryRun: args.includes('--dry-run'),
    episodeId: args.find(a => a.startsWith('--episode-id='))?.split('=')[1],
    help: args.includes('--help'),
  }
}

/** Recursively find all transcript files in a directory */
function findTranscriptFiles(dir: string): string[] {
  const files: string[] = []
  if (!existsSync(dir)) return files

  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findTranscriptFiles(fullPath))
    } else if (entry.isFile()) {
      if (SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase()) && entry.name !== '.gitkeep') {
        files.push(fullPath)
      }
    }
  }
  return files
}

async function ingestFile(filepath: string, dryRun: boolean): Promise<{ chunksCreated: number }> {
  console.log(`\nProcessing: ${filepath}`)

  const transcript = parseTranscriptFile(filepath)
  const chunks = chunkTranscript(transcript)

  console.log(`  → ${chunks.length} chunks from ${transcript.segments.length} segments`)
  console.log(`  → Episode: ${transcript.metadata.episodeId ?? 'unknown'}, Guest: ${transcript.metadata.guestName ?? 'unknown'}`)

  if (dryRun) {
    console.log(`  → [DRY RUN] Skipping DB write and embedding`)
    return { chunksCreated: chunks.length }
  }

  // Upsert chunks (without embeddings first)
  for (const chunk of chunks) {
    await upsertChunk(chunk)
  }

  // Generate embeddings in batches
  const texts = chunks.map(c => c.content)
  const allEmbeddings: number[][] = []

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE)
    const batchNum = Math.floor(i / EMBED_BATCH_SIZE) + 1
    const totalBatches = Math.ceil(texts.length / EMBED_BATCH_SIZE)
    process.stdout.write(`  → Embedding batch ${batchNum}/${totalBatches}...`)
    const embeddings = await embedTexts(batch)
    allEmbeddings.push(...embeddings)
    process.stdout.write(' done\n')
  }

  // Update embeddings
  for (let i = 0; i < chunks.length; i++) {
    await updateChunkEmbedding(chunks[i].id, allEmbeddings[i])
  }

  console.log(`  → ${chunks.length} chunks ingested with embeddings`)
  return { chunksCreated: chunks.length }
}

async function main() {
  const { dryRun, episodeId, help } = parseArgs()

  if (help) {
    console.log(`
Solo Founders Transcript Ingestion

Usage:
  npx tsx scripts/ingest-transcripts.ts [options]

Options:
  --dry-run            Parse and chunk but do not write to DB
  --episode-id=EP001   Process only the episode matching this ID
  --help               Show this help

Transcript files should be placed in: data/transcripts/
Supported formats: .json, .txt, .md
Files are discovered recursively from all subdirectories.
`)
    process.exit(0)
  }

  if (!existsSync(TRANSCRIPT_DIR)) {
    console.error(`Transcript directory not found: ${TRANSCRIPT_DIR}`)
    console.error('Create data/transcripts/ and add transcript files.')
    process.exit(1)
  }

  // Recursively find all transcript files
  const allFiles = findTranscriptFiles(TRANSCRIPT_DIR)

  if (allFiles.length === 0) {
    console.log('No transcript files found in data/transcripts/')
    console.log('Add .json, .txt, or .md files and run again.')
    process.exit(0)
  }

  console.log(`Found ${allFiles.length} transcript file(s)`)
  if (dryRun) console.log('[DRY RUN MODE — no DB writes]')
  if (episodeId) console.log(`[Filtering to episode: ${episodeId}]`)

  const startTime = Date.now()
  let totalChunks = 0
  let filesProcessed = 0
  const errors: string[] = []

  for (const filepath of allFiles) {
    try {
      // Filter by episode ID if specified
      if (episodeId) {
        const transcript = parseTranscriptFile(filepath)
        if (transcript.metadata.episodeId !== episodeId) continue
      }

      const { chunksCreated } = await ingestFile(filepath, dryRun)
      totalChunks += chunksCreated
      filesProcessed++
    } catch (err) {
      const message = `Failed to process ${filepath}: ${String(err)}`
      errors.push(message)
      console.error(`  ✗ ${message}`)
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log('\n' + '─'.repeat(50))
  console.log(`Ingestion complete in ${elapsed}s`)
  console.log(`  Files processed: ${filesProcessed}`)
  console.log(`  Total chunks: ${totalChunks}`)

  if (!dryRun) {
    try {
      const dbCount = await countChunks()
      console.log(`  Total chunks in DB: ${dbCount}`)
    } catch {
      // DB may not be available
    }
  }

  if (errors.length > 0) {
    console.log(`\n  Errors (${errors.length}):`)
    errors.forEach(e => console.log(`  - ${e}`))
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
