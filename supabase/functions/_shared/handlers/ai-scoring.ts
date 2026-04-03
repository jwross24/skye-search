/**
 * AI Scoring handler — scores discovered jobs using Claude Haiku.
 *
 * Task type: ai_score_batch
 * Payload: { job_ids: string[] }
 *
 * Processes up to 50 jobs in chunked concurrent calls (5 per chunk, 10 max).
 * Uses prompt caching on the system prompt (profile + translation table + rubric).
 * Computes urgency_score server-side and writes fully-scored jobs to the jobs table.
 */

import { registerHandler } from '../handler-registry.ts'
import { getSupabaseAdmin } from '../supabase-admin.ts'
import { checkBudget } from '../budget-guard.ts'
import { computeUrgencyScore } from '../urgency-scoring.ts'
import { CircuitBreaker, retryWithBackoff, delay } from '../rate-limiter.ts'
import { isNonJobEntry } from '../url-filter.ts'
import { isInternationalLocation } from '../location-filter.ts'
import type { TaskRow, TaskResult } from '../task-types.ts'
import type { VisaPath, CapExemptConfidence, EmployerType, EmploymentType, SourceType, UserState } from '../urgency-scoring.ts'
import Anthropic from 'npm:@anthropic-ai/sdk@0.80'
import { zodOutputFormat } from 'npm:@anthropic-ai/sdk@0.80/helpers/zod'
import { z } from 'npm:zod@4'

// ─── Configuration ──────────────────────────────────────────────────────────

const CHUNK_SIZE = 5
const MAX_CHUNKS = 10
const INTER_CHUNK_DELAY_MS = 2500
const SDK_MAX_RETRIES = 5
const JOB_MAX_RETRIES = 3
const BACKOFF_BASE_429_MS = 2_000
const BACKOFF_BASE_529_MS = 5_000
const MODEL = 'claude-haiku-4-5-20251001'
const MAX_TOKENS = 2048
// Haiku 4.5 pricing
// Haiku 4.5 pricing: per-token (not per-1K)
const INPUT_COST_PER_TOKEN = 0.0000008    // $0.80/MTok = $0.0000008/token
const OUTPUT_COST_PER_TOKEN = 0.000004    // $4.00/MTok = $0.000004/token
const CACHE_WRITE_COST_PER_TOKEN = 0.000001  // $1.00/MTok
const CACHE_READ_COST_PER_TOKEN = 0.00000008  // $0.08/MTok

// ─── Zod Schema for structured output ───────────────────────────────────────

const ScoringOutputSchema = z.object({
  visa_path: z.enum(['cap_exempt', 'cap_subject', 'opt_compatible', 'canada', 'unknown']),
  cap_exempt_confidence: z.enum(['none', 'unverified', 'likely', 'confirmed']),
  employer_type: z.enum([
    'university', 'nonprofit_research', 'cooperative_institute',
    'government_contractor', 'government_direct', 'private_sector', 'unknown',
  ]),
  employment_type: z.enum(['full_time', 'part_time', 'contract', 'unknown']),
  match_score: z.number().min(0).max(1),
  why_fits: z.string(),
  skills_academic_equiv: z.array(z.string()),
  application_deadline: z.string().nullable(),
  hiring_timeline_estimate: z.enum(['immediate', 'weeks', 'months', 'academic_cycle']),
  requires_security_clearance: z.boolean(),
  requires_citizenship: z.boolean(),
  location: z.string().nullable(),
  salary: z.string().nullable(),
  remote_status: z.string().nullable(),
})

type ScoringOutput = z.infer<typeof ScoringOutputSchema>

// ─── Academic ↔ Industry Translation Table ──────────────────────────────────
// TODO(skye-search-si2): Replace with getUserTranslationTable(userId)

const TRANSLATION_TABLE = `
ACADEMIC TERM → INDUSTRY EQUIVALENT
Google Earth Engine (GEE) → cloud-native geospatial analytics platform
SeaDAS → satellite imagery processing (domain-specific tool)
MODIS/VIIRS/PACE → Earth observation satellite sensor suites
Ocean color remote sensing → satellite-based water quality monitoring
Biogeochemistry → environmental chemical analysis / water chemistry
NetCDF/HDF5 → scientific multidimensional data formats (like Parquet/Arrow)
Principal Investigator (PI) → project lead / program manager
R1 institution → major research university
Tenure-track → permanent research/teaching position
Postdoctoral fellow → early-career researcher (1-3 yr contract)
ABD → PhD candidate (all but dissertation)
GIS/ArcGIS → geospatial information systems / location analytics
MATLAB → technical computing (similar to NumPy/SciPy ecosystem)
Phytoplankton dynamics → marine ecosystem primary productivity
Coastal biogeochemistry → nearshore environmental monitoring
Radiative transfer modeling → physics-based light propagation simulation
In-situ validation → ground-truth field measurements
Chlorophyll-a retrieval → water quality parameter extraction from satellite data
ORISE/Zintellect → government research fellowship programs
Cooperative institute → university-government research partnership (cap-exempt H1-B)
`.trim()

// ─── Scoring Rubric ─────────────────────────────────────────────────────────

const SCORING_RUBRIC = `
## Scoring Instructions

### FIRST: Is this an actual job posting?
Before scoring, determine if this is a specific, open job posting for a
defined role. If this is ANY of the following, set match_score = 0.0 and
skip all other scoring:
- A careers landing page ("Why Work at...", "Life at...", "About Us")
- An employer information page (general company/lab description)
- A job board index page (list of many positions, not one specific role)
- A news article, blog post, or research paper
- An expired or closed position
Only proceed with scoring if this is an active posting for ONE specific role.

### Geographic requirement
This candidate requires positions in the United States or Canada only
(visa sponsorship context). If the position is clearly located in Europe,
Asia, Australia, South America, or Africa — set match_score = 0.0.
US territories and remote-friendly US-based positions are acceptable.
"International fieldwork" from a US-based employer is acceptable.
Ambiguous locations: score normally but note the uncertainty in why_fits.

For each job posting, analyze and return structured data:

### visa_path
- cap_exempt: Universities, 501(c)(3) nonprofits, government research labs, cooperative institutes. These employers can sponsor H1-B without annual cap limits.
- cap_subject: Private sector employers subject to the annual H1-B cap (65K + 20K advanced degree).
- opt_compatible: Roles that can be performed under F-1 OPT/STEM OPT without requiring H1-B.
- canada: Canadian employers (Express Entry, LMIA pathways).
- unknown: Cannot determine from the posting.

### cap_exempt_confidence
- confirmed: Posting explicitly states university/nonprofit/government employment, or employer is well-known cap-exempt.
- likely: Strong indicators (e.g., .edu domain, mentions of NIH/NSF/NOAA funding) but not explicit.
- unverified: Some hints but ambiguous (e.g., "research institute" without 501(c)(3) mention).
- none: No indicators of cap-exempt status, or clearly private sector.

### employer_type
Classify based on the actual employer (not the funding source):
- university: Direct university hire
- nonprofit_research: 501(c)(3) research org (e.g., WHOI, Battelle)
- cooperative_institute: Fed-funded university partnership (CIRES, CIRA, JCET)
- government_direct: Federal/state agency direct hire
- government_contractor: Private company contracting for government
- private_sector: Commercial company
- unknown: Cannot determine

### match_score (0.0 to 1.0)
Calibration based on the candidate's profile:
- 0.8-1.0: Strong domain match — core skills directly relevant (remote sensing, oceanography, satellite data)
- 0.5-0.8: Adjacent domain — transferable skills apply (environmental science, geospatial, data science)
- 0.2-0.5: Stretch — some overlap but significant gap (general software engineering, unrelated science)
- 0.0-0.2: Poor match — different field entirely

### why_fits
MUST be actionable. Reference the candidate's specific skills, publications, or experience that map to this role's requirements. Example:
"Your SeaDAS and MODIS experience maps directly to their satellite data pipeline. Emphasize your coastal biogeochemistry work for the water quality monitoring aspects. Cap-exempt via NOAA cooperative institute — no lottery needed."

Do NOT write generic descriptions. Every why_fits must mention at least one specific candidate skill/paper.

### hiring_timeline_estimate
- immediate: "Start ASAP", "available now", postdoc positions with open start dates
- weeks: Standard industry hiring (2-6 weeks), "rolling applications"
- months: Government positions, positions requiring security processing
- academic_cycle: Tenure-track, faculty positions (typically 3-6 month process, fall start)

### requires_security_clearance / requires_citizenship
Set to true if the posting mentions:
- Security clearance: TS, SCI, Secret, Top Secret, "ability to obtain clearance"
- Citizenship: "US citizen only", "US persons", ITAR restriction, "must be a US national"
Note: "work authorization required" does NOT mean citizenship — that just means valid work permit.

### application_deadline
Return the application deadline as an ISO 8601 date string (YYYY-MM-DD format, e.g., "2026-05-15").
If no deadline is stated, return null. If the posting says "open until filled" or "rolling", return null.
Do NOT return natural language dates like "May 15" — only YYYY-MM-DD or null.

### skills_academic_equiv
Map required skills to their academic equivalents using the translation table. If the job says "cloud-native geospatial", map to "Google Earth Engine (GEE)". This helps the candidate recognize roles where their academic experience is relevant even when the terminology differs.
`.trim()

// ─── Discovered Job Row ─────────────────────────────────────────────────────

interface DiscoveredJobRow {
  id: string
  user_id: string
  source: string
  url: string
  title: string
  company: string
  raw_description: string | null
  source_type: string
  indexed_date: string
  structured_deadline: string | null
  structured_location: string | null
  structured_salary: string | null
}

// ─── Build System Prompt ────────────────────────────────────────────────────

async function buildScoringPrompt(
  userId: string,
): Promise<string> {
  const supabase = getSupabaseAdmin()

  // Fetch user profile from latest CV extraction
  const { data: docRow } = await supabase
    .from('documents')
    .select('structured_data_json')
    .eq('user_id', userId)
    .in('status', ['pending_review', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Fetch immigration status
  const { data: immRow } = await supabase
    .from('immigration_status')
    .select('visa_type, opt_expiry, postdoc_end_date, niw_status')
    .eq('user_id', userId)
    .single()

  // Fetch days remaining from immigration clock
  const { data: clockRow } = await supabase
    .from('immigration_clock')
    .select('days_remaining')
    .eq('user_id', userId)
    .maybeSingle()

  // Build profile section from real data
  const profile = docRow?.structured_data_json as Record<string, unknown> | null
  const skills = (profile?.skills as string[]) ?? []
  const researchAreas = (profile?.research_areas as string[]) ?? []
  const publications = (profile?.publications as Array<{ title: string; venue?: string | null }>) ?? []

  const profileSection = `
## Candidate Profile

${profile?.name ? `Name: ${profile.name}` : ''}
${profile?.field ? `Field: ${profile.field}` : 'Field: Environmental science / Ocean color remote sensing'}
Skills: ${skills.length > 0 ? skills.join(', ') : 'Ocean color remote sensing, satellite imagery processing (SeaDAS), Google Earth Engine, MODIS/VIIRS data analysis, coastal biogeochemistry, Python, R, MATLAB, NetCDF/HDF5, radiative transfer modeling'}
Research areas: ${researchAreas.length > 0 ? researchAreas.join(', ') : 'Ocean color remote sensing, coastal biogeochemistry, phytoplankton dynamics, satellite validation'}
${publications.length > 0 ? `Key publications: ${publications.slice(0, 5).map(p => p.title).join('; ')}` : ''}

## Immigration Context

Visa: ${immRow?.visa_type ?? 'F-1 STEM OPT'}
${immRow?.opt_expiry ? `OPT expiry: ${immRow.opt_expiry}` : ''}
${clockRow?.days_remaining != null ? `Unemployment days remaining: ${clockRow.days_remaining} of 150` : ''}
${immRow?.niw_status ? `EB-2 NIW: ${immRow.niw_status}` : ''}
Priority: Cap-exempt employers (universities, nonprofits, government labs) are highest priority because they can sponsor H1-B without annual cap limits. This candidate missed the FY2027 H1-B lottery.
`.trim()

  // Fetch known cap-exempt employers for reference lookup
  const { data: employers } = await supabase
    .from('cap_exempt_employers')
    .select('employer_name, employer_domain, cap_exempt_basis, confidence_level')
    .in('confidence_level', ['confirmed', 'likely'])
    .limit(100)

  const employerSection = employers && employers.length > 0
    ? `## Known Cap-Exempt Employers (reference lookup)
When you encounter these employers, classify as cap_exempt with the noted confidence:
${employers.map(e => `- ${e.employer_name}${e.employer_domain ? ` (${e.employer_domain})` : ''} — ${e.cap_exempt_basis}, ${e.confidence_level}`).join('\n')}`
    : ''

  // Fetch vote dismiss patterns for feedback injection
  const { data: dismissVotes } = await supabase
    .from('votes')
    .select('tags')
    .eq('user_id', userId)
    .eq('decision', 'not_for_me')

  let voteSection = ''
  if (dismissVotes && dismissVotes.length > 0) {
    const tagCounts: Record<string, number> = {}
    for (const vote of dismissVotes) {
      for (const tag of (vote.tags ?? [])) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
      }
    }
    const topPatterns = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    if (topPatterns.length > 0) {
      voteSection = `## User Feedback Patterns
This user frequently dismisses jobs with these characteristics. Reduce match_score for matching patterns:
${topPatterns.map(([tag, count]) => `- ${tag} (dismissed ${count}x)`).join('\n')}`
    }
  }

  return `You are an immigration-aware job scoring system for an international PhD scientist.

${profileSection}

## Academic ↔ Industry Translation Table
${TRANSLATION_TABLE}

${employerSection ? `${employerSection}\n\n` : ''}${voteSection ? `${voteSection}\n\n` : ''}${SCORING_RUBRIC}`
}

// ─── Build User Message ─────────────────────────────────────────────────────

function buildUserMessage(job: DiscoveredJobRow): string {
  const description = (job.raw_description ?? '').slice(0, 6000) // Cap at 6K chars
  return `<job_description source_type="${job.source_type}" title="${escapeXml(job.title)}" company="${escapeXml(job.company)}" url="${escapeXml(job.url)}">\n${description}\n</job_description>`
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// ─── Score One Job ──────────────────────────────────────────────────────────

interface ScoredJob {
  output: ScoringOutput
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
}

async function scoreOneJob(
  anthropic: Anthropic,
  systemPrompt: string,
  job: DiscoveredJobRow,
): Promise<ScoredJob> {
  const message = await anthropic.messages.parse({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{
      type: 'text' as const,
      text: systemPrompt,
      cache_control: { type: 'ephemeral' as const },
    }],
    messages: [{
      role: 'user' as const,
      content: buildUserMessage(job),
    }],
    output_config: {
      format: zodOutputFormat(ScoringOutputSchema),
    },
  }, {
    maxRetries: SDK_MAX_RETRIES,
  })

  if (!message.parsed_output) {
    throw new Error(`Scoring incomplete: stop_reason=${message.stop_reason}, no parsed_output`)
  }

  const usage = message.usage as Record<string, number>
  return {
    output: message.parsed_output,
    inputTokens: usage.input_tokens ?? 0,
    outputTokens: usage.output_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheCreationTokens: usage.cache_creation_input_tokens ?? 0,
  }
}

// ─── Fetch User State for Urgency Scoring ───────────────────────────────────

async function fetchUserState(userId: string): Promise<UserState> {
  const supabase = getSupabaseAdmin()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  const [immResult, clockResult, pendingOfferResult] = await Promise.all([
    supabase
      .from('immigration_status')
      .select('employment_active, postdoc_end_date, opt_expiry, initial_days_used')
      .eq('user_id', userId)
      .single(),
    supabase
      .from('immigration_clock')
      .select('days_remaining')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('applications')
      .select('start_date')
      .eq('user_id', userId)
      .eq('kanban_status', 'offer_accepted')
      .not('start_date', 'is', null)
      .gt('start_date', today)
      .limit(1)
      .maybeSingle(),
  ])

  const imm = immResult.data
  const daysRemaining = clockResult.data?.days_remaining
    ?? (150 - (imm?.initial_days_used ?? 0))

  const optExpiry = imm?.opt_expiry ? new Date(imm.opt_expiry) : null
  const todayDate = new Date(today)
  const inGracePeriod = optExpiry ? optExpiry < todayDate && !imm?.employment_active : false

  return {
    days_remaining: daysRemaining,
    is_employed: imm?.employment_active ?? false,
    offer_accepted_not_started: !!pendingOfferResult.data,
    employment_end_date: imm?.postdoc_end_date ?? null,
    in_grace_period: inGracePeriod,
    today,
  }
}

// ─── Batch Processing Utilities ─────────────────────────────────────────────

interface BatchResult {
  scored: number
  failed: number
  skipped: number
  budgetPaused: boolean
  errors: Array<{ jobId: string; title: string; error: string; retries?: number }>
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheReadTokens: number
  totalCostCents: number
  totalRetries: number
  circuitBreakerTrips: number
}

async function processBatch(
  jobs: DiscoveredJobRow[],
  userId: string,
  userState: UserState,
): Promise<BatchResult> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const anthropic = new Anthropic({ apiKey })
  const supabase = getSupabaseAdmin()
  const systemPrompt = await buildScoringPrompt(userId)

  const cb = new CircuitBreaker({
    threshold: 3,
    cooldownMs: 30_000,
    minConcurrency: 2,
  })

  // Filter out non-job URLs, bad titles, and jobs without descriptions
  const scorable = jobs.filter(j =>
    j.raw_description
    && j.raw_description.length > 50
    && !isNonJobEntry(j.url, j.title)
  )
  const skipped = jobs.length - scorable.length

  const result: BatchResult = {
    scored: 0,
    failed: 0,
    skipped,
    budgetPaused: false,
    errors: [],
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheReadTokens: 0,
    totalCostCents: 0,
    totalRetries: 0,
    circuitBreakerTrips: 0,
  }

  // Mark all skipped jobs as scored to avoid re-processing:
  // - jobs with no/short description (not scorable)
  // - jobs filtered by isNonJobEntry (non-job URLs, bad titles)
  // Both categories will never produce a useful score, so marking them prevents
  // them from being re-queued on every subsequent scoring run.
  const scorableIds = new Set(scorable.map(j => j.id))
  const skippedIds = jobs.filter(j => !scorableIds.has(j.id)).map(j => j.id)
  if (skippedIds.length > 0) {
    await supabase
      .from('discovered_jobs')
      .update({ scored: true })
      .in('id', skippedIds)
  }

  // Company+title dedup: skip jobs that already exist in the jobs table
  // within 30 days. Saves Claude budget and prevents duplicate entries.
  // Single batch query — fetch existing company+title pairs, then check in memory
  // to avoid N+1 per-job queries.
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString()

  const { data: existingJobs } = await supabase
    .from('jobs')
    .select('company, title')
    .eq('user_id', userId)
    .gte('created_at', thirtyDaysAgoStr)
    .not('company', 'is', null)
    .not('title', 'is', null)

  const existingPairs = new Set(
    (existingJobs ?? []).map(j => `${j.company!.toLowerCase()}|${j.title!.toLowerCase()}`)
  )

  const dedupIds: string[] = []
  for (const job of scorable) {
    if (!job.company || !job.title) continue
    const key = `${job.company.toLowerCase()}|${job.title.toLowerCase()}`
    if (existingPairs.has(key)) {
      dedupIds.push(job.id)
    }
  }

  if (dedupIds.length > 0) {
    // Mark as scored so they don't get re-queued
    await supabase
      .from('discovered_jobs')
      .update({ scored: true })
      .in('id', dedupIds)
    result.skipped += dedupIds.length
  }

  const dedupSet = new Set(dedupIds)
  const dedupedScorable = scorable.filter(j => !dedupSet.has(j.id))

  // Dynamic chunking: recompute chunk size each iteration so circuit breaker
  // trips are reflected immediately (not pre-split and then sliced)
  let processed = 0

  for (let chunkIdx = 0; processed < dedupedScorable.length && chunkIdx < MAX_CHUNKS; chunkIdx++) {
    // Adaptive concurrency: drops after circuit breaker trips
    const chunkSize = cb.effectiveConcurrency(CHUNK_SIZE)

    // Budget check per chunk
    let budgetVerdict
    try {
      budgetVerdict = await checkBudget({ userId, taskType: 'ai_score_batch' })
    } catch {
      break // DB error — stop gracefully
    }
    if (budgetVerdict.action === 'pause') {
      result.budgetPaused = true
      break
    }

    const budgetSize = budgetVerdict.action === 'reduce_batch'
      ? Math.min(chunkSize, budgetVerdict.maxBatchSize)
      : chunkSize
    const chunkJobs = dedupedScorable.slice(processed, processed + budgetSize)
    if (chunkJobs.length === 0) break
    processed += chunkJobs.length

    // Process chunk concurrently, each job wrapped in retry logic
    const settled = await Promise.allSettled(
      chunkJobs.map(job =>
        retryWithBackoff(
          () => scoreOneJob(anthropic, systemPrompt, job),
          {
            maxRetries: JOB_MAX_RETRIES,
            backoffBase429Ms: BACKOFF_BASE_429_MS,
            backoffBase529Ms: BACKOFF_BASE_529_MS,
            circuitBreaker: cb,
          },
        ),
      ),
    )

    // Process results
    for (let i = 0; i < settled.length; i++) {
      const job = chunkJobs[i]
      const outcome = settled[i]

      if (outcome.status === 'rejected') {
        result.failed++
        const errMsg = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)
        result.errors.push({ jobId: job.id, title: job.title, error: errMsg })
        continue
      }

      const { value: scored, retries } = outcome.value
      result.totalRetries += retries
      const output = scored.output

      // Safety net: if Claude assigned match_score > 0 but location is clearly international
      if (output.match_score > 0 && isInternationalLocation(output.location)) {
        output.match_score = 0
        output.why_fits = 'Filtered: international location (outside US/Canada)'
      }

      // Skip inserting zero-score jobs — career pages, non-postings, and international
      // jobs that Claude (or the safety net) correctly rejected. Storing them in the
      // jobs table would pollute picks and dedup checks.
      if (output.match_score === 0) {
        await supabase
          .from('discovered_jobs')
          .update({ scored: true })
          .eq('id', job.id)
        result.skipped++
        continue
      }

      // Guard: null out non-ISO-8601 dates to prevent DB cast errors
      const deadline = output.application_deadline
      const safeDeadline = deadline && /^\d{4}-\d{2}-\d{2}$/.test(deadline) ? deadline : null

      // Compute urgency score server-side
      const urgencyResult = computeUrgencyScore({
        visa_path: output.visa_path as VisaPath,
        employer_type: output.employer_type as EmployerType,
        cap_exempt_confidence: output.cap_exempt_confidence as CapExemptConfidence,
        employment_type: output.employment_type as EmploymentType,
        source_type: (job.source_type as SourceType) ?? null,
        location: output.location,
        h1b_sponsor_count: null,
        application_deadline: safeDeadline,
        application_complexity: null,
        indexed_date: job.indexed_date,
        requires_security_clearance: output.requires_security_clearance,
        requires_citizenship: output.requires_citizenship,
      }, userState)

      // Upsert into jobs table (discovered_job_id unique prevents retry duplicates)
      const { error: insertError } = await supabase.from('jobs').upsert({
        user_id: userId,
        source: 'ai_scored',
        url: job.url,
        title: job.title,
        company: job.company,
        visa_path: output.visa_path,
        employer_type: output.employer_type,
        cap_exempt_confidence: output.cap_exempt_confidence,
        employment_type: output.employment_type,
        source_type: job.source_type,
        match_score: output.match_score,
        urgency_score: urgencyResult.urgency_score,
        why_fits: output.why_fits,
        skills_academic_equiv: output.skills_academic_equiv,
        skills_required: [],
        application_deadline: safeDeadline,
        hiring_timeline_estimate: output.hiring_timeline_estimate,
        requires_security_clearance: output.requires_security_clearance,
        requires_citizenship: output.requires_citizenship,
        location: output.location,
        salary: output.salary,
        remote_status: output.remote_status,
        raw_description: job.raw_description,
        discovered_job_id: job.id,
        indexed_date: job.indexed_date,
      }, { onConflict: 'discovered_job_id' })

      if (insertError) {
        result.failed++
        result.errors.push({ jobId: job.id, title: job.title, error: `DB insert: ${insertError.message}` })
        continue
      }

      // Mark discovered_job as scored
      await supabase
        .from('discovered_jobs')
        .update({ scored: true })
        .eq('id', job.id)

      // Log API usage
      const costCents = Math.ceil(
        scored.inputTokens * INPUT_COST_PER_TOKEN
        + scored.outputTokens * OUTPUT_COST_PER_TOKEN
        + scored.cacheCreationTokens * CACHE_WRITE_COST_PER_TOKEN
        + scored.cacheReadTokens * CACHE_READ_COST_PER_TOKEN,
      )
      await supabase.from('api_usage_log').insert({
        user_id: userId,
        model: MODEL,
        input_tokens: scored.inputTokens,
        output_tokens: scored.outputTokens,
        estimated_cost_cents: costCents,
        task_type: 'ai_score_batch',
      })

      result.scored++
      result.totalInputTokens += scored.inputTokens
      result.totalOutputTokens += scored.outputTokens
      result.totalCacheReadTokens += scored.cacheReadTokens
      result.totalCostCents += costCents
    }

    // Inter-chunk delay for prompt cache TTL
    if (processed < dedupedScorable.length) {
      await delay(INTER_CHUNK_DELAY_MS)
    }
  }

  result.circuitBreakerTrips = cb.tripCount
  return result
}

// ─── Handler Registration ───────────────────────────────────────────────────

registerHandler({
  taskType: 'ai_score_batch',
  async execute(task: TaskRow): Promise<TaskResult> {
    const payload = task.payload_json as { job_ids?: string[] } | null
    if (!payload?.job_ids?.length) {
      return { success: false, error: 'Missing job_ids in payload', permanent: true }
    }

    const supabase = getSupabaseAdmin()

    // Fetch discovered jobs (belt-and-suspenders: only unscored)
    const { data: jobs, error: fetchError } = await supabase
      .from('discovered_jobs')
      .select('id, user_id, source, url, title, company, raw_description, source_type, indexed_date, structured_deadline, structured_location, structured_salary')
      .in('id', payload.job_ids)
      .eq('scored', false)

    if (fetchError) {
      return { success: false, error: `Failed to fetch jobs: ${fetchError.message}` }
    }

    if (!jobs || jobs.length === 0) {
      return { success: true, data: { message: 'All jobs already scored or not found', total: 0 } }
    }

    const userId = task.user_id
    const userState = await fetchUserState(userId)

    const batchResult = await processBatch(jobs as DiscoveredJobRow[], userId, userState)

    return {
      success: true,
      data: {
        total: payload.job_ids.length,
        fetched: jobs.length,
        scored: batchResult.scored,
        failed: batchResult.failed,
        skipped: batchResult.skipped,
        budget_paused: batchResult.budgetPaused,
        total_cost_cents: batchResult.totalCostCents,
        cache_read_tokens: batchResult.totalCacheReadTokens,
        total_retries: batchResult.totalRetries,
        circuit_breaker_trips: batchResult.circuitBreakerTrips,
        errors: batchResult.errors.slice(0, 10), // Truncate error list
      },
    }
  },
})
