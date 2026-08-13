import { join } from 'path'
import { readFileSync } from 'fs'

interface EvalCase {
  id: string
  description: string
  query: string
  expectedRoute: 'transcript' | 'hybrid' | 'web'
  expectedEpisode: string | null
  expectedTopics?: string[]
  conversationContext?: Array<{ role: string; content: string }>
  notes?: string
}

interface EvalResult {
  id: string
  description: string
  query: string
  expectedRoute: string
  actualRoute?: string
  routeCorrect?: boolean
  topicsCovered?: number
  latencyMs?: number
  error?: string
  status: 'pass' | 'fail' | 'error' | 'skipped'
}

function loadEvalCases(): EvalCase[] {
  const fixturePath = join(process.cwd(), 'tests', 'fixtures', 'evaluation.json')
  return JSON.parse(readFileSync(fixturePath, 'utf-8'))
}

function checkTopicCoverage(answer: string, topics: string[]): number {
  if (topics.length === 0) return 1
  const lower = answer.toLowerCase()
  const covered = topics.filter(t => lower.includes(t.toLowerCase())).length
  return covered / topics.length
}

async function runEvalCase(evalCase: EvalCase, orchestrate: Function): Promise<EvalResult> {
  const start = Date.now()

  const messages = [
    ...(evalCase.conversationContext ?? []),
    { role: 'user', content: evalCase.query },
  ]

  let fullText = ''
  let route: string | undefined
  let citations: unknown[] = []

  try {
    for await (const event of orchestrate(messages)) {
      if (event.type === 'text') fullText += event.content
      else if (event.type === 'metadata') {
        route = event.route
        citations = event.citations
      }
    }
  } catch (err) {
    return {
      id: evalCase.id,
      description: evalCase.description,
      query: evalCase.query,
      expectedRoute: evalCase.expectedRoute,
      error: String(err),
      status: 'error',
    }
  }

  const latencyMs = Date.now() - start
  const routeCorrect = route === evalCase.expectedRoute
  const topicsCovered = evalCase.expectedTopics
    ? checkTopicCoverage(fullText, evalCase.expectedTopics)
    : undefined

  return {
    id: evalCase.id,
    description: evalCase.description,
    query: evalCase.query,
    expectedRoute: evalCase.expectedRoute,
    actualRoute: route,
    routeCorrect,
    topicsCovered,
    latencyMs,
    status: routeCorrect ? 'pass' : 'fail',
  }
}

function printResults(results: EvalResult[]) {
  const cols = {
    id: 10,
    desc: 42,
    expected: 11,
    actual: 11,
    route: 7,
    topics: 8,
    latency: 9,
  }

  const header = [
    'ID'.padEnd(cols.id),
    'Description'.padEnd(cols.desc),
    'Expected'.padEnd(cols.expected),
    'Actual'.padEnd(cols.actual),
    'Route?'.padEnd(cols.route),
    'Topics'.padEnd(cols.topics),
    'Latency'.padEnd(cols.latency),
  ].join('  ')

  console.log('\n' + '─'.repeat(header.length))
  console.log(header)
  console.log('─'.repeat(header.length))

  for (const r of results) {
    const routeIcon = r.routeCorrect ? '✓' : r.status === 'error' ? '✗' : '✗'
    const topicsStr = r.topicsCovered !== undefined
      ? `${Math.round(r.topicsCovered * 100)}%`
      : 'n/a'
    const latencyStr = r.latencyMs !== undefined ? `${r.latencyMs}ms` : r.error ? 'error' : 'n/a'

    const row = [
      r.id.padEnd(cols.id),
      r.description.slice(0, cols.desc - 1).padEnd(cols.desc),
      (r.expectedRoute ?? '').padEnd(cols.expected),
      (r.actualRoute ?? r.error?.slice(0, 8) ?? '').padEnd(cols.actual),
      routeIcon.padEnd(cols.route),
      topicsStr.padEnd(cols.topics),
      latencyStr.padEnd(cols.latency),
    ].join('  ')

    console.log(row)
  }

  console.log('─'.repeat(header.length))

  const pass = results.filter(r => r.status === 'pass').length
  const fail = results.filter(r => r.status === 'fail').length
  const error = results.filter(r => r.status === 'error').length
  const avgLatency = results
    .filter(r => r.latencyMs !== undefined)
    .reduce((sum, r) => sum + (r.latencyMs ?? 0), 0) / results.length

  console.log(`\nResults: ${pass} pass / ${fail} fail / ${error} error`)
  console.log(`Avg latency: ${Math.round(avgLatency)}ms`)
  console.log('')
}

async function main() {
  console.log('Solo Founders RAG Evaluation\n')
  console.log('Loading evaluation cases...')

  const cases = loadEvalCases()
  console.log(`Loaded ${cases.length} test cases\n`)

  // Dynamic import to avoid issues if DB not available
  let orchestrate: Function
  try {
    const mod = await import('@/lib/chat/orchestrator')
    orchestrate = mod.orchestrate
  } catch (err) {
    console.error('Failed to load orchestrator:', err)
    console.error('Ensure DATABASE_URL and OPENAI_API_KEY are set and DB is migrated.')
    process.exit(1)
  }

  const results: EvalResult[] = []
  for (const evalCase of cases) {
    process.stdout.write(`Running ${evalCase.id}: ${evalCase.description}...`)
    const result = await runEvalCase(evalCase, orchestrate)
    results.push(result)
    console.log(result.status === 'pass' ? ' ✓' : ` ✗ (${result.actualRoute ?? result.error})`)
  }

  printResults(results)

  const allPass = results.every(r => r.status === 'pass')
  process.exit(allPass ? 0 : 1)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
