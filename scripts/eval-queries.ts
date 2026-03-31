#!/usr/bin/env bun
/**
 * Query Evaluation Pipeline — measures discovery quality without full scoring.
 *
 * Usage:
 *   bun run scripts/eval-queries.ts                     # evaluate current queries
 *   bun run scripts/eval-queries.ts --no-cache          # force re-fetch from Exa
 *   bun run scripts/eval-queries.ts --capture-only      # fetch + cache, skip judging
 *   bun run scripts/eval-queries.ts --judge-only        # re-judge cached results (free)
 *
 * Cost: ~$0.50 Exa + ~$0.01 Haiku per run (cached runs: $0.01 Haiku only)
 *
 * Architecture:
 *   CAPTURE → cache results by query hash + date
 *   JUDGE   → Haiku binary classifier (relevant job? match tier?)
 *   MEASURE → precision per query, aggregate stats
 */

import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import Exa from 'exa-js'
import Anthropic from '@anthropic-ai/sdk'

// ─── Config ─────────────────────────────────────────────────────────────────

const CACHE_DIR = resolve(process.cwd(), '.eval-cache')
const NUM_RESULTS = 10
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'

// Import current query config from the adapter
const { ACADEMIC_QUERIES, ACADEMIC_JOB_DOMAINS, INDUSTRY_QUERIES, INDUSTRY_EXCLUDE_DOMAINS, FIND_SIMILAR_SEEDS } = await import('../src/lib/adapters/exa')

// ─── Types ──────────────────────────────────────────────────────────────────

interface CachedResult {
  query: string
  query_type: 'academic' | 'industry' | 'similar'
  fetched_at: string
  results: Array<{
    url: string
    title: string
    text_preview: string // first 200 chars
    published_date: string | null
  }>
}

interface Judgment {
  url: string
  title: string
  relevant: boolean
  match_tier: 'strong' | 'adjacent' | 'stretch' | 'irrelevant'
  reason: string
}

interface QueryMetrics {
  query: string
  query_type: string
  total: number
  relevant: number
  precision: number
  strong: number
  adjacent: number
  stretch: number
  irrelevant: number
}

// ─── CLI Args ───────────────────────────────────────────────────────────────

const args = new Set(process.argv.slice(2))
const noCache = args.has('--no-cache')
const captureOnly = args.has('--capture-only')
const judgeOnly = args.has('--judge-only')

// ─── Cache Helpers ──────────────────────────────────────────────────────────

function queryHash(query: string, type: string): string {
  return createHash('sha256').update(`${type}:${query}`).digest('hex').slice(0, 12)
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function cachePath(query: string, type: string): string {
  return resolve(CACHE_DIR, `${queryHash(query, type)}-${todayStr()}.json`)
}

function getCached(query: string, type: string): CachedResult | null {
  if (noCache) return null
  const path = cachePath(query, type)
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf-8'))
}

function saveCache(result: CachedResult): void {
  mkdirSync(CACHE_DIR, { recursive: true })
  const path = cachePath(result.query, result.query_type)
  writeFileSync(path, JSON.stringify(result, null, 2))
}

// ─── CAPTURE: Fetch from Exa ────────────────────────────────────────────────

async function captureAll(): Promise<CachedResult[]> {
  const exa = new Exa(process.env.EXA_API_KEY!)
  const results: CachedResult[] = []
  let fetched = 0
  let cached = 0

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const startDate = thirtyDaysAgo.toISOString().split('T')[0]

  // Academic queries
  for (const query of ACADEMIC_QUERIES) {
    const existing = getCached(query, 'academic')
    if (existing) { results.push(existing); cached++; continue }

    console.log(`  Fetching: "${query}" (academic)`)
    const response = await exa.searchAndContents(query, {
      text: { maxCharacters: 500 },
      numResults: NUM_RESULTS,
      type: 'neural',
      includeDomains: ACADEMIC_JOB_DOMAINS,
      startPublishedDate: startDate,
    })
    fetched++

    const result: CachedResult = {
      query,
      query_type: 'academic',
      fetched_at: new Date().toISOString(),
      results: response.results.map((r) => ({
        url: r.url,
        title: r.title ?? 'Untitled',
        text_preview: ('text' in r ? String(r.text ?? '') : '').slice(0, 200),
        published_date: r.publishedDate ?? null,
      })),
    }
    saveCache(result)
    results.push(result)
  }

  // Industry queries
  for (const query of INDUSTRY_QUERIES) {
    const existing = getCached(query, 'industry')
    if (existing) { results.push(existing); cached++; continue }

    console.log(`  Fetching: "${query}" (industry)`)
    const response = await exa.searchAndContents(query, {
      text: { maxCharacters: 500 },
      numResults: NUM_RESULTS,
      type: 'neural',
      excludeDomains: INDUSTRY_EXCLUDE_DOMAINS,
      startPublishedDate: startDate,
    })
    fetched++

    const result: CachedResult = {
      query,
      query_type: 'industry',
      fetched_at: new Date().toISOString(),
      results: response.results.map((r) => ({
        url: r.url,
        title: r.title ?? 'Untitled',
        text_preview: ('text' in r ? String(r.text ?? '') : '').slice(0, 200),
        published_date: r.publishedDate ?? null,
      })),
    }
    saveCache(result)
    results.push(result)
  }

  // findSimilar seeds
  for (const seed of FIND_SIMILAR_SEEDS) {
    const existing = getCached(seed.url, 'similar')
    if (existing) { results.push(existing); cached++; continue }

    console.log(`  Fetching similar: ${seed.url}`)
    const response = await exa.findSimilarAndContents(seed.url, {
      text: { maxCharacters: 500 },
      numResults: 5,
    })
    fetched++

    const result: CachedResult = {
      query: seed.url,
      query_type: 'similar',
      fetched_at: new Date().toISOString(),
      results: response.results.map((r) => ({
        url: r.url,
        title: r.title ?? 'Untitled',
        text_preview: ('text' in r ? String(r.text ?? '') : '').slice(0, 200),
        published_date: r.publishedDate ?? null,
      })),
    }
    saveCache(result)
    results.push(result)
  }

  console.log(`\n  Capture: ${fetched} fetched, ${cached} cached`)
  return results
}

// ─── JUDGE: Haiku binary classifier ─────────────────────────────────────────

const JUDGE_PROMPT = `You are evaluating search results for a job discovery system.

The candidate is a Chinese-born PhD environmental scientist specializing in:
- Ocean color remote sensing (SeaDAS, MODIS, VIIRS, PACE)
- Coastal biogeochemistry, phytoplankton dynamics
- Python, R, MATLAB, NetCDF/HDF5, Google Earth Engine
- Needs cap-exempt H1-B sponsorship (universities, nonprofits, government labs)

For each result, classify:
- relevant: true if this is a real job/position posting the candidate could apply to
- match_tier:
  - "strong": Core domain match (remote sensing, oceanography, satellite data, environmental science at university/gov)
  - "adjacent": Transferable skills apply (geospatial, data science, climate, ecology at university/gov)
  - "stretch": Some overlap but significant gap (general software eng, unrelated science)
  - "irrelevant": Not a job posting, wrong field entirely, or clearly ineligible (citizenship required, nursing, police, etc.)
- reason: One sentence explaining the classification

Return JSON array matching input order.`

async function judgeResults(results: CachedResult[]): Promise<Map<string, Judgment[]>> {
  const anthropic = new Anthropic()
  const judgmentMap = new Map<string, Judgment[]>()

  // Batch all results for one Haiku call (cheaper than per-query calls)
  const allItems: Array<{ query: string; url: string; title: string; preview: string }> = []

  for (const cached of results) {
    for (const r of cached.results) {
      allItems.push({
        query: cached.query,
        url: r.url,
        title: r.title,
        preview: r.text_preview,
      })
    }
  }

  // Process in chunks of 30 to stay within token limits
  const CHUNK_SIZE = 30
  const allJudgments: Judgment[] = []

  for (let i = 0; i < allItems.length; i += CHUNK_SIZE) {
    const chunk = allItems.slice(i, i + CHUNK_SIZE)
    const itemList = chunk.map((item, idx) =>
      `[${idx}] Title: "${item.title}" | URL: ${item.url} | Preview: ${item.preview.slice(0, 100)}`
    ).join('\n')

    const response = await anthropic.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 2048,
      system: JUDGE_PROMPT,
      messages: [{
        role: 'user',
        content: `Classify these ${chunk.length} search results:\n\n${itemList}\n\nReturn a JSON array of ${chunk.length} objects with: {relevant, match_tier, reason}`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    try {
      // Extract JSON from response (may be wrapped in markdown fences)
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      const judgments = JSON.parse(jsonMatch?.[0] ?? '[]') as Array<{ relevant: boolean; match_tier: string; reason: string }>

      for (let j = 0; j < chunk.length && j < judgments.length; j++) {
        allJudgments.push({
          url: chunk[j].url,
          title: chunk[j].title,
          relevant: judgments[j].relevant,
          match_tier: judgments[j].match_tier as Judgment['match_tier'],
          reason: judgments[j].reason,
        })
      }
    } catch {
      console.error(`  Warning: failed to parse judgment chunk ${i / CHUNK_SIZE + 1}`)
      for (const item of chunk) {
        allJudgments.push({
          url: item.url,
          title: item.title,
          relevant: false,
          match_tier: 'irrelevant',
          reason: 'Parse error',
        })
      }
    }
  }

  // Group judgments back by query
  let idx = 0
  for (const cached of results) {
    const queryJudgments: Judgment[] = []
    for (let i = 0; i < cached.results.length; i++) {
      if (idx < allJudgments.length) {
        queryJudgments.push(allJudgments[idx])
        idx++
      }
    }
    judgmentMap.set(cached.query, queryJudgments)
  }

  return judgmentMap
}

// ─── MEASURE: Compute precision per query ───────────────────────────────────

function measure(results: CachedResult[], judgments: Map<string, Judgment[]>): QueryMetrics[] {
  const metrics: QueryMetrics[] = []

  for (const cached of results) {
    const j = judgments.get(cached.query) ?? []
    const relevant = j.filter(x => x.relevant).length
    const strong = j.filter(x => x.match_tier === 'strong').length
    const adjacent = j.filter(x => x.match_tier === 'adjacent').length
    const stretch = j.filter(x => x.match_tier === 'stretch').length
    const irrelevant = j.filter(x => x.match_tier === 'irrelevant').length

    metrics.push({
      query: cached.query.length > 45 ? cached.query.slice(0, 42) + '...' : cached.query,
      query_type: cached.query_type,
      total: j.length,
      relevant,
      precision: j.length > 0 ? Math.round((relevant / j.length) * 100) / 100 : 0,
      strong,
      adjacent,
      stretch,
      irrelevant,
    })
  }

  return metrics
}

// ─── REPORT ─────────────────────────────────────────────────────────────────

function report(metrics: QueryMetrics[], judgments: Map<string, Judgment[]>): void {
  console.log('\n═══════════════════════════════════════════════════════════════════════════════')
  console.log('  QUERY EVALUATION REPORT')
  console.log('═══════════════════════════════════════════════════════════════════════════════\n')

  // Per-query table
  console.log('  Query                                         │ Type     │ P@10  │ Strong │ Adj │ Irrel')
  console.log('  ──────────────────────────────────────────────┼──────────┼───────┼────────┼─────┼──────')

  for (const m of metrics.sort((a, b) => b.precision - a.precision)) {
    const q = m.query.padEnd(46)
    const t = m.query_type.padEnd(8)
    const p = String(m.precision).padStart(4)
    const s = String(m.strong).padStart(5)
    const a = String(m.adjacent).padStart(3)
    const i = String(m.irrelevant).padStart(4)
    console.log(`  ${q} │ ${t} │ ${p}  │ ${s}  │ ${a} │ ${i}`)
  }

  // Aggregates
  const totalResults = metrics.reduce((sum, m) => sum + m.total, 0)
  const totalRelevant = metrics.reduce((sum, m) => sum + m.relevant, 0)
  const totalStrong = metrics.reduce((sum, m) => sum + m.strong, 0)
  const avgPrecision = metrics.length > 0
    ? Math.round((metrics.reduce((sum, m) => sum + m.precision, 0) / metrics.length) * 100) / 100
    : 0

  console.log('  ──────────────────────────────────────────────┴──────────┴───────┴────────┴─────┴──────')
  console.log(`\n  Total results: ${totalResults} | Relevant: ${totalRelevant} | Strong: ${totalStrong}`)
  console.log(`  Avg precision: ${avgPrecision} | Queries: ${metrics.length}`)

  // Top strong matches
  const allStrong: Judgment[] = []
  for (const [, js] of judgments) {
    for (const j of js) {
      if (j.match_tier === 'strong') allStrong.push(j)
    }
  }

  if (allStrong.length > 0) {
    console.log(`\n  ── TOP STRONG MATCHES (${allStrong.length}) ──────────────────────────────────────────`)
    for (const j of allStrong.slice(0, 15)) {
      console.log(`  ✓ ${j.title.slice(0, 60)}`)
      console.log(`    ${j.reason}`)
    }
  }

  // Bottom irrelevant examples
  const allIrrelevant: Judgment[] = []
  for (const [, js] of judgments) {
    for (const j of js) {
      if (j.match_tier === 'irrelevant') allIrrelevant.push(j)
    }
  }

  if (allIrrelevant.length > 0) {
    console.log(`\n  ── IRRELEVANT EXAMPLES (${allIrrelevant.length} total, showing 5) ──────────────────────`)
    for (const j of allIrrelevant.slice(0, 5)) {
      console.log(`  ✗ ${j.title.slice(0, 60)}`)
      console.log(`    ${j.reason}`)
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════════════\n')
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍 Query Evaluation Pipeline\n')

  if (!process.env.EXA_API_KEY) {
    console.error('EXA_API_KEY not set. Load .env.local or set it.')
    process.exit(1)
  }
  if (!process.env.ANTHROPIC_API_KEY && !judgeOnly) {
    // Judge needs Anthropic, capture doesn't
  }

  // CAPTURE
  console.log('Phase 1: CAPTURE')
  const results = judgeOnly ? loadAllCached() : await captureAll()

  if (captureOnly) {
    console.log('\n  --capture-only: skipping judge + measure')
    console.log(`  ${results.reduce((sum, r) => sum + r.results.length, 0)} results cached in ${CACHE_DIR}`)
    process.exit(0)
  }

  // JUDGE
  console.log('\nPhase 2: JUDGE (Haiku classifier)')
  const judgments = await judgeResults(results)

  // MEASURE + REPORT
  console.log('\nPhase 3: MEASURE')
  const metrics = measure(results, judgments)
  report(metrics, judgments)
}

function loadAllCached(): CachedResult[] {
  const results: CachedResult[] = []

  for (const query of ACADEMIC_QUERIES) {
    const p = cachePath(query, 'academic')
    if (existsSync(p)) results.push(JSON.parse(readFileSync(p, 'utf-8')))
  }
  for (const query of INDUSTRY_QUERIES) {
    const p = cachePath(query, 'industry')
    if (existsSync(p)) results.push(JSON.parse(readFileSync(p, 'utf-8')))
  }
  for (const seed of FIND_SIMILAR_SEEDS) {
    const p = cachePath(seed.url, 'similar')
    if (existsSync(p)) results.push(JSON.parse(readFileSync(p, 'utf-8')))
  }

  console.log(`  Loaded ${results.length} cached result sets from ${CACHE_DIR}`)
  return results
}

main().catch(console.error)
