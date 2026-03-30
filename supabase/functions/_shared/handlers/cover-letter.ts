/**
 * Cover letter generation handler — creates tailored cover letters using Claude Sonnet.
 *
 * Task type: tailor_cover_letter
 * Payload: { application_id: string }
 *
 * Loads the user's master CV and the target job description, then generates
 * a tone-appropriate cover letter. Stores the result as a Document row with
 * content_md for inline editing and PDF export.
 */

import { registerHandler } from '../handler-registry.ts'
import { getSupabaseAdmin } from '../supabase-admin.ts'
import { checkBudget } from '../budget-guard.ts'
import type { TaskRow, TaskResult } from '../task-types.ts'
import Anthropic from 'npm:@anthropic-ai/sdk@0.80'

// ─── Configuration ──────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 4096
// Sonnet 4.5 pricing
// Sonnet 4.5 pricing: per-token (not per-1K)
const INPUT_COST_PER_TOKEN = 0.000003      // $3.00/MTok = $0.000003/token
const OUTPUT_COST_PER_TOKEN = 0.000015     // $15.00/MTok = $0.000015/token
const CACHE_WRITE_COST_PER_TOKEN = 0.00000375  // $3.75/MTok

// ─── Academic ↔ Industry Translation Table ──────────────────────────────────

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

// ─── Tone Descriptors ──────────────────────────────────────────────────────

const TONE_INSTRUCTIONS: Record<string, string> = {
  scholarly: `Tone: Scholarly and collegial. Emphasize research contributions, publications, and academic collaboration. Use the language of academia — "research program," "scholarly contributions," "interdisciplinary." The reader is likely a PI or search committee member who values rigor and intellectual depth.`,
  business_value: `Tone: Results-driven and forward-looking. Emphasize measurable impact, transferable analytical skills, and eagerness to apply research expertise to business challenges. Use industry language where the translation table provides equivalents. The reader is likely a hiring manager who values what you can deliver.`,
  mission_alignment: `Tone: Mission-focused and service-oriented. Emphasize alignment with the agency's environmental or scientific mission. Reference specific programs or mandates when possible. Government readers value dedication to public service and domain expertise over flashy language.`,
  professional: `Tone: Professional and balanced. Blend academic credibility with practical applicability. This is a general-purpose tone for employers that don't fit neatly into academic, private, or government categories.`,
}

// ─── Payload & Job Types ────────────────────────────────────────────────────

interface CoverLetterPayload {
  application_id: string
}

interface JobRow {
  id: string
  title: string
  company: string
  company_domain: string | null
  location: string | null
  url: string | null
  visa_path: string
  employer_type: string
  why_fits: string | null
  skills_required: string[] | null
  raw_description: string | null
}

interface CvData {
  id: string
  structured_data_json: Record<string, unknown> | null
}

// ─── Build System Prompt ────────────────────────────────────────────────────

function getToneKey(employerType: string): string {
  if (['university', 'nonprofit_research', 'cooperative_institute'].includes(employerType)) {
    return 'scholarly'
  }
  if (employerType === 'private_sector') {
    return 'business_value'
  }
  if (['government_direct', 'government_contractor'].includes(employerType)) {
    return 'mission_alignment'
  }
  return 'professional'
}

function buildSystemPrompt(
  cvData: Record<string, unknown> | null,
  toneKey: string,
): string {
  const skills = (cvData?.skills as string[]) ?? []
  const researchAreas = (cvData?.research_areas as string[]) ?? []
  const publications = (cvData?.publications as Array<{ title: string; venue?: string | null }>) ?? []
  const employment = (cvData?.employment_history as Array<{ title: string; organization: string; description?: string }>) ?? []

  const profileSection = `
## Your Background (Master CV Summary)

${cvData?.name ? `Name: ${cvData.name}` : ''}
${cvData?.field ? `Field: ${cvData.field}` : 'Field: Environmental science / Ocean color remote sensing'}
Skills: ${skills.length > 0 ? skills.join(', ') : 'Ocean color remote sensing, satellite imagery processing (SeaDAS), Google Earth Engine, Python, R, MATLAB'}
Research areas: ${researchAreas.length > 0 ? researchAreas.join(', ') : 'Ocean color remote sensing, coastal biogeochemistry, phytoplankton dynamics'}
${publications.length > 0 ? `Key publications:\n${publications.slice(0, 5).map(p => `- ${p.title}${p.venue ? ` (${p.venue})` : ''}`).join('\n')}` : ''}
${employment.length > 0 ? `Recent positions:\n${employment.slice(0, 3).map(e => `- ${e.title} at ${e.organization}`).join('\n')}` : ''}
`.trim()

  const toneInstruction = TONE_INSTRUCTIONS[toneKey] ?? TONE_INSTRUCTIONS.professional

  return `You are a cover letter writer helping an environmental scientist / ocean color remote sensing researcher craft a tailored cover letter for a specific job.

${profileSection}

## Academic ↔ Industry Translation Table
${TRANSLATION_TABLE}

## Instructions

Write a compelling cover letter (300-500 words) that:

1. Opens with a specific, genuine connection to the role or organization (not a generic "I am writing to express my interest").
2. Maps the candidate's academic experience to the job requirements using the translation table where applicable.
3. Highlights 2-3 concrete achievements (publications, projects, tools built) that directly relate to this role.
4. Addresses immigration-friendly framing naturally: for cap-exempt employers, briefly note availability for immediate start; for others, focus on qualifications without drawing attention to visa status.
5. Closes with enthusiasm and a clear next step.

${toneInstruction}

## Critical Constraints

- Only reframe and translate what exists in the Master CV. Do NOT invent qualifications, skills, publications, or experiences.
- If the job requires skills not in the CV, acknowledge the gap honestly (e.g., "While my experience is primarily in X, my work with Y provides a strong foundation for learning Z").
- Do NOT use generic filler phrases like "I am excited to apply" or "I believe I would be a great fit."
- Do NOT include a letterhead, address block, or "Dear Hiring Manager" — start with the opening paragraph. The user will add formatting later.
- Output clean markdown. Use no headers — just flowing paragraphs.

## Writing Style (CRITICAL — avoid AI patterns)

The output must read like a human wrote it, not an AI. Specifically:
- NO em dashes (—). Use commas, periods, or "and" instead.
- NO rule of three lists. Don't force ideas into groups of three.
- NO negative parallelisms ("It's not just X; it's Y"). Just state what it is.
- NO copula avoidance ("serves as", "stands as", "functions as"). Use "is" or "are".
- NO significance inflation ("pivotal", "crucial", "vital role", "testament to", "underscores").
- NO promotional language ("groundbreaking", "vibrant", "showcasing", "renowned").
- NO -ing superficial analysis ("highlighting...", "underscoring...", "reflecting...").
- NO filler ("In order to", "It is important to note", "At its core", "In today's").
- NO generic conclusions ("I look forward to the opportunity to discuss" or similar).
- VARY sentence length. Mix short and long. Not all medium.
- Use "is/are/has" naturally instead of elaborate substitutions.
- Write like a real person who cares about this job, not like a template.`
}

// ─── Build User Message ─────────────────────────────────────────────────────

function buildUserMessage(job: JobRow): string {
  const description = (job.raw_description ?? '').slice(0, 6000)
  const whyFits = job.why_fits ? `\n\nPrevious analysis of why this role fits:\n${job.why_fits}` : ''
  const skillsReq = job.skills_required?.length ? `\n\nRequired skills: ${job.skills_required.join(', ')}` : ''

  return `Write a cover letter for this position:

<job_posting>
Title: ${job.title}
Company: ${job.company}
${job.location ? `Location: ${job.location}` : ''}
Employer type: ${job.employer_type}
Visa path: ${job.visa_path}
${description ? `\nJob description:\n${description}` : '(No detailed description available — write based on the title and company.)'}
</job_posting>${whyFits}${skillsReq}`
}

// ─── Cost Computation ───────────────────────────────────────────────────────

function computeCostCents(usage: Record<string, number>): number {
  const inputTokens = usage.input_tokens ?? 0
  const outputTokens = usage.output_tokens ?? 0
  const cacheCreation = usage.cache_creation_input_tokens ?? 0
  // Cache reads are free for ephemeral caching
  const inputCost = (inputTokens - cacheCreation) * INPUT_COST_PER_TOKEN
  const outputCost = outputTokens * OUTPUT_COST_PER_TOKEN
  const cacheWriteCost = cacheCreation * CACHE_WRITE_COST_PER_TOKEN
  return Math.ceil((inputCost + outputCost + cacheWriteCost) * 100)
}

// ─── Handler ────────────────────────────────────────────────────────────────

async function execute(task: TaskRow): Promise<TaskResult> {
  const payload = task.payload_json as unknown as CoverLetterPayload
  if (!payload?.application_id) {
    return { success: false, error: 'Missing application_id in payload', permanent: true }
  }

  const supabase = getSupabaseAdmin()

  // 1. Fetch application + job
  const { data: appRow, error: appError } = await supabase
    .from('applications')
    .select('id, user_id, jobs(id, title, company, company_domain, location, url, visa_path, employer_type, why_fits, skills_required, raw_description)')
    // raw_description may be NULL for seed jobs — handler works without it
    .eq('id', payload.application_id)
    .eq('user_id', task.user_id)
    .single()

  if (appError || !appRow) {
    return { success: false, error: `Application not found: ${appError?.message ?? 'no data'}`, permanent: true }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job = appRow.jobs as any as JobRow
  if (!job) {
    return { success: false, error: 'Application has no linked job', permanent: true }
  }

  // 2. Fetch master CV (latest approved or pending_review)
  const { data: cvRow } = await supabase
    .from('documents')
    .select('id, structured_data_json')
    .eq('user_id', task.user_id)
    .eq('type', 'cv')
    .eq('is_master', true)
    .in('status', ['pending_review', 'approved'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const cvData = (cvRow as CvData | null)?.structured_data_json ?? null

  // 3. Budget check
  const budget = await checkBudget({ userId: task.user_id, taskType: 'tailor_cover_letter' })
  if (budget.action === 'pause') {
    return { success: false, error: `Budget cap reached: ${budget.reason}`, permanent: false }
  }

  // 4. Build prompts
  const toneKey = getToneKey(job.employer_type)
  const systemPrompt = buildSystemPrompt(cvData, toneKey)
  const userMessage = buildUserMessage(job)

  // 5. Call Claude Sonnet
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const anthropic = new Anthropic({ apiKey })
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [{
      type: 'text' as const,
      text: systemPrompt,
      cache_control: { type: 'ephemeral' as const },
    }],
    messages: [{
      role: 'user' as const,
      content: userMessage,
    }],
  })

  const coverLetterMd = response.content
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n\n')

  if (!coverLetterMd || coverLetterMd.length < 50) {
    return { success: false, error: 'Generated cover letter too short or empty', permanent: false }
  }

  // 6. Determine next version number
  const { data: maxVersionRow } = await supabase
    .from('documents')
    .select('version')
    .eq('user_id', task.user_id)
    .eq('type', 'cover_letter')
    .eq('parent_job_id', job.id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = (maxVersionRow?.version ?? 0) + 1

  // 7. Store as Document
  const { data: docRow, error: docError } = await supabase
    .from('documents')
    .insert({
      user_id: task.user_id,
      type: 'cover_letter',
      parent_job_id: job.id,
      version: nextVersion,
      is_master: false,
      status: 'pending_review',
      content_md: coverLetterMd,
      generation_source: 'ai_generated',
      master_document_id: cvRow?.id ?? null,
    })
    .select('id')
    .single()

  if (docError || !docRow) {
    return { success: false, error: `Failed to store document: ${docError?.message ?? 'unknown'}`, permanent: false }
  }

  // 7. Link document to application
  const { error: linkError } = await supabase
    .from('applications')
    .update({ documents_used: [docRow.id] })
    .eq('id', payload.application_id)

  if (linkError) {
    console.error(`[cover-letter] Failed to link doc to app: ${linkError.message}`)
    // Non-fatal — the document exists, just not linked
  }

  // 8. Log API cost
  const usage = response.usage as Record<string, number>
  const costCents = computeCostCents(usage)

  await supabase.from('api_usage_log').insert({
    user_id: task.user_id,
    model: MODEL,
    input_tokens: usage.input_tokens ?? 0,
    output_tokens: usage.output_tokens ?? 0,
    estimated_cost_cents: costCents,
    task_type: 'tailor_cover_letter',
  })

  return {
    success: true,
    data: {
      document_id: docRow.id,
      tone: toneKey,
      input_tokens: usage.input_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
      cost_cents: costCents,
    },
  }
}

// ─── Register ───────────────────────────────────────────────────────────────

registerHandler({
  taskType: 'tailor_cover_letter',
  execute,
})
